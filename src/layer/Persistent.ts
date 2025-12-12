import * as v from "valibot";
import type { ApiTasks, ApiVoid, DBContainer, Result, Task, Tasks } from "../../type/types";
import { apiTasksSchema, IPersistent, tasksSchema } from "../../type/types";
import type { Network } from "./Network";

/**
 * 永続化層インターフェースクラス
 */
export class Persistent extends IPersistent {
    private m_storage_key = "vanish-todo-storage";
    private m_tasks: Tasks;
    private m_network: Network;

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
    async readTasks(): Promise<Result<ApiTasks>> {
        const result = await this.m_network.getJson("/tasks", apiTasksSchema);
        if (result.status === "success") {
            this.m_tasks = result.data.tasks;
            const str = JSON.stringify(this.m_tasks);
            localStorage.setItem(this.m_storage_key, str);
            return {
                status: "success",
                data: result.data,
            };
        } else {
            return {
                status: "fatal",
                error_info: result.error_info,
                data: {
                    type: "tasks",
                    tasks: this.m_tasks,
                },
            };
        }
    }

    /**
     * タスクを作成します
     *
     * @param {Task} item - 作成するタスク
     * @returns {Promise<Result<ApiVoid>>} タスク作成結果(エラー情報)
     */
    async createTask(item: Task): Promise<Result<ApiVoid>> {
        const idx = this.m_tasks.findIndex((x) => x.meta.id === item.meta.id);
        if (idx >= 0) {
            return {
                status: "fatal",
                error_info: {
                    code: "INTERNAL_ERROR",
                    message: "タスク作成時にIDが重複しました",
                },
            };
        }
        this.m_tasks.push(item);
        return this.m_network.postJson("/tasks", item);
    }

    /**
     * タスクを更新します
     *
     * @param {Task} item - 更新するタスク
     * @returns {Promise<Result<ApiVoid>>} タスク更新結果(エラー情報)
     */
    async updateTask(item: Task): Promise<Result<ApiVoid>> {
        const idx = this.m_tasks.findIndex((x) => x.meta.id === item.meta.id);
        if (idx < 0) {
            return {
                status: "fatal",
                error_info: {
                    code: "INTERNAL_ERROR",
                    message: "タスク更新時にIDが見つかりません",
                },
            };
        }
        this.m_tasks[idx] = item;
        return this.m_network.putJson(`/tasks/${item.meta.id}`, item);
    }
}
