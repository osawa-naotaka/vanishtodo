import {
    apiVoidSchema,
    type Container,
    type Task,
    type TaskContent,
    tasksSchema,
    type UserSetting,
    type UserSettingContent,
    userSettingSchema,
} from "../../type/types";
import { dayDifference } from "../lib/date";
import type { EventBroker, EvTopicPacketMap, Persistent } from "./Broker";
import type { Network } from "./Network";
import { type LocalStorage, type PersistentContentConfig, touchItem } from "./Persistent";

export const userSettingInitialValue: UserSetting = {
    meta: {
        id: "a6e2b2b4-2314-448d-8af3-0b37d845770e",
        version: 0,
        createdAt: "1980-01-01T00:00:00.000Z",
        updatedAt: "1980-01-01T00:00:00.000Z",
    },
    data: {
        email: "anonymous@lulliecat.com",
        timezone: 9,
        dailyGoals: {
            heavy: 1,
            medium: 2,
            light: 3,
        },
    },
};

export const setting_config: PersistentContentConfig<Container<UserSettingContent>> = {
    name: "user_settings",
    storage_key: "vanish-todo-user-settings",
    api_base: "/setting",
    schema: userSettingSchema,
    initial_value: userSettingInitialValue,
};

export const task_config: PersistentContentConfig<Container<TaskContent>[]> = {
    name: "tasks",
    storage_key: "vanish-todo-tasks",
    api_base: "/tasks",
    schema: tasksSchema,
    initial_value: [],
};

export function buildBusinessEventsDuringLogin([pub, sub]: EventBroker<EvTopicPacketMap>, network: Network): (() => void)[] {
    const events_during_logiin: Array<() => void> = [];

    events_during_logiin.push(
        sub("create-task-on-db", async (packet) => {
            const result = await network.postJson(task_config.api_base, packet.task, apiVoidSchema);
            if (result.status !== "success") {
                pub("notify-error", { error_info: result.error_info });
            }
        }),
    );

    events_during_logiin.push(
        sub("update-task-on-db", async (packet) => {
            const result = await network.putJson(`${task_config.api_base}/${packet.task.meta.id}`, packet.task);
            if (result.status !== "success") {
                pub("notify-error", { error_info: result.error_info });
            }
        }),
    );

    events_during_logiin.push(
        sub("update-user-settings-on-db", async (packet) => {
            const result = await network.putJson(`${setting_config.api_base}/${packet.setting.meta.id}`, packet.setting);
            if (result.status !== "success") {
                pub("notify-error", { error_info: result.error_info });
            }
        }),
    );

    return events_during_logiin;
}

export function buildBusinessEvents(
    broker: React.RefObject<EventBroker<EvTopicPacketMap>>,
    per_tasks: Persistent<TaskContent>,
    ls_settings: LocalStorage<UserSetting>,
    network: Network,
): void {
    const [pub, sub] = broker.current;

    // Settings.tsx
    sub("edit-user-setting", (packet) => {
        const updated = touchItem(packet.userSetting);
        ls_settings.item = updated;
        pub("update-user-settings-state", { setting: updated });
        pub("update-user-settings-on-db", { setting: updated });
    });

    // Home.tsx
    function editTask(updateFn: (item: Task) => Task): (packet: { task: Task }) => void {
        return (packet) => {
            const item = touchItem(packet.task);
            const updated = updateFn(item);
            const r = per_tasks.update(updated);
            if (r.status !== "success") {
                pub("notify-error", { error_info: r.error_info });
            } else {
                pub("update-tasks-state", { tasks: per_tasks.items });
                pub("update-task-on-db", { task: updated });
            }
        };
    }

    sub(
        "edit-task",
        editTask((item) => item),
    );

    sub(
        "complete-task",
        editTask((item) => {
            item.data.completedAt = item.meta.updatedAt;
            return item;
        }),
    );

    // All.tsx, Completed.tsx
    sub(
        "uncomplete-task",
        editTask((item) => {
            item.data.completedAt = undefined;
            return item;
        }),
    );

    sub(
        "delete-task",
        editTask((item) => {
            item.data.isDeleted = true;
            return item;
        }),
    );

    // Deleted.tsx
    sub(
        "undelete-task",
        editTask((item) => {
            item.data.isDeleted = false;
            return item;
        }),
    );

    // Login.tsx
    sub("request-login", async (packet) => {
        const result = await network.postJson("/login", { email: packet.email }, apiVoidSchema);
        if (result.status !== "success") {
            pub("notify-error", { error_info: result.error_info });
        }
    });

    // LoginAuth.tsx
    sub("auth-success", async (packet) => {
        // sync setting from db
        const res_setting = await network.getJson(`${setting_config.api_base}/${packet.user_id}`, userSettingSchema);
        console.log("res_setting", res_setting);
        if (res_setting.status === "success") {
            ls_settings.item = res_setting.data;
            pub("update-user-settings-state", { setting: res_setting.data });
        } else {
            pub("notify-error", { error_info: res_setting.error_info });
        }

        // sync tasks from db
        const res_tasks = await network.getJson(task_config.api_base, tasksSchema);
        console.log("res_tasks", res_tasks);
        if (res_tasks.status === "success") {
            per_tasks.items = res_tasks.data;
            pub("update-tasks-state", { tasks: res_tasks.data });
        } else {
            pub("notify-error", { error_info: res_tasks.error_info });
        }
    });
}

