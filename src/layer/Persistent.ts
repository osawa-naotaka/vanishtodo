import * as v from "valibot";
import type { Container, OnComplete, OnError, Schema } from "../../type/types";
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

export class Persistent<T> extends IPersistent<T> {
    private readonly m_config: PersistentContentConfig<Container<T>[]>;
    private readonly m_network: Network;
    private readonly m_queue: AsyncQueue;
    private readonly m_storage: LocalStorage<Container<T>[]>;
    private m_login = false;

    get items(): Container<T>[] {
        return this.m_storage.item;
    }

    constructor(network: Network, config: PersistentContentConfig<Container<T>[]>) {
        super();
        this.m_network = network;
        this.m_config = config;
        this.m_storage = new LocalStorage<Container<T>[]>(this.m_config);
        this.m_queue = new AsyncQueue();
    }

    connect(onComplete: OnComplete<Container<T>[]>): void {
        this.m_login = true;
        this.syncDBandLocalStorage(this.m_storage, this.m_config, onComplete);
    }

    disconnect(): void {
        this.m_login = false;
    }

    create(item: Container<T>, onError: OnError): void {
        this.createDBItem(this.m_storage, this.m_config, item, onError);
    }

    update(item: Container<T>, onError: OnError): void {
        this.updateDBItemArray(this.m_storage, this.m_config, item, onError);
    }

    private syncDBandLocalStorage<T>(local_storage: LocalStorage<T>, setting: PersistentContentConfig<T>, onComplete: OnComplete<T>): void {
        this.m_queue.enqueue(async () => {
            const result = await this.m_network.getJson(setting.api_base, setting.schema);
            if (result.status === "success") {
                local_storage.item = result.data;
                onComplete({
                    status: "success",
                    data: result.data,
                });
            } else {
                onComplete({
                    status: "fatal",
                    error_info: result.error_info,
                    data: local_storage.item,
                });
            }
        });
    }

    private createDBItem<T>(
        local_storage: LocalStorage<Container<T>[]>,
        config: PersistentContentConfig<Container<T>[]>,
        item: Container<T>,
        onError: OnError,
    ): void {
        const arr = local_storage.item;
        arr.push(item);
        local_storage.item = arr;
        if (this.m_login) {
            this.m_queue.enqueue(async () => {
                const result = await this.m_network.postJson(config.api_base, item, apiVoidSchema);
                if (result.status !== "success") {
                    onError(result);
                }
            });
        }
    }

    private updateDBItemArray<T>(
        local_storage: LocalStorage<Container<T>[]>,
        config: PersistentContentConfig<Container<T>[]>,
        item: Container<T>,
        onError: OnError,
    ): void {
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
        if (this.m_login) {
            this.m_queue.enqueue(async () => {
                const result = await this.m_network.putJson(`${config.api_base}/${item.meta.id}`, item);
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
