import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { ApiErrorInfo, ApiVoid, Container, Result, Task, TaskContent, TaskCreate, UserSetting, UserSettingContent } from "../../type/types";
import { apiAuthSuccessSchema, apiVoidSchema, tasksSchema, userSettingsSchema } from "../../type/types";
import { Network } from "./Network";
import type { PersistentContentConfig } from "./Persistent";
import { generateItem, LocalStorage, touchItem } from "./Persistent";

// -----------------------------------------------------------------------------
// イベント型
// -----------------------------------------------------------------------------

export type EvTopicLabel = keyof EvTopicPacketMap;

export type EvNoArgPacket = Record<string, never>;

export type EvTopicPacketMap = {
    "create-task": { task: TaskCreate };
    "read-tasks-from-local-storage": EvNoArgPacket;
    "read-user-settings-from-local-storage": EvNoArgPacket;
    "edit-task": { task: Task };
    "edit-user-setting": { userSetting: UserSetting };
    "complete-task": { task: Task };
    "uncomplete-task": { task: Task };
    "delete-task": { task: Task };
    "undelete-task": { task: Task };
    "update-tasks-state": { tasks: Task[] };
    "create-task-on-db": { task: Task };
    "update-task-on-db": { task: Task };
    "notify-error": { error_info: ApiErrorInfo };
    "sync-tasks-from-db": EvNoArgPacket;
    "update-user-settings-state": { settings: UserSetting[] };
    "request-login": { email: string; }
    "auth-token": { token: string };
    "auth-success": EvNoArgPacket;
};

// -----------------------------------------------------------------------------
// イベントブローカー
// -----------------------------------------------------------------------------

export type OnEventListener<T> = (broker: EventBroker, packet: T) => void | Promise<void>;

export class EventBroker {
    private listeners: { [key in EvTopicLabel]?: OnEventListener<EvTopicPacketMap[key]>[] } = {};

    subscribe<T extends EvTopicLabel>(topic: T, listener: OnEventListener<EvTopicPacketMap[T]>): void {
        if (!this.listeners[topic]) {
            this.listeners[topic] = [];
        }
        this.listeners[topic]?.push(listener);
    }

    publish<T extends EvTopicLabel>(topic: T, packet: EvTopicPacketMap[T]): void {
        console.log(`EventBroker: publish topic="${topic}" packet=`, packet);
        const topic_listeners = this.listeners[topic];
        if (topic_listeners) {
            for (const listener of topic_listeners) {
                listener(this, packet);
            }
        }
    }
}

// -----------------------------------------------------------------------------
// 永続化層（簡易版）
// -----------------------------------------------------------------------------
export class Persistent<T> {
    private readonly m_storage: LocalStorage<Container<T>[]>;

    get items(): Container<T>[] {
        return this.m_storage.item;
    }

    set items(items: Container<T>[]) {
        this.m_storage.item = items;
    }

    constructor(config: PersistentContentConfig<Container<T>[]>) {
        this.m_storage = new LocalStorage<Container<T>[]>(config);
    }

    create(item: Container<T>): void {
        const arr = this.m_storage.item;
        arr.push(item);
        this.m_storage.item = arr;
    }

    update(item: Container<T>): Result<ApiVoid> {
        const arr = this.m_storage.item;
        const idx = arr.findIndex((x) => x.meta.id === item.meta.id);
        if (idx < 0) {
            return {
                status: "fatal",
                error_info: {
                    code: "INTERNAL_ERROR",
                    message: `更新時にIDが見つかりません`,
                },
            };
        }
        arr[idx] = item;
        this.m_storage.item = arr;
        return { status: "success", data: { type: "void" } };
    }
}

// -----------------------------------------------------------------------------
// コンテキストプロバイダー
// -----------------------------------------------------------------------------

export type ContextType = {
    broker: EventBroker;
    tasks: SelectableTask[];
    userSetting: UserSetting;
    updateIsSelected: (task: SelectableTask, isSelected: boolean) => void;
};

export type SelectableTask = {
    task: Task;
    isSelected: boolean;
};

export const BrokerContext = createContext<ContextType | null>(null);

