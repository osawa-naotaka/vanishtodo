import * as v from "valibot";
import type { DBContainer, OnComplete, OnError, Schema, Task, TaskContent, Tasks } from "../../type/types";
import { apiReadAllSchema, DBContainerSchema, IPersistent, taskContentSchema } from "../../type/types";
import type { Network } from "./Network";

export type PersistentContentSetting<T> = {
    name: string;
    api_base: string;
    storage_key: string;
    schema: Schema<T>;
};

/**
 * 永続化層インターフェースクラス
 */
export class Persistent extends IPersistent {
    private readonly m_tasks: PersistentContent<TaskContent>;

    constructor(network: Network) {
        super();
        this.m_tasks = new PersistentContent(network, {
            name: "tasks",
            api_base: "/tasks",
            storage_key: "vanish-todo-tasks",
            schema: taskContentSchema,
        });
    }

    get tasks(): Tasks {
        return this.m_tasks.items;
    }

    /**
     * メタ情報を付加したコンテンツを生成します。
     * コンテンツの内容は引数dataで指定します。
     *
     * @param {T} data - コンテナに格納するデータ
     * @returns {DBContainer<T>} 生成されたDBコンテナ
     */
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

    /**
     * コンテナの更新を行います。
     * versionをインクリメントし、updatedAtを現在日時に更新します。
     *
     * @param {DBContainer<T>} item - 更新するコンテナ
     * @returns {DBContainer<T>} 更新されたコンテナ
     */
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

    createTask(item: Task, onError: OnError): void {
        this.m_tasks.create(item, onError);
    }

    readTasks(onComplete: OnComplete<Tasks>): void {
        this.m_tasks.readAll(onComplete);
    }

    updateTask(item: Task, onError: OnError): void {
        this.m_tasks.update(item, onError);
    }
}

class PersistentContent<T> {
    private readonly m_setting: PersistentContentSetting<T>;
    private m_items: DBContainer<T>[];
    private readonly m_network: Network;
    private readonly m_queue: (() => Promise<void>)[] = [];
    private m_is_processing_queue = false;

    /**
     * ネットワーク層をDIして永続化層を初期化します
     *
     * @param {Network} network - ネットワーク層インターフェース(DI)
     */
    constructor(network: Network, setting: PersistentContentSetting<T>) {
        this.m_setting = setting;
        // localStorage.removeItem(this.m_storage_key);
        const items = localStorage.getItem(this.m_setting.storage_key);
        if (items) {
            const result = v.safeParse(v.array(DBContainerSchema(this.m_setting.schema)), JSON.parse(items));
            if (result.success) {
                this.m_items = result.output;
            } else {
                console.log(`Persistent: failed to parse ${this.m_setting.name} from localStorage. use empty list.`);
                this.m_items = [];
            }
        } else {
            this.m_items = [];
        }
        this.m_network = network;
    }

    /**
     * タスク一覧を取得します
     * @return {Task[]} タスク一覧
     */
    get items(): DBContainer<T>[] {
        return Object.values(this.m_items);
    }

    /**
     * サーバーからタスク一覧を取得し、ローカルストレージに保存します
     * 成功した場合は取得したタスク一覧を返します。
     * 失敗した場合はエラー情報と共に、ローカルストレージ内のタスク一覧を返します。
     *
     * @returns {Promise<Result<ApiTasks>>} タスク一覧取得結果
     */
    readAll(onComplete: OnComplete<DBContainer<T>[]>): void {
        const entry = async () => {
            const result = await this.m_network.getJson(this.m_setting.api_base, apiReadAllSchema<T>(this.m_setting.schema));
            if (result.status === "success") {
                this.m_items = result.data;
                const str = JSON.stringify(this.m_items);
                localStorage.setItem(this.m_setting.storage_key, str);
                onComplete({
                    status: "success",
                    data: result.data,
                });
            } else {
                onComplete({
                    status: "fatal",
                    error_info: result.error_info,
                    data: this.m_items,
                });
            }
        };
        this.m_queue.push(entry);
        this.processQueue();
    }

    private processQueue(): void {
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

    /**
     * タスクを作成します
     *
     * @param {Task} item - 作成するタスク
     * @returns {Promise<Result<ApiVoid>>} タスク作成結果(エラー情報)
     */
    create(item: DBContainer<T>, onError: OnError): void {
        const idx = this.m_items.findIndex((x) => x.meta.id === item.meta.id);
        if (idx >= 0) {
            onError({
                status: "fatal",
                error_info: {
                    code: "INTERNAL_ERROR",
                    message: `${this.m_setting.name}作成時にIDが重複しました`,
                },
            });
        }
        this.m_items.push(item);
        this.m_queue.push(async () => {
            const result = await this.m_network.postJson(this.m_setting.api_base, item);
            if (result.status !== "success") {
                onError(result);
            }
        });
        this.processQueue();
    }

    /**
     * タスクを更新します
     *
     * @param {Task} item - 更新するタスク
     * @returns {Promise<Result<ApiVoid>>} タスク更新結果(エラー情報)
     */
    update(item: DBContainer<T>, onError: OnError): void {
        const idx = this.m_items.findIndex((x) => x.meta.id === item.meta.id);
        if (idx < 0) {
            onError({
                status: "fatal",
                error_info: {
                    code: "INTERNAL_ERROR",
                    message: `${this.m_setting.name}更新時にIDが見つかりません`,
                },
            });
        }
        this.m_items[idx] = item;
        this.m_queue.push(async () => {
            const result = await this.m_network.putJson(`${this.m_setting.api_base}/${item.meta.id}`, item);
            if (result.status !== "success") {
                onError(result);
            }
        });
        this.processQueue();
    }
}
