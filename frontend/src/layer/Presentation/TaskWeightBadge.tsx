import type { JSX } from "react";
import { shortFutureDate } from "../../lib/date";
import type { Task, TaskWeight } from "../../types";

export type TaskWeightBadgeProps = {
    task: Task;
    current_date: string;
};

export function TaskWeightBadge({ task, current_date }: TaskWeightBadgeProps): JSX.Element {
    if (task.data.weight === undefined && task.data.dueDate === undefined) throw new Error("TaskWeightBadge requires task with weight or dueDate");
    if (task.data.weight !== undefined && task.data.dueDate !== undefined)
        throw new Error("TaskWeightBadge requires task with either weight or dueDate, not both");
    const weight_labels: Record<TaskWeight, string> = {
        light: "軽",
        medium: "中",
        heavy: "重",
    } as const;
    const badge_text = task.data.weight
        ? weight_labels[task.data.weight]
        : task.data.dueDate
          ? `締切: ${shortFutureDate(task.data.dueDate, current_date).date}`
          : "";
    return <span>{badge_text}</span>;
}