const userSettingsInitialValue: UserSetting = {
    meta: {
        id: "a6e2b2b4-2314-448d-8af3-0b37d845770e",
        version: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

export function BrokerContextProvider({ children }: { children: ReactNode }): ReactNode {
    const [tasks, setTasks] = useState<SelectableTask[]>([]);
    const [userSetting, setUserSetting] = useState<UserSetting>(userSettingsInitialValue);
    const broker = new EventBroker();
    const network = new Network("/api/v1");
    let is_login = false;

    const task_config = {
        name: "tasks",
        storage_key: "vanish-todo-tasks",
        api_base: "/tasks",
        schema: tasksSchema,
        initial_value: [],
    };
    const per_tasks = new Persistent<TaskContent>(task_config);

    const setting_config: PersistentContentConfig<Container<UserSettingContent>[]> = {
        name: "user_settings",
        storage_key: "vanish-todo-user-settings",
        api_base: "/setting",
        schema: userSettingsSchema,
        initial_value: [userSettingsInitialValue],
    };
    const per_settings = new Persistent<UserSettingContent>(setting_config);

    broker.subscribe("create-task", (broker, packet) => {
        const c: TaskContent = {
            ...packet.task,
            completedAt: undefined,
            isDeleted: false,
            userId: "b549d9cf-562d-4a32-b46e-3b0cf79ce13f",
        };
        const item = generateItem(c);
        per_tasks.create(item);

        broker.publish("update-tasks-state", { tasks: per_tasks.items });
        broker.publish("create-task-on-db", { task: item });
    });

    broker.subscribe("read-tasks-from-local-storage", (broker) => {
        broker.publish("update-tasks-state", { tasks: per_tasks.items });
    });

    broker.subscribe("read-user-settings-from-local-storage", (broker) => {
        broker.publish("update-user-settings-state", { settings: per_settings.items });
    });

    broker.subscribe("edit-user-setting", (broker, packet) => {
        const updated = touchItem(packet.userSetting);
        const r = per_settings.update(updated);
        if (r.status !== "success") {
            broker.publish("notify-error", { error_info: r.error_info });
        } else {
            broker.publish("update-user-settings-state", { settings: per_settings.items });
        }
    });

    function editTask(updateFn: (item: Task) => Task): (broker: EventBroker, packet: { task: Task }) => void {
        return (broker, packet) => {
            const item = touchItem(packet.task);
            const updated = updateFn(item);
            const r = per_tasks.update(updated);
            if (r.status !== "success") {
                broker.publish("notify-error", { error_info: r.error_info });
            } else {
                broker.publish("update-tasks-state", { tasks: per_tasks.items });
                broker.publish("update-task-on-db", { task: updated });
            }
        };
    }

    broker.subscribe(
        "edit-task",
        editTask((item) => item),
    );

    broker.subscribe(
        "complete-task",
        editTask((item) => {
            item.data.completedAt = item.meta.updatedAt;
            return item;
        }),
    );

    broker.subscribe(
        "uncomplete-task",
        editTask((item) => {
            item.data.completedAt = undefined;
            return item;
        }),
    );

    broker.subscribe(
        "delete-task",
        editTask((item) => {
            item.data.isDeleted = true;
            return item;
        }),
    );

    broker.subscribe(
        "undelete-task",
        editTask((item) => {
            item.data.isDeleted = false;
            return item;
        }),
    );

    broker.subscribe("update-tasks-state", (_broker, packet) => {
        setTasks(packet.tasks.map((t) => ({ task: t, isSelected: false })));
    });

    broker.subscribe("update-user-settings-state", (_broker, packet) => {
        if (packet.settings.length === 1) {
            setUserSetting(packet.settings[0]);
        } else {
            broker.publish("notify-error", {
                error_info: {
                    code: "INTERNAL_ERROR",
                    message: `ユーザー設定が存在しないか、複数存在します。標準値を使います。`,
                },
            });
            setUserSetting(userSettingsInitialValue);
        }
    });

    broker.subscribe("create-task-on-db", async (broker, packet) => {
        if (!is_login) {
            return;
        }
        const result = await network.postJson(task_config.api_base, packet.task, apiVoidSchema);
        if (result.status !== "success") {
            broker.publish("notify-error", { error_info: result.error_info });
        }
    });

    broker.subscribe("update-task-on-db", async (broker, packet) => {
        if (!is_login) {
            return;
        }
        const result = await network.putJson(`${task_config.api_base}/${packet.task.meta.id}`, packet.task);
        if (result.status !== "success") {
            broker.publish("notify-error", { error_info: result.error_info });
        }
    });

    broker.subscribe("sync-tasks-from-db", async (broker) => {
        if (!is_login) {
            return;
        }
        const result = await network.getJson(task_config.api_base, tasksSchema);
        if (result.status === "success") {
            per_tasks.items = result.data;
            broker.publish("update-tasks-state", { tasks: result.data });
        } else {
            broker.publish("notify-error", { error_info: result.error_info });
        }
    });

    broker.subscribe("notify-error", (_broker, packet) => {
        console.error(packet.error_info);
    });

    broker.subscribe("request-login", async (broker, packet) => {
        if (is_login) {
            broker.publish("notify-error", {
                error_info: {
                    code: "INTERNAL_ERROR",
                    message: `すでにログインしています。`,
                },
            });
            return;
        }

        const result = await network.postJson("/login", { email: packet.email }, apiVoidSchema);
        if (result.status !== "success") {
            broker.publish("notify-error", { error_info: result.error_info });
        }
    });

    broker.subscribe("auth-token", async (broker, packet) => {
        if (is_login) {
            broker.publish("notify-error", {
                error_info: {
                    code: "INTERNAL_ERROR",
                    message: `すでにログインしています。`,
                },
            });
            return;
        }

        const result = await network.postJson("/auth", { token: packet.token }, apiAuthSuccessSchema);
        if (result.status === "success") {
            is_login = true;
            broker.publish("auth-success", {});
        } else {
            is_login = false;
            broker.publish("notify-error", { error_info: result.error_info });
        }
    });

    broker.subscribe("auth-success", (broker) => {
        broker.publish("sync-tasks-from-db", {});
    });

    function updateIsSelected(task: SelectableTask, isSelected: boolean): void {
        setTasks((prevTasks) => prevTasks.map((t) => (t.task.meta.id === task.task.meta.id ? { ...t, isSelected } : t)));
    }

    useEffect(() => {
        broker.publish("read-user-settings-from-local-storage", {});
        broker.publish("read-tasks-from-local-storage", {});
        broker.publish("sync-tasks-from-db", {});
    }, []);

    return <BrokerContext.Provider value={{ broker, tasks, userSetting, updateIsSelected }}>{children}</BrokerContext.Provider>;
}

export function useBroker(): ContextType {
    const context = useContext(BrokerContext);
    if (!context) {
        throw new Error("vanishtodo internal error: ContextProviderが見つかりません。");
    }
    return context;
}
