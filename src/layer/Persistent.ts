import * as v from "valibot";
import type { ConnectResult, Container, OnComplete, OnError, Schema } from "../../type/types";
import { apiVoidSchema, IPersistent } from "../../type/types";
import type { Network } from "./Network";

export type PersistentContentConfig<T> = {
    name: string;
    api_base: string;
    storage_key: string;
    schema: Schema<T>;
    initial_value: T;
};

class AsyncQueue {
    private readonly m_queue: (() => Promise<void>)[] = [];
    private m_is_processing_queue = false;

    enqueue(fn: () => Promise<void>): void {
        this.m_queue.push(fn);
        this.processQueue();
    }

    processQueue(): void {
        if (!this.m_is_processing_queue) {
            this.m_is_processing_queue = true;
            const proc = async () => {
                while (this.m_queue.length > 0) {
                    const fn = this.m_queue.shift();
                    if (fn) {
                        await fn();
                    }
                }
                this.m_is_processing_queue = false;
            };
            proc();
        }
    }
}

export class LocalStorage<T> {
    private readonly m_config: PersistentContentConfig<T>;

    constructor(config: PersistentContentConfig<T>) {
        this.m_config = config;
    }

    get item(): T {
        const item = localStorage.getItem(this.m_config.storage_key);
        if (item) {
            const result = v.safeParse(this.m_config.schema, JSON.parse(item));
            if (result.success) {
                return result.output;
            } else {
                console.log(`Persistent: failed to parse ${this.m_config.storage_key} from localStorage. use initial value.`);
                return this.m_config.initial_value;
            }
        } else {
            return this.m_config.initial_value;
        }
    }

    set item(value: T) {
        const str = JSON.stringify(value);
        localStorage.setItem(this.m_config.storage_key, str);
    }
}

export class Persistent<T, S> extends IPersistent<T, S> {
    private readonly m_tasks_config: PersistentContentConfig<Container<T>[]>;
    private readonly m_setting_config: PersistentContentConfig<Container<S>>;
    private readonly m_network: Network;
    private readonly m_queue: AsyncQueue;
    private readonly m_tasks_storage: LocalStorage<Container<T>[]>;
    private readonly m_setting_storage: LocalStorage<Container<S>>;
    private m_login = false;

    get tasks(): Container<T>[] {
        return this.m_tasks_storage.item;
    }

    get setting(): Container<S> {
        return this.m_setting_storage.item;
    }

    constructor(network: Network, tasks_config: PersistentContentConfig<Container<T>[]>, setting_config: PersistentContentConfig<Container<S>>) {
        super();
        this.m_network = network;
        this.m_tasks_config = tasks_config;
        this.m_setting_config = setting_config;
        this.m_tasks_storage = new LocalStorage<Container<T>[]>(this.m_tasks_config);
        this.m_setting_storage = new LocalStorage<Container<S>>(this.m_setting_config);
        this.m_queue = new AsyncQueue();
    }

    connect(user_id: string, onComplete: OnComplete<ConnectResult<T, S>>): void {
        this.m_login = true;

        this.m_queue.enqueue(async () => {
            const setting_result = await this.m_network.getJson(`${this.m_setting_config.api_base}/${user_id}`, this.m_setting_config.schema);
            if (setting_result.status !== "success") {
                onComplete({
                    status: "fatal",
                    error_info: setting_result.error_info,
                    data: {
                        tasks: this.m_tasks_storage.item,
                        setting: this.m_setting_storage.item,
                    },
                });
                return;
            }

            const tasks_result = await this.m_network.getJson(this.m_tasks_config.api_base, this.m_tasks_config.schema);
            if (tasks_result.status !== "success") {
                onComplete({
                    status: "fatal",
                    error_info: tasks_result.error_info,
                    data: {
                        tasks: this.m_tasks_storage.item,
                        setting: setting_result.data,
                    },
                });
                return;
            }

            this.m_setting_storage.item = setting_result.data;
            this.m_tasks_storage.item = tasks_result.data;

            onComplete({
                status: "success",
                data: {
                    tasks: tasks_result.data,
                    setting: setting_result.data,
                },
            });
        });
    }

    disconnect(): void {
        this.m_login = false;
    }

    create(item: Container<T>, onError: OnError): void {
        const arr = this.m_tasks_storage.item;
        arr.push(item);
        this.m_tasks_storage.item = arr;
        if (this.m_login) {
            this.m_queue.enqueue(async () => {
                const result = await this.m_network.postJson(this.m_tasks_config.api_base, item, apiVoidSchema);
                if (result.status !== "success") {
                    onError(result);
                }
            });
        }
    }

    update(item: Container<T>, onError: OnError): void {
        const arr = this.m_tasks_storage.item;
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
        this.m_tasks_storage.item = arr;
        if (this.m_login) {
            this.m_queue.enqueue(async () => {
                const result = await this.m_network.putJson(`${this.m_tasks_config.api_base}/${item.meta.id}`, item);
                if (result.status !== "success") {
                    onError(result);
                }
            });
        }
    }

    updateSetting(value: Container<S>, onError: OnError) {
        this.m_setting_storage.item = value;
        if (this.m_login) {
            this.m_queue.enqueue(async () => {
                const result = await this.m_network.putJson(`${this.m_setting_config.api_base}/${value.meta.id}`, value);
                if (result.status !== "success") {
                    onError(result);
                }
            });
        }
    }
}

export function generateItem<T>(data: T): Container<T> {
    const date = new Date().toISOString();
    return {
        meta: {
            id: crypto.randomUUID(),
            version: 1,
            createdAt: date,
            updatedAt: date,
        },
        data,
    };
}

export function touchItem<T>(item: Container<T>): Container<T> {
    return {
        meta: {
            id: item.meta.id,
            version: item.meta.version + 1,
            createdAt: item.meta.createdAt,
            updatedAt: new Date().toISOString(),
        },
        data: item.data,
    };
}
