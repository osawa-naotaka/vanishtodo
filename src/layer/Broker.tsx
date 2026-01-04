import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import { type ApiErrorInfo, type Container, type OnError, type Task, type TaskContent, type TaskCreate, tasksSchema } from "../../type/types";
import { generateItem, LocalStorage, type PersistentContentConfig, touchItem } from "./Persistent";

// -----------------------------------------------------------------------------
// イベント型
// -----------------------------------------------------------------------------

export type EvTopicLabel = keyof EvTopicPacketMap;

export type EvTopicPacketMap = {
    "create-task": { task: TaskCreate };
    "read-task-list": Record<string, never>;
    "edit-task": { task: Task };
    "complete-task": { task: Task };
    "update-task-list": { tasks: Task[] };
    "notify-error": { error_info: ApiErrorInfo };
};

// -----------------------------------------------------------------------------
// イベントブローカー
// -----------------------------------------------------------------------------

export type OnEventListener<T> = (broker: EventBroker, packet: T) => void;

export class EventBroker {
    private listeners: { [key in EvTopicLabel]?: OnEventListener<EvTopicPacketMap[key]>[] } = {};

    subscribe<T extends EvTopicLabel>(topic: T, listener: OnEventListener<EvTopicPacketMap[T]>): void {
        if (!this.listeners[topic]) {
            this.listeners[topic] = [];
        }
        this.listeners[topic]?.push(listener);
    }

    publish<T extends EvTopicLabel>(topic: T, packet: EvTopicPacketMap[T]): void {
        const topic_listeners = this.listeners[topic];
        if (topic_listeners) {
            for (const listener of topic_listeners) {
                listener(this, packet);
            }
        }
    }
}

export class Persistent<T> {
    private readonly m_storage: LocalStorage<Container<T>[]>;

    get items(): Container<T>[] {
        return this.m_storage.item;
    }

    constructor(config: PersistentContentConfig<Container<T>[]>) {
        this.m_storage = new LocalStorage<Container<T>[]>(config);
    }

    create(item: Container<T>): void {
        this.createDBItem(this.m_storage, item);
    }

    update(item: Container<T>, onError: OnError): void {
        this.updateDBItemArray(this.m_storage, item, onError);
    }

    private createDBItem<T>(local_storage: LocalStorage<Container<T>[]>, item: Container<T>): void {
        const arr = local_storage.item;
        arr.push(item);
        local_storage.item = arr;
    }

    private updateDBItemArray<T>(local_storage: LocalStorage<Container<T>[]>, item: Container<T>, onError: OnError): void {
        const arr = local_storage.item;
        const idx = arr.findIndex((x) => x.meta.id === item.meta.id);
        if (idx < 0) {
            onError({
                status: "fatal",
                error_info: {
                    code: "INTERNAL_ERROR",
                    message: `更新時にIDが見つかりません`,
                },
            });
        }
        arr[idx] = item;
        local_storage.item = arr;
    }
}

// -----------------------------------------------------------------------------
// コンテキストプロバイダー
// -----------------------------------------------------------------------------

export type ContextType = {
    broker: EventBroker;
};

export const BrokerContext = createContext<ContextType | null>(null);

export function BrokerContextProvider({ children }: { children: ReactNode }): ReactNode {
    const broker = new EventBroker();
    const p = new Persistent<TaskContent>({
        name: "tasks",
        storage_key: "vanish-todo-tasks",
        api_base: "/api/tasks",
        schema: tasksSchema,
        initial_value: [],
    });

    broker.subscribe("create-task", (broker, packet) => {
        const c: TaskContent = {
            ...packet.task,
            completedAt: undefined,
            isDeleted: false,
        };
        const item = generateItem(c);
        p.create(item);

        broker.publish("update-task-list", { tasks: p.items });
    });

    broker.subscribe("read-task-list", (broker) => {
        broker.publish("update-task-list", { tasks: p.items });
    });

    broker.subscribe("edit-task", (broker, packet) => {
        const item = touchItem(packet.task);
        p.update(item, (e) => {
            if (e.status !== "success") {
                broker.publish("notify-error", { error_info: e.error_info });
            }
        });
        broker.publish("update-task-list", { tasks: p.items });
    });

    broker.subscribe("complete-task", (broker, packet) => {
        const item = touchItem(packet.task);
        item.data.completedAt = item.meta.updatedAt;
        p.update(item, (e) => {
            if (e.status !== "success") {
                broker.publish("notify-error", { error_info: e.error_info });
            }
        });
        broker.publish("update-task-list", { tasks: p.items });
    });

    return <BrokerContext.Provider value={{ broker }}>{children}</BrokerContext.Provider>;
}

export function useBroker(): ContextType {
    const context = useContext(BrokerContext);
    if (!context) {
        throw new Error("vanishtodo internal error: ContextProviderが見つかりません。");
    }
    return context;
}
