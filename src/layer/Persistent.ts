import * as v from "valibot";
import type { ApiTasks, ApiVoid, DBContainer, Result, Task, Tasks } from "../../type/types";
import { apiTasksSchema, apiVoidSchema, IPersistent, tasksSchema } from "../../type/types";
import type { Network } from "./Network";

export class Persistent extends IPersistent {
    private m_storage_key = "vanish-todo-storage";
    private m_tasks: Tasks;
    private m_network: Network;

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

    get tasks(): Task[] {
        return Object.values(this.m_tasks);
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

    async readTasks(): Promise<Result<ApiTasks>> {
        const promise = this.m_network.getJson("/tasks");
        // const promise = fetch("/api/v1/tasks", {
        //     cache: "no-store",
        // });
        const result = await this.m_network.processResponse(promise, apiTasksSchema);
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
        const promise = this.m_network.postJson("/tasks", item);
        return this.m_network.processResponse(promise, apiVoidSchema);
    }

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
        const promise = this.m_network.putJson(`/tasks/${item.meta.id}`, item);
        return this.m_network.processResponse(promise, apiVoidSchema);
    }
}
