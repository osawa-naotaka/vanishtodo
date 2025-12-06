import type { DBContainer, Task } from "../types";

export abstract class IPersistent {
    abstract get items(): Task[];
    abstract generateItem<T>(data: T): DBContainer<T>;
    abstract touchItem<T>(item: DBContainer<T>): DBContainer<T>;
    abstract writeTask(item: Task): Task[];
}

export class Persistent extends IPersistent {
    private m_tasks: Record<string, Task>;

    constructor() {
        super();
        // localStorage.removeItem("vanish-todo-tasks");
        const tasks = localStorage.getItem("vanish-todo-tasks");
        if (tasks) {
            this.m_tasks = JSON.parse(tasks);
        } else {
            this.m_tasks = {};
        }
    }

    get items(): Task[] {
        return Object.values(this.m_tasks);
    }

    generateItem<T>(data: T): DBContainer<T> {
        const date = new Date().toISOString();
        return {
            id: crypto.randomUUID(),
            version: 1,
            createdAt: date,
            updatedAt: date,
            data: data,
        };
    }

    touchItem<T>(item: DBContainer<T>): DBContainer<T> {
        return {
            id: item.id,
            version: item.version + 1,
            createdAt: item.createdAt,
            updatedAt: new Date().toISOString(),
            data: item.data,
        };
    }

    writeTask(item: Task): Task[] {
        this.m_tasks[item.id] = item;
        localStorage.setItem("vanish-todo-tasks", JSON.stringify(this.m_tasks));
        return Object.values(this.m_tasks);
    }
}
