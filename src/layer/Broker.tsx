import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ApiErrorInfo, ApiVoid, Container, Result, Task, TaskContent, TaskCreate, UserSetting } from "../../type/types";
import { apiAuthSuccessSchema } from "../../type/types";
import { buildBusinessEvents, buildBusinessEventsDuringLogin, setting_config, task_config, userSettingInitialValue } from "./Business";
import { Network } from "./Network";
import type { PersistentContentConfig } from "./Persistent";
import { generateItem, LocalStorage } from "./Persistent";

// -----------------------------------------------------------------------------
// イベント型
// -----------------------------------------------------------------------------

export type EvTopicLabel = keyof EvTopicPacketMap;

export type EvNoArgPacket = Record<string, never>;

export type EvTopicPacketMap = {
    "create-task": { task: TaskCreate };
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
    "update-user-settings-state": { setting: UserSetting };
    "request-login": { email: string };
    "auth-token": { token: string };
    "auth-success": { user_id: string };
};

// -----------------------------------------------------------------------------
// イベントブローカー
// -----------------------------------------------------------------------------

export type OnEventListener<E, T extends keyof E> = (packet: E[T]) => void | Promise<void>;

export type EventBroker<E> = [
    <T extends keyof E>(topic: T, packet: E[T]) => void,
    <T extends keyof E>(topic: T, listener: OnEventListener<E, T>) => () => void,
];

export function createEventBroker<E>(): EventBroker<E> {
    const listeners: { [key in keyof E]?: Set<OnEventListener<E, key>> } = {};

    function subscribe<T extends keyof E>(topic: T, listener: OnEventListener<E, T>) {
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
    isInitialized: boolean;
};

export type SelectableTask = {
    task: Task;
    isSelected: boolean;
};

export const BrokerContext = createContext<ContextType | null>(null);

export function BrokerContextProvider({ children }: { children: ReactNode }): ReactNode {
    console.log("BrokerContextProvider: render");
    const [tasks, setTasks] = useState<SelectableTask[]>([]);
    const [userSetting, setUserSetting] = useState<UserSetting>(userSettingInitialValue);
    const [isInitialized, setIsInitialized] = useState(false);
    const broker = useRef(createEventBroker<EvTopicPacketMap>());
    const is_login = useRef(false);

    function updateIsSelected(task: SelectableTask, isSelected: boolean): void {
        setTasks((prevTasks) => prevTasks.map((t) => (t.task.meta.id === task.task.meta.id ? { ...t, isSelected } : t)));
    }

    useEffect(() => {
        console.log("BrokerContextProvider: useEffect initial load");
        const network = new Network("/api/v1");

        const per_tasks = new Persistent<TaskContent>(task_config);
        const ls_settings = new LocalStorage<UserSetting>(setting_config);

        let login_events_cleanup: (() => void)[] = [];

        buildBusinessEvents(broker, per_tasks, ls_settings, network);
        const [pub, sub] = broker.current;

        // Home.tsx
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

        // LoginAuth.tsx
        sub("auth-token", async (packet) => {
            const result = await network.postJson("/auth", { token: packet.token }, apiAuthSuccessSchema);
            if (result.status === "success") {
                is_login.current = true;
                login_events_cleanup = buildBusinessEventsDuringLogin(broker.current, network);
                pub("auth-success", { user_id: result.data.userId });
            } else {
                is_login.current = false;
                for (const cleanup of login_events_cleanup) {
                    cleanup();
                }
                login_events_cleanup = [];
                pub("notify-error", { error_info: result.error_info });
            }
        });

        // update React State
        sub("update-tasks-state", (packet) => {
            setTasks(packet.tasks.map((t) => ({ task: t, isSelected: false })));
        });

        sub("update-user-settings-state", (packet) => {
            setUserSetting(packet.setting);
        });

        // Error handling
        sub("notify-error", (packet) => {
            console.error(packet.error_info);
        });

        //
        // initialize
        pub("update-user-settings-state", { setting: ls_settings.item });
        pub("update-tasks-state", { tasks: per_tasks.items });

        // 初期化完了を通知
        setIsInitialized(true);
    }, []);

    return <BrokerContext.Provider value={{ broker: broker.current, tasks, userSetting, updateIsSelected, isInitialized }}>{children}</BrokerContext.Provider>;
}

export function useBroker(): ContextType {
    const context = useContext(BrokerContext);
    if (!context) {
        throw new Error("vanishtodo internal error: ContextProviderが見つかりません。");
    }
    return context;
}
