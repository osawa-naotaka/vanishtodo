import * as v from "valibot";
import type { DBContainer, Task, Tasks, VResp } from "../../type/types";
import { apiFailResponseSchema, apiSuccessResponseSchema, apiTasksSchema, IPersistent, tasksSchema } from "../../type/types";

export class Persistent extends IPersistent {
    private m_tasks: Tasks;

    constructor() {
        super();
        // localStorage.removeItem("vanish-todo-tasks");
        const tasks = localStorage.getItem("vanish-todo-tasks");
        if (tasks) {
            this.m_tasks = v.parse(tasksSchema, JSON.parse(tasks));
        } else {
            this.m_tasks = [];
        }
    }

    get items(): Task[] {
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

    readTasks(): Promise<VResp<Task[]>> {
        return new Promise((resolve) => {
            const promise = fetch("/api/v1/tasks");
            this.processResponse(promise, (e) => {
                const resp = v.safeParse(apiTasksSchema, e.data);
                if (resp.success) {
                    this.m_tasks = resp.output.tasks;
                    localStorage.setItem("vanish-todo-tasks", JSON.stringify(this.m_tasks));
                    resolve({
                        status: "success",
                        data: this.m_tasks,
                    });
                } else {
                    resolve({
                        status: "server_internal_error",
                        data: this.m_tasks,
                    });
                }
            });
        });
    }

    writeTask(item: Task, onError: (r: VResp<null>) => void): Task[] {
        const idx = this.m_tasks.findIndex((x) => x.meta.id === item.meta.id);
        if (idx >= 0) {
            this.m_tasks[idx] = item;
        } else {
            this.m_tasks.push(item);
        }
        localStorage.setItem("vanish-todo-tasks", JSON.stringify(this.m_tasks));
        this.writeTaskToDb(item, onError);

        return JSON.parse(JSON.stringify(this.m_tasks));
    }

    writeTaskToDb(item: Task, onError: (r: VResp<null>) => void): void {
        const promise = fetch(`/api/v1/tasks/${item.meta.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(item),
        });

        this.processResponse(promise, (e: VResp<unknown>) => {
            if (e.status !== "success") {
                onError({
                    status: e.status,
                    message: e.message,
                    data: null,
                });
            }
        });
    }

    processResponse(promise: Promise<Response>, then: (r: VResp<unknown>) => void): void {
        promise
            .then((resp) => {
                if (!resp.ok) {
                    if (resp.status === 500) {
                        then({
                            status: "server_internal_error",
                            message: resp.statusText,
                            data: null,
                        });
                    } else {
                        then({
                            status: "http_error",
                            message: `${resp.status} ${resp.statusText}`,
                            data: null,
                        });
                    }
                } else {
                    resp.json()
                        .then((r) => {
                            const parse_success = v.safeParse(apiSuccessResponseSchema, r);
                            if (parse_success.success) {
                                then(parse_success.output);
                                return;
                            }

                            const parse_fail = v.safeParse(apiFailResponseSchema, r);
                            if (parse_fail.success) {
                                then({
                                    status: "server_internal_error",
                                    data: null,
                                });
                            }
                        })
                        .catch((e: unknown) => {
                            if (e instanceof SyntaxError || e instanceof TypeError) {
                                then({
                                    status: "server_internal_error",
                                    message: e.stack,
                                    data: null,
                                });
                            } else if (e instanceof DOMException) {
                                then({
                                    status: "abort",
                                    message: e.stack,
                                    data: null,
                                });
                            } else {
                                throw e;
                            }
                        });
                }
            })
            .catch((e: unknown) => {
                if (e instanceof TypeError) {
                    then({
                        status: "network_error",
                        message: e.message,
                        data: null,
                    });
                    return;
                }

                throw e;
            });
    }
}
