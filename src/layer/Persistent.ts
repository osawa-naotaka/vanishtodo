import * as v from "valibot";
import type { DBContainer, OnComplete, OnError, Schema, TaskContent, Tasks, UserSettingContent, UserSetting } from "../../type/types";
import { IPersistent, tasksSchema, userSettingSchema } from "../../type/types";
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

class LocalStorege<T> {
    private readonly m_storage_key: string;
    private readonly m_schema: Schema<T>;
    private m_item: T;

    constructor(config: PersistentContentConfig<T>) {
        this.m_storage_key = config.storage_key;
        this.m_schema = config.schema;
        const item = localStorage.getItem(this.m_storage_key);
        if (item) {
            const result = v.safeParse(this.m_schema, JSON.parse(item));
            if (result.success) {
                this.m_item = result.output;
            } else {
                console.log(`Persistent: failed to parse ${this.m_storage_key} from localStorage. use initial value.`);
                this.m_item = config.initial_value;
            }
        } else {
            this.m_item = config.initial_value;
        }
    }

    get item(): T {
        return this.m_item;
    }

    set item(value: T) {
        this.m_item = value;
        const str = JSON.stringify(this.m_item);
        localStorage.setItem(this.m_storage_key, str);
    }
}

export class Persistent extends IPersistent {
    private readonly m_tasks_config: PersistentContentConfig<DBContainer<TaskContent>[]>;
    private readonly m_user_settings_config: PersistentContentConfig<DBContainer<UserSettingContent>>;
    private readonly m_network: Network;
    private readonly m_queue: AsyncQueue = new AsyncQueue();
    private readonly m_tasks_storage: LocalStorege<DBContainer<TaskContent>[]>;
    private readonly m_user_settings_storage: LocalStorege<DBContainer<UserSettingContent>>;

    get tasks(): DBContainer<TaskContent>[] {
        return this.m_tasks_storage.item;
    }

    get userSetting(): DBContainer<UserSettingContent> {
        return this.m_user_settings_storage.item;
    }

    constructor(network: Network) {
        super();
        this.m_network = network;
        this.m_tasks_config =  {
            name: "tasks",
            api_base: "/tasks",
            storage_key: "vanish-todo-tasks",
            schema: tasksSchema,
            initial_value: [],
        };
        this.m_user_settings_config = {
            name: "user_settings",
            api_base: "/settings",
            storage_key: "vanish-todo-user-settings",
            schema: userSettingSchema,
            initial_value: {
                meta: {
                    id: "",
                    version: 1,
                    createdAt: "",
                    updatedAt: "",
                },
                data: {
                    timezone: 9,
                    dailyGoals: {
                        heavy: 1,
                        medium: 2,
                        light: 3,
                    }
                }
            }
        };
        this.m_tasks_storage = new LocalStorege<DBContainer<TaskContent>[]>(this.m_tasks_config);
        this.m_user_settings_storage = new LocalStorege<UserSetting>(this.m_user_settings_config);
    }

    generateItem<T>(data: T): DBContainer<T> {
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

    touchItem<T>(item: DBContainer<T>): DBContainer<T> {
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

    syncTasks(onComplete: OnComplete<Tasks>): void {
        syncDBandLocalStorage<Tasks>(this.m_queue, this.m_tasks_storage, this.m_network, this.m_tasks_config.api_base, this.m_tasks_config.schema, onComplete);
    }

    createTask(item: DBContainer<TaskContent>, onError: OnError): void {
        createDBItem<TaskContent>(this.m_queue, this.m_tasks_storage, this.m_network, this.m_tasks_config.api_base, item, onError);
    }

    updateTask(item: DBContainer<TaskContent>, onError: OnError): void {
        updateDBItemArray<TaskContent>(this.m_queue, this.m_tasks_storage, this.m_network, this.m_tasks_config.api_base, item, onError);
    }

    syncUserSetting(onComplete: OnComplete<UserSetting>): void {
        syncDBandLocalStorage<UserSetting>(this.m_queue, this.m_user_settings_storage, this.m_network, this.m_user_settings_config.api_base, this.m_user_settings_config.schema, onComplete);
    }

    updateUserSetting(item: DBContainer<UserSettingContent>, onError: OnError): void {
        updateDBItem<UserSettingContent>(this.m_queue, this.m_user_settings_storage, this.m_network, this.m_user_settings_config.api_base, item, onError);
    }

}


function syncDBandLocalStorage<T>(queue: AsyncQueue, local_storage: LocalStorege<T>, network: Network, api_base: string, schema: Schema<T>, onComplete: OnComplete<T>): void {
    queue.enqueue(async () => {
        const result = await network.getJson(api_base, schema);
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

function createDBItem<T>(queue: AsyncQueue, local_storage: LocalStorege<DBContainer<T>[]>, network: Network, api_base: string, item: DBContainer<T>, onError: OnError): void {
    const arr = local_storage.item;
    arr.push(item);
    local_storage.item = arr;
    queue.enqueue(async () => {
        const result = await network.postJson(api_base, item);
        if (result.status !== "success") {
            onError(result);
        }
    });
}

function updateDBItemArray<T>(queue: AsyncQueue, local_storage: LocalStorege<DBContainer<T>[]>, network: Network, api_base: string, item: DBContainer<T>, onError: OnError): void {
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
    queue.enqueue(async () => {
        const result = await network.putJson(`${api_base}/${item.meta.id}`, item);
        if (result.status !== "success") {
            onError(result);
        }       
    });
}

function updateDBItem<T>(queue: AsyncQueue, local_storage: LocalStorege<DBContainer<T>>, network: Network, api_base: string, item: DBContainer<T>, onError: OnError): void {
    local_storage.item = item;
    queue.enqueue(async () => {
        const result = await network.putJson(api_base, item);
        if (result.status !== "success") {
            onError(result);
        }       
    });
}

