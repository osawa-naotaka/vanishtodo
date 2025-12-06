import type { JSX } from "react";
import type { Task, TaskWeight } from "../../types";

export type TaskWeightBadgeProps = {
    task: Task;
}

export function TaskWeightBadge({ task }: TaskWeightBadgeProps): JSX.Element {
    if (task.data.weight === undefined && task.data.dueDate === undefined) throw new Error("TaskWeightBadge requires task with weight or dueDate");
    if (task.data.weight !== undefined && task.data.dueDate !== undefined) throw new Error("TaskWeightBadge requires task with either weight or dueDate, not both");
    const weight_labels: Record<TaskWeight, string> = {
        light: "軽",
        medium: "中",
        heavy: "重",
    } as const;
    const badge_text = task.data.weight ? weight_labels[task.data.weight] : 
                       task.data.dueDate ? `締切:${shortDate(task.data.dueDate)}` : "";
    return (
        <span>
            {badge_text}
        </span>
    );
}

function shortDate(dateString: string): string {
    const date = new Date(resetTimeWithTimezone(dateString));
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const today = new Date(resetTimeWithTimezone(new Date().toISOString()));

    const remains = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (remains <= 0) {
        return `!!${month}/${day}`;
    } else if (date.getFullYear() !== today.getFullYear()) {
        return `${date.getFullYear()}/${month}/${day}`;
    } else if (remains === 1) {
        return "明日";
    } else if (remains === 2) {
        return "明後日";
    } else if (remains < 7) {
        return `あと${remains}日`;
    } else if (date.getMonth() === today.getMonth() && date.getDate() === today.getDate()) {
        return "今日";
    }
    return `${month}/${day}`;
}

function resetTimeWithTimezone(dateString: string): string {
  const offset = dateString.match(/([+-]\d{2}:\d{2}|Z)$/)?.[1] || 'Z';
  const datePart = dateString.split('T')[0];

  return `${datePart}T00:00:00.000${offset}`;
}