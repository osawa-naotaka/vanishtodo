import * as v from "valibot";
import type { DBContainer, Task, TasksType } from "../../type/types";
import { IPersistent, tasksSchema } from "../../type/types";

export class Persistent extends IPersistent {
    private m_tasks: TasksType;

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

    async readTasks(): Promise<Task[]> {
        const ret = await (await fetch("/api/v1/tasks")).json();
        console.log(ret);
        this.m_tasks = v.parse(tasksSchema, ret.data.tasks);
        localStorage.setItem("vanish-todo-tasks", JSON.stringify(this.m_tasks));
        return this.m_tasks;
    }

    writeTask(item: Task): Task[] {
        const idx = this.m_tasks.findIndex((x) => x.meta.id === item.meta.id);
        if (idx >= 0) {
            this.m_tasks[idx] = item;
        } else {
            this.m_tasks.push(item);
        }
        localStorage.setItem("vanish-todo-tasks", JSON.stringify(this.m_tasks));
        return JSON.parse(JSON.stringify(this.m_tasks));
    }
}
