import { IPersistent } from "./Persistent"
import type { Task, TaskContent, TaskCreateContent } from "../types";

export class Business {
    private m_persistent: IPersistent;

    constructor(persistent: IPersistent) {
        this.m_persistent = persistent;
    }

    create(data: TaskCreateContent): Task[] {
        const c: TaskContent = {
            title: data.title,
            weight: data.weight ?? null,
            dueDate: data.dueDate ?? null,
            completedAt: null,
            isDeleted: false,
        };
        const item = this.m_persistent.generateItem<TaskContent>(c);
        return this.m_persistent.writeTask(item);
    }

    complete(data: Task): Task[] {
        const date = new Date();
        const updated: Task = {
            ...data,
            version: data.version + 1,
            updatedAt: date,
            data: {
                ...data.data,
                completedAt: date,
            }
        };
        return this.m_persistent.writeTask(updated);
    }

    edit(data: Task): Task[] {
        const date = new Date();
        const updated: Task = {
            ...data,
            version: data.version + 1,
            updatedAt: date,
            data: {
                ...data.data,
            }
        };
        return this.m_persistent.writeTask(updated);
    }

    get tasks(): Task[] {
        return this.m_persistent.items;
    }
}