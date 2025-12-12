import * as v from "valibot";
import type { ApiVoid, DBContainer, PersistentResult, Task, Tasks } from "../../type/types";
import { apiTasksSchema, apiVoidSchema, IPersistent, tasksSchema } from "../../type/types";
import type { Network } from "./Network";

export class Persistent extends IPersistent {
    private m_tasks: Tasks;
    private m_net: Network;

    constructor(net: Network) {
        super();
        // localStorage.removeItem("vanish-todo-tasks");
        const tasks = localStorage.getItem("vanish-todo-tasks");
        if (tasks) {
            this.m_tasks = v.parse(tasksSchema, JSON.parse(tasks));
        } else {
            this.m_tasks = [];
        }
        this.m_net = net;
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

    async readTasks(): Promise<PersistentResult<Task[]>> {
        const promise = this.m_net.getJson("/tasks");
        // const promise = fetch("/api/v1/tasks", {
        //     cache: "no-store",
        // });

        return new Promise((resolve) => {
            this.m_net.processResponse(promise, apiTasksSchema, (e) => {
                if (e.status === "success") {
                    this.m_tasks = e.data.tasks;
                    localStorage.setItem("vanish-todo-tasks", JSON.stringify(this.m_tasks));
                    resolve({
                        status: "success",
                        data: this.m_tasks,
                    });
                } else {
                    resolve({
                        status: "fatal",
                        error_info: e.error_info,
                        data: this.m_tasks,
                    });
                }
            });
        });
    }

    writeTask(item: Task, onError: (r: PersistentResult<null>) => void): Task[] {
        const idx = this.m_tasks.findIndex((x) => x.meta.id === item.meta.id);
        if (idx >= 0) {
            this.m_tasks[idx] = item;
            this.writeTaskToDb(item, onError);
        } else {
            this.m_tasks.push(item);
            this.createTaskToDb(item, onError);
        }

        const str = JSON.stringify(this.m_tasks);
        localStorage.setItem("vanish-todo-tasks", str);

        return JSON.parse(str);
    }

    private createTaskToDb(item: Task, onError: (r: PersistentResult<null>) => void): void {
        const promise = this.m_net.postJson("/tasks", item);

        this.m_net.processResponse(promise, apiVoidSchema, (e: PersistentResult<ApiVoid>) => {
            if (e.status !== "success") {
                onError({ ...e, data: null });
            }
        });
    }

    private writeTaskToDb(item: Task, onError: (r: PersistentResult<null>) => void): void {
        const promise = this.m_net.putJson(`/tasks/${item.meta.id}`, item);

        this.m_net.processResponse(promise, apiVoidSchema, (e: PersistentResult<unknown>) => {
            if (e.status !== "success") {
                onError({ ...e, data: null });
            }
        });
    }
}
