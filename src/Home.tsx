import { Box, Toolbar } from "@mui/material";
import type { JSX } from "react";
import { useState } from "react";
import type { TaskCreate } from "../type/types";
import type { SelectableTask } from "./layer/Broker";
import { useBroker } from "./layer/Broker";
import { generateLimitter } from "./layer/Business";
import { EditableTaskList } from "./layer/Presentation/EditableTaskList";
import type { FilterType } from "./layer/Presentation/TaskFilter";
import { TaskFilter } from "./layer/Presentation/TaskFilter";
import { TaskInput } from "./layer/Presentation/TaskInput";

export function Home(): JSX.Element {
    const current_date = new Date().toISOString();
    const [filter, setFilter] = useState<FilterType>("all");

    const {
        broker: [pub],
        userSetting,
        tasks,
    } = useBroker();

    const { tasksToday } = generateLimitter<SelectableTask>((t) => t.task);
    const filtered_tasks = tasksToday(
        current_date,
        userSetting.data.dailyGoals,
        tasks.filter(({ task }) => filter === "all" || (filter === "due-date" && task.data.weight === undefined) || task.data.weight === filter),
    );

    return (
        <Box component="main" sx={{ flexGrow: 1 }}>
            <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
            <TaskInput handleAddTask={(task: TaskCreate) => pub("create-task", { task })} userId={undefined} />
            <TaskFilter filter={filter} setFilter={setFilter} />
            <EditableTaskList
                tasks={filtered_tasks}
                current_date={current_date}
                onEditTask={(task: SelectableTask) => pub("edit-task", { task: task.task })}
                onCompleteTask={(task: SelectableTask) => pub("complete-task", { task: task.task })}
            />
        </Box>
    );
}
