import { Box, Toolbar } from "@mui/material";
import type { JSX } from "react";
import { useState } from "react";
import type { TaskCreate } from "../type/types";
import { generateLimitter } from "./layer/Business";
import { EditableTaskList } from "./layer/Presentation/EditableTaskList";
import type { FilterType } from "./layer/Presentation/TaskFilter";
import { TaskFilter } from "./layer/Presentation/TaskFilter";
import { TaskInput } from "./layer/Presentation/TaskInput";
import type { SelectableTask } from "./store/useTaskStore";
import { useTaskStore } from "./store/useTaskStore";

export function Home(): JSX.Element {
    const current_date = new Date().toISOString();
    const [filter, setFilter] = useState<FilterType>("all");

    const { tasks, userSetting, createTask, editTask, completeTask } = useTaskStore();

    const { tasksToday } = generateLimitter<SelectableTask>((t) => t.task);
    const filtered_tasks = tasksToday(
        current_date,
        userSetting.data.dailyGoals,
        tasks.filter(({ task }) => filter === "all" || (filter === "due-date" && task.data.weight === undefined) || task.data.weight === filter),
    );

    return (
        <Box component="main" sx={{ flexGrow: 1 }}>
            <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
            <TaskInput handleAddTask={(task: TaskCreate) => createTask(task)} userId={undefined} />
            <TaskFilter filter={filter} setFilter={setFilter} />
            <EditableTaskList
                tasks={filtered_tasks}
                current_date={current_date}
                onEditTask={(task: SelectableTask) => editTask(task.task)}
                onCompleteTask={(task: SelectableTask) => completeTask(task.task)}
            />
        </Box>
    );
}
