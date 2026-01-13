import * as v from "valibot";
import type { ConnectResult, Container, OnComplete, OnError, Result, Schema, Void } from "../../type/types";
import { apiAuthSuccessSchema, apiVoidSchema, IPersistent } from "../../type/types";
import type { Network } from "./Network";

export type PersistentContentConfig<T> = {
    name: string;
    api_base: string;
    storage_key: string;
    schema: Schema<T>;
    initial_value: T;
};

type QueueEntry = () => Promise<Result<Void>>;

class AsyncQueue {
    private readonly m_queue: QueueEntry[] = [];
    private m_is_processing_queue = false;
    private m_onError: OnError;

    constructor() {
        this.m_onError = (e) => {
            console.error(e);
        };
    }

    registerOnError(onError: OnError): void {
        this.m_onError = onError;
    }

    enqueue(fn: QueueEntry): void {
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
                        const result = await fn();
                        if (result.status !== "success") {
                            this.m_onError(result);
                        }
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

type LoginStatus = {
    isLogin: boolean;
    userId: string;
};

export class Persistent<T, S> extends IPersistent<T, S> {
    private readonly m_tasks_config: PersistentContentConfig<Container<T>[]>;
    private readonly m_setting_config: PersistentContentConfig<Container<S>>;
    private readonly m_network: Network;
    private readonly m_queue: AsyncQueue;
    private readonly m_tasks_storage: LocalStorage<Container<T>[]>;
    private readonly m_setting_storage: LocalStorage<Container<S>>;
    private readonly m_login_storage: LocalStorage<LoginStatus>;

    get tasks(): Container<T>[] {
        return this.m_tasks_storage.item;
    }

    get setting(): Container<S> {
        return this.m_setting_storage.item;
    }

    get isLogin(): boolean {
        return this.m_login_storage.item.isLogin;
    }

    get userId(): string {
        return this.m_login_storage.item.userId;
    }

    constructor(network: Network, tasks_config: PersistentContentConfig<Container<T>[]>, setting_config: PersistentContentConfig<Container<S>>) {
        super();
        this.m_network = network;
        this.m_tasks_config = tasks_config;
        this.m_setting_config = setting_config;
        this.m_tasks_storage = new LocalStorage<Container<T>[]>(this.m_tasks_config);
        this.m_setting_storage = new LocalStorage<Container<S>>(this.m_setting_config);
        this.m_login_storage = new LocalStorage<LoginStatus>({
            name: "login_status",
            api_base: "",
            storage_key: "vanish-todo-login-status",
            schema: v.object({
                isLogin: v.boolean(),
                userId: v.string(),
            }),
            initial_value: {
                isLogin: false,
                userId: "default",
            },
        });

        this.m_queue = new AsyncQueue();
    }

    registerOnError(onError: OnError): void {
        this.m_queue.registerOnError(onError);
    }

    requestLogin(email: string): void {
        const item: QueueEntry = () => {
            return this.m_network.postJson("/login", { email }, apiVoidSchema);
        };
        this.m_queue.enqueue(item);
    }

    connect(token: string, onComplete: OnComplete<ConnectResult<T, S>>): void {
        const item: QueueEntry = async () => {
            const result = await this.m_network.postJson("/auth", { token }, apiAuthSuccessSchema);
            if (result.status !== "success") {
                return result;
            }
            this.m_login_storage.item = {
                isLogin: true,
                userId: result.data.userId,
            };

            const setting_result = await this.m_network.getJson(
                `${this.m_setting_config.api_base}/${this.m_login_storage.item.userId}`,
                this.m_setting_config.schema,
            );
            if (setting_result.status !== "success") {
                return setting_result;
            }

            const tasks_result = await this.m_network.getJson(this.m_tasks_config.api_base, this.m_tasks_config.schema);
            if (tasks_result.status !== "success") {
                return tasks_result;
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

            return { status: "success", data: { type: "void" } };
        };

        this.m_queue.enqueue(item);
    }

    disconnect(onComplete: OnComplete<ConnectResult<T, S>>): void {
        const item: QueueEntry = async () => {
            return this.m_network.postJson("/logout", {}, apiVoidSchema);
        };
        this.m_queue.enqueue(item);
        this.m_login_storage.item = {
            isLogin: false,
            userId: "default",
        };
        this.m_tasks_storage.item = [];
        this.m_setting_storage.item = this.m_setting_config.initial_value;
        onComplete({
            status: "success",
            data: {
                tasks: this.m_tasks_storage.item,
                setting: this.m_setting_storage.item,
            },
        });
    }

    create(item: Container<T>): void {
        const arr = this.m_tasks_storage.item;
        arr.push(item);
        this.m_tasks_storage.item = arr;
        if (this.m_login_storage.item.isLogin) {
            this.m_queue.enqueue(() => {
                return this.m_network.postJson(this.m_tasks_config.api_base, item, apiVoidSchema);
            });
        }
    }

    update(item: Container<T>): void {
        const arr = this.m_tasks_storage.item;
        const idx = arr.findIndex((x) => x.meta.id === item.meta.id);
        if (idx < 0) {
            console.error(`Persistent: failed to update item. id ${item.meta.id} not found.`);
            return;
        }
        arr[idx] = item;
        this.m_tasks_storage.item = arr;
        if (this.m_login_storage.item.isLogin) {
            this.m_queue.enqueue(() => {
                return this.m_network.putJson(`${this.m_tasks_config.api_base}/${item.meta.id}`, item);
            });
        }
    }

    updateSetting(value: Container<S>) {
        this.m_setting_storage.item = value;
        if (this.m_login_storage.item.isLogin) {
            this.m_queue.enqueue(() => {
                return this.m_network.putJson(`${this.m_setting_config.api_base}/${value.meta.id}`, value);
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
