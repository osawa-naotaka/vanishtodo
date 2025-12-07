import * as v from "valibot";
import { DBContainerMetaSchema, idSchema, taskContentSchema } from "../types";
import type { DBContainer, Task } from "../types";

const tasksSchema = v.record(
    idSchema,
    v.object({
        meta: DBContainerMetaSchema,
        data: taskContentSchema,
    }),
);

type TasksType = v.InferOutput<typeof tasksSchema>;

export abstract class IPersistent {
    abstract get items(): Task[];
    abstract generateItem<T>(data: T): DBContainer<T>;
    abstract touchItem<T>(item: DBContainer<T>): DBContainer<T>;
    abstract writeTask(item: Task): Task[];
}

export class Persistent extends IPersistent {
    private m_tasks: TasksType;

    constructor() {
        super();
        // localStorage.removeItem("vanish-todo-tasks");
        const tasks = localStorage.getItem("vanish-todo-tasks");
        if (tasks) {
            this.m_tasks = v.parse(tasksSchema, JSON.parse(tasks));
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

    writeTask(item: Task): Task[] {
        this.m_tasks[item.meta.id] = item;
        localStorage.setItem("vanish-todo-tasks", JSON.stringify(this.m_tasks));
        return Object.values(this.m_tasks);
    }
}
