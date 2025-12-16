import type { JSX } from "react";
import type { TaskState } from "../../All";
import { shortPastDate } from "../../lib/date";
import { TaskWeightBadge } from "./TaskWeightBadge";

export type TaskViewProps = {
    task: TaskState;
    current_date: string;
    handleSelectTask: () => void;
};

export function TaskViewReadOnly({ task, current_date, handleSelectTask }: TaskViewProps): JSX.Element {
    return (
        <li key={task.task.meta.id} className={`card task ${task.task.data.completedAt !== undefined ? "task-completed" : ""}`}>
            <input type="checkbox" className="task-sel" name="item" checked={task.isSelected} onChange={handleSelectTask} id={task.task.meta.id} />
            <div className="task-description">
                <div className="task-text">{task.task.data.title}</div>
                <div className="task-create-date">{shortPastDate(task.task.meta.createdAt, current_date).date}作成</div>
            </div>
            <TaskWeightBadge task={task.task} current_date={current_date} />
        </li>
    );
}
