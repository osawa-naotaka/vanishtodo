import type { JSX } from "react";
import { useState } from "react";
import type { Task, TaskContent } from "../../types";

export type TaskViewProps = {
    initialTask: Task;
    handleEditTask: (task: Task) => void;
};

export function TaskView({ initialTask, handleEditTask }: TaskViewProps): JSX.Element {
    const [task, setTask] = useState<Task>(initialTask);

    function updateTaskDataField<K extends keyof TaskContent>(field: K, value: TaskContent[K]): void {
        const updatedTask = {
            ...task,
            data: { ...task.data, [field]: value },
        };
        setTask(updatedTask);
        handleEditTask(updatedTask);
    }

    function handleToggleComplete(): void {
        const completedAt = task.data.completedAt === undefined ? new Date().toISOString() : undefined;
        const updatedTask = { ...task, data: { ...task.data, completedAt } };
        setTask(updatedTask);
        handleEditTask(updatedTask);
    }

    return (
        <li key={task.id} className="card">
            <input
                type="checkbox"
                name="item"
                id={task.id}
                defaultChecked={task.data.completedAt !== undefined}
                checked={task.data.completedAt !== undefined}
                onInput={() => handleToggleComplete()}
            />
            <input type="text" defaultValue={task.data.title} onInput={(e) => updateTaskDataField("title", e.currentTarget.value)} />
        </li>
    );
}
