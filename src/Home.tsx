import { Box, Toolbar } from "@mui/material";
import type { JSX } from "react";
import { useState } from "react";
import { filterTasks } from "./layer/Business";
import { BaseLayout } from "./layer/Presentation/BaseLayout";
import { useTasks } from "./layer/Presentation/CustomeHook";
import { EditableTaskList } from "./layer/Presentation/EditableTaskList";
import type { FilterType } from "./layer/Presentation/TaskFilter";
import { TaskFilter } from "./layer/Presentation/TaskFilter";
import { TaskInput } from "./layer/Presentation/TaskInput";

export function Home(): JSX.Element {
    const current_date = new Date().toISOString();
    const [filter, setFilter] = useState<FilterType>("all");

    const { tasks, setting, handleAddTask, handleEditTask, handleCompleteTask } = useTasks();
    const filtered_tasks = setting ? filterTasks(current_date, filter, tasks, setting) : [];

    return (
        <BaseLayout selected="home">
            <Box component="main" sx={{ flexGrow: 1 }}>
                <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
                <TaskInput handleAddTask={handleAddTask} />
                <TaskFilter filter={filter} setFilter={setFilter} />
                <EditableTaskList tasks={filtered_tasks} current_date={current_date} onEditTask={handleEditTask} onCompleteTask={handleCompleteTask} />
            </Box>
        </BaseLayout>
    );
}
