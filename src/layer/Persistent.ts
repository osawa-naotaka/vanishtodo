import * as v from "valibot";
import type { ApiTasks, DBContainer, OnComplete, OnError, Task, Tasks } from "../../type/types";
import { apiTasksSchema, IPersistent, tasksSchema } from "../../type/types";
import type { Network } from "./Network";

/**
 * 永続化層インターフェースクラス
 */
export class Persistent extends IPersistent {
    private readonly m_storage_key = "vanish-todo-storage";
    private m_tasks: Tasks;
    private readonly m_network: Network;
    private readonly m_queue: (() => Promise<void>)[] = [];
    private m_is_processing_queue = false;

    /**
     * ネットワーク層をDIして永続化層を初期化します
     *
     * @param {Network} network - ネットワーク層インターフェース(DI)
     */
    constructor(network: Network) {
        super();
        // localStorage.removeItem(this.m_storage_key);
        const tasks = localStorage.getItem(this.m_storage_key);
        if (tasks) {
            const result = v.safeParse(tasksSchema, JSON.parse(tasks));
            if (result.success) {
                this.m_tasks = result.output;
            } else {
                console.log("Persistent: failed to parse tasks from localStorage. use empty list.");
                this.m_tasks = [];
            }
        } else {
            this.m_tasks = [];
        }
        this.m_network = network;
    }

    /**
     * タスク一覧を取得します
     * @return {Task[]} タスク一覧
     */
    get tasks(): Task[] {
        return Object.values(this.m_tasks);
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

    /**
     * サーバーからタスク一覧を取得し、ローカルストレージに保存します
     * 成功した場合は取得したタスク一覧を返します。
     * 失敗した場合はエラー情報と共に、ローカルストレージ内のタスク一覧を返します。
     *
     * @returns {Promise<Result<ApiTasks>>} タスク一覧取得結果
     */
    readTasks(onComplete: OnComplete<ApiTasks>): void {
        const entry = async () => {
            const result = await this.m_network.getJson("/tasks", apiTasksSchema);
            if (result.status === "success") {
                this.m_tasks = result.data.tasks;
                const str = JSON.stringify(this.m_tasks);
                localStorage.setItem(this.m_storage_key, str);
                onComplete({
                    status: "success",
                    data: result.data,
                });
            } else {
                onComplete({
                    status: "fatal",
                    error_info: result.error_info,
                    data: {
                        type: "tasks",
                        tasks: this.m_tasks,
                    },
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
    createTask(item: Task, onError: OnError): void {
        const idx = this.m_tasks.findIndex((x) => x.meta.id === item.meta.id);
        if (idx >= 0) {
            onError({
                status: "fatal",
                error_info: {
                    code: "INTERNAL_ERROR",
                    message: "タスク作成時にIDが重複しました",
                },
            });
        }
        this.m_tasks.push(item);
        this.m_queue.push(async () => {
            const result = await this.m_network.postJson("/tasks", item);
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
    updateTask(item: Task, onError: OnError): void {
        const idx = this.m_tasks.findIndex((x) => x.meta.id === item.meta.id);
        if (idx < 0) {
            onError({
                status: "fatal",
                error_info: {
                    code: "INTERNAL_ERROR",
                    message: "タスク更新時にIDが見つかりません",
                },
            });
        }
        this.m_tasks[idx] = item;
        this.m_queue.push(async () => {
            const result = await this.m_network.putJson(`/tasks/${item.meta.id}`, item);
            if (result.status !== "success") {
                onError(result);
            }
        });
        this.processQueue();
    }
}
