import type { Task, TaskContent, TaskCreateContent } from "../types";
import type { IPersistent } from "./Persistent";

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

    complete(item: Task): Task[] {
        const c = this.m_persistent.touchItem<TaskContent>(item);
        c.data.completedAt = c.updatedAt;
        return this.m_persistent.writeTask(c);
    }

    edit(item: Task): Task[] {
        const updated = this.m_persistent.touchItem<TaskContent>(item);
        updated.data = item.data;
        return this.m_persistent.writeTask(updated);
    }

    get tasks(): Task[] {
        return this.m_persistent.items;
    }
}
