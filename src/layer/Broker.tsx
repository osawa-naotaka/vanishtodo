import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ApiErrorInfo, ApiVoid, Container, Result, Task, TaskContent, TaskCreate, UserSetting, UserSettingContent } from "../../type/types";
import { apiAuthSuccessSchema, apiVoidSchema, tasksSchema, userSettingSchema } from "../../type/types";
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
    "update-user-settings-on-db": { setting: UserSetting };
    "notify-error": { error_info: ApiErrorInfo };
    "sync-tasks-from-db": EvNoArgPacket;
    "sync-settings-from-db": { user_id: string };
    "update-user-settings-state": { setting: UserSetting };
    "request-login": { email: string };
    "auth-token": { token: string };
    "auth-success": { user_id: string };
};

// -----------------------------------------------------------------------------
// イベントブローカー
// -----------------------------------------------------------------------------

// export type OnEventListener<E, T extends keyof E> = (packet: E[T]) => void | Promise<void>;

export type EventBroker<E> = [
    <T extends keyof E>(topic: T, packet: E[T]) => void,
    <T extends keyof E>(topic: T, listener: (packet: E[T]) => void | Promise<void>) => () => void,
];

export function createEventBroker<E>(): EventBroker<E> {
    type OnEventListener<T extends keyof E> = (packet: E[T]) => void | Promise<void>;

    const listeners: { [key in keyof E]?: Set<OnEventListener<key>> } = {};

    function subscribe<T extends keyof E>(topic: T, listener: OnEventListener<T>) {
        if (!listeners[topic]) {
            listeners[topic] = new Set();
        }
        listeners[topic].add(listener);

        return () => {
            listeners[topic]?.delete(listener);
        };
    }

    function publish<T extends keyof E>(topic: T, packet: E[T]): void {
        console.log(`EventBroker: publish topic="${topic.toString()}" packet=`, packet);
        const topic_listeners = listeners[topic];
        if (topic_listeners) {
            for (const listener of topic_listeners) {
                listener(packet);
            }
        }
    }

    return [publish, subscribe] as const;
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
    broker: EventBroker<EvTopicPacketMap>;
    tasks: SelectableTask[];
    userSetting: UserSetting;
    updateIsSelected: (task: SelectableTask, isSelected: boolean) => void;
};

export type SelectableTask = {
    task: Task;
    isSelected: boolean;
};

export const BrokerContext = createContext<ContextType | null>(null);

const userSettingInitialValue: UserSetting = {
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

export function BrokerContextProvider({ children }: { children: ReactNode }): ReactNode {
    console.log("BrokerContextProvider: render");
    const [tasks, setTasks] = useState<SelectableTask[]>([]);
    const [userSetting, setUserSetting] = useState<UserSetting>(userSettingInitialValue);
    const broker = createEventBroker<EvTopicPacketMap>();
    const [pub, sub] = broker;
    const network = new Network("/api/v1");
    const is_login = useRef(false);

    const task_config = {
        name: "tasks",
        storage_key: "vanish-todo-tasks",
        api_base: "/tasks",
        schema: tasksSchema,
        initial_value: [],
    };
    const per_tasks = new Persistent<TaskContent>(task_config);

    const setting_config: PersistentContentConfig<Container<UserSettingContent>> = {
        name: "user_settings",
        storage_key: "vanish-todo-user-settings",
        api_base: "/setting",
        schema: userSettingSchema,
        initial_value: userSettingInitialValue,
    };
    const ls_settings = new LocalStorage<UserSetting>(setting_config);

    sub("create-task", (packet) => {
        const c: TaskContent = {
            ...packet.task,
            completedAt: undefined,
            isDeleted: false,
            userId: userSetting.meta.id,
        };
        const item = generateItem(c);
        per_tasks.create(item);

        pub("update-tasks-state", { tasks: per_tasks.items });
        pub("create-task-on-db", { task: item });
    });

    sub("read-tasks-from-local-storage", () => {
        pub("update-tasks-state", { tasks: per_tasks.items });
    });

    sub("read-user-settings-from-local-storage", () => {
        pub("update-user-settings-state", { setting: ls_settings.item });
    });

    sub("edit-user-setting", (packet) => {
        const updated = touchItem(packet.userSetting);
        ls_settings.item = updated;
        pub("update-user-settings-state", { setting: updated });
        pub("update-user-settings-on-db", { setting: updated });
    });

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

    sub(
        "undelete-task",
        editTask((item) => {
            item.data.isDeleted = false;
            return item;
        }),
    );

    sub("update-tasks-state", (packet) => {
        setTasks(packet.tasks.map((t) => ({ task: t, isSelected: false })));
    });

    sub("update-user-settings-state", (packet) => {
        setUserSetting(packet.setting);
    });

    sub("create-task-on-db", async (packet) => {
        if (!is_login.current) {
            return;
        }
        const result = await network.postJson(task_config.api_base, packet.task, apiVoidSchema);
        if (result.status !== "success") {
            pub("notify-error", { error_info: result.error_info });
        }
    });

    sub("update-task-on-db", async (packet) => {
        if (!is_login.current) {
            return;
        }
        const result = await network.putJson(`${task_config.api_base}/${packet.task.meta.id}`, packet.task);
        if (result.status !== "success") {
            pub("notify-error", { error_info: result.error_info });
        }
    });

    sub("sync-tasks-from-db", async () => {
        if (!is_login.current) {
            return;
        }
        const result = await network.getJson(task_config.api_base, tasksSchema);
        if (result.status === "success") {
            per_tasks.items = result.data;
            pub("update-tasks-state", { tasks: result.data });
        } else {
            pub("notify-error", { error_info: result.error_info });
        }
    });

    sub("update-user-settings-on-db", async (packet) => {
        if (!is_login.current) {
            return;
        }
        const result = await network.putJson(`${setting_config.api_base}/${packet.setting.meta.id}`, packet.setting);
        if (result.status !== "success") {
            pub("notify-error", { error_info: result.error_info });
        }
    });

    sub("sync-settings-from-db", async (packet) => {
        if (!is_login.current) {
            return;
        }
        const result = await network.getJson(`${setting_config.api_base}/${packet.user_id}`, userSettingSchema);
        if (result.status === "success") {
            ls_settings.item = result.data;
            pub("update-user-settings-state", { setting: result.data });
        } else {
            pub("notify-error", { error_info: result.error_info });
        }
    });

    sub("notify-error", (packet) => {
        console.error(packet.error_info);
    });

    sub("request-login", async (packet) => {
        if (is_login.current) {
            pub("notify-error", {
                error_info: {
                    code: "INTERNAL_ERROR",
                    message: `すでにログインしています。`,
                },
            });
            return;
        }

        const result = await network.postJson("/login", { email: packet.email }, apiVoidSchema);
        if (result.status !== "success") {
            pub("notify-error", { error_info: result.error_info });
        }
    });

    sub("auth-token", async (packet) => {
        const result = await network.postJson("/auth", { token: packet.token }, apiAuthSuccessSchema);
        if (result.status === "success") {
            is_login.current = true;
            pub("auth-success", { user_id: result.data.userId });
        } else {
            is_login.current = false;
            pub("notify-error", { error_info: result.error_info });
        }
    });

    sub("auth-success", (packet) => {
        pub("sync-settings-from-db", { user_id: packet.user_id });
        pub("sync-tasks-from-db", {});
    });

    function updateIsSelected(task: SelectableTask, isSelected: boolean): void {
        setTasks((prevTasks) => prevTasks.map((t) => (t.task.meta.id === task.task.meta.id ? { ...t, isSelected } : t)));
    }

    useEffect(() => {
        pub("read-user-settings-from-local-storage", {});
        pub("read-tasks-from-local-storage", {});
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
