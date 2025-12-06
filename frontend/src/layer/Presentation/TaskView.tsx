import type { JSX } from "react";
import { useState } from "react";
import type { Task, TaskContent } from "../../types";
import { TaskWeightBadge } from "./TaskWeightBadge";

export type TaskViewProps = {
    task: Task;
    handleEditTask: (task: Task) => void;
};

export function TaskView({ task, handleEditTask }: TaskViewProps): JSX.Element {
    const [item, setItem] = useState<Task>(task);

    function updateTaskDataField<K extends keyof TaskContent>(field: K, value: TaskContent[K]): void {
        const updatedItem = {
            ...item,
            data: { ...item.data, [field]: value },
        };
        setItem(updatedItem);
        handleEditTask(updatedItem);
    }

    function handleToggleComplete(): void {
        const completedAt = item.data.completedAt === undefined ? new Date().toISOString() : undefined;
        const updatedTask = { ...item, data: { ...item.data, completedAt } };
        setItem(updatedTask);
        handleEditTask(updatedTask);
    }

    return (
        <li key={item.id} className="card">
            <input type="checkbox" name="item" id={item.id} checked={item.data.completedAt !== undefined} onInput={() => handleToggleComplete()} />
            <input type="text" defaultValue={item.data.title} onInput={(e) => updateTaskDataField("title", e.currentTarget.value)} />
            <div>{item.createdAt}</div>
            <TaskWeightBadge task={item} />
        </li>
    );
}