type LimitOptions = {
    heavy: number;
    medium: number;
    light: number;
};

export function generateLimitter<T>(ext: (t: T) => Task) {
    function tasksToday(today: string, opt: LimitOptions, tasks: T[]): T[] {
        const pre = process(sortByCreatedDate("asc")(tasks), or(isIncomplete, isCompleteToday(today)));
        const limited = limit(opt)(pre);
        return process(sortByCreatedDate("asc")(limited), isIncomplete);
    }

    function limit(opt: LimitOptions): (tasks: T[]) => T[] {
        return (tasks: T[]) => {
            const heavy_tasks = tasks.filter((task) => ext(task).data.weight === "heavy").slice(0, opt.heavy);
            const medium_tasks = tasks.filter((task) => ext(task).data.weight === "medium").slice(0, opt.medium);
            const light_tasks = tasks.filter((task) => ext(task).data.weight === "light").slice(0, opt.light);
            const due_date_tasks = tasks.filter((task) => ext(task).data.weight === undefined);
            return [...heavy_tasks, ...medium_tasks, ...light_tasks, ...due_date_tasks];
        };
    }

    function sortByUpdatedDate(opt: "asc" | "desc"): (tasks: T[]) => T[] {
        return (tasks: T[]) => {
            return tasks.sort((a, b) => {
                const da = new Date(ext(a).meta.updatedAt);
                const db = new Date(ext(b).meta.updatedAt);
                if (opt === "asc") {
                    return db.getTime() - da.getTime();
                } else {
                    return da.getTime() - db.getTime();
                }
            });
        };
    }

    function sortByCreatedDate(opt: "asc" | "desc"): (tasks: T[]) => T[] {
        return (tasks: T[]) => {
            return tasks.sort((a, b) => {
                const da = new Date(ext(a).meta.createdAt);
                const db = new Date(ext(b).meta.createdAt);
                if (opt === "asc") {
                    return db.getTime() - da.getTime();
                } else {
                    return da.getTime() - db.getTime();
                }
            });
        };
    }

    function or(...fns: ((task: T) => boolean)[]): (task: T) => boolean {
        return (task: T) => {
            for (const fn of fns) {
                if (fn(task)) {
                    return true;
                }
            }
            return false;
        };
    }

    function process(tasks: T[], ...fns: ((task: T) => boolean)[]): T[] {
        if (fns.length === 0) {
            return tasks;
        }

        return process(tasks.filter(fns[0]), ...fns.slice(1));
    }

    function hasDueDate(task: T): boolean {
        return ext(task).data.weight === undefined;
    }

    function hasWeight(task: T): boolean {
        return ext(task).data.weight !== undefined;
    }

    function isIncomplete(task: T): boolean {
        return ext(task).data.completedAt === undefined && ext(task).data.isDeleted === false;
    }

    function isCompleteToday(current_date: string): (task: T) => boolean {
        return (task: T) => {
            const completedAt = ext(task).data.completedAt;
            return completedAt !== undefined && dayDifference(current_date, completedAt) === 0;
        };
    }

    function isDeleted(task: T): boolean {
        return ext(task).data.isDeleted;
    }

    function isCompleted(task: T): boolean {
        return ext(task).data.completedAt !== undefined && ext(task).data.isDeleted === false;
    }

    return { tasksToday, isDeleted, isCompleted };
}
