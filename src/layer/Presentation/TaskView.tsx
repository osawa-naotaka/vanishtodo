import type { JSX } from "react";
import type { Task, TaskContent } from "../../../type/types";
import { shortPastDate } from "../../lib/date";
import { TaskWeightBadge } from "./TaskWeightBadge";

export type TaskViewProps = {
    task: Task;
    current_date: string;
    handleEditTask: (task: Task) => void;
};

export function TaskView({ task, current_date, handleEditTask }: TaskViewProps): JSX.Element {
    function updateTaskDataField<K extends keyof TaskContent>(field: K, value: TaskContent[K]): void {
        const updatedItem = {
            ...task,
            data: { ...task.data, [field]: value },
        };
        handleEditTask(updatedItem);
    }

    function handleToggleComplete(): void {
        const completedAt = task.data.completedAt === undefined ? new Date().toISOString() : undefined;
        const updatedTask = { ...task, data: { ...task.data, completedAt } };
        handleEditTask(updatedTask);
    }

    return (
        <li key={task.meta.id} className="card task">
            <input
                type="checkbox"
                className="task-is-complete"
                name="item"
                id={task.meta.id}
                checked={task.data.completedAt !== undefined}
                onChange={() => handleToggleComplete()}
            />
            <div className="task-description">
                <input type="text" className="task-text" defaultValue={task.data.title} onInput={(e) => updateTaskDataField("title", e.currentTarget.value)} />
                <div className="task-create-date">{shortPastDate(task.meta.createdAt, current_date).date}作成</div>
            </div>
            <TaskWeightBadge task={task} current_date={current_date} />
        </li>
    );
}
