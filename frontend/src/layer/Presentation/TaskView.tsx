import type { JSX } from "react";
import { useState } from "react";
import { shortPastDate } from "../../lib/date";
import type { Task, TaskContent } from "../../types";
import { TaskWeightBadge } from "./TaskWeightBadge";

export type TaskViewProps = {
    task: Task;
    current_date: string;
    handleEditTask: (task: Task) => void;
};

export function TaskView({ task, current_date, handleEditTask }: TaskViewProps): JSX.Element {
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
        <li key={item.meta.id} className="card task">
            <input type="checkbox" name="item" id={item.meta.id} checked={item.data.completedAt !== undefined} onChange={() => handleToggleComplete()} />
            <div className="task-text">
                <input type="text" defaultValue={item.data.title} onInput={(e) => updateTaskDataField("title", e.currentTarget.value)} />
                <div className="task-create-date">{shortPastDate(item.meta.createdAt, current_date).date}作成</div>
            </div>
            <TaskWeightBadge task={item} current_date={current_date} />
        </li>
    );
}
