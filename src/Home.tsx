import { Box, Toolbar } from "@mui/material";
import type { JSX } from "react";
import { useState } from "react";
import { filterTasks } from "./layer/Business";
import { useBiz } from "./layer/Presentation/ContextProvider";
import { EditableTaskList } from "./layer/Presentation/EditableTaskList";
import type { FilterType } from "./layer/Presentation/TaskFilter";
import { TaskFilter } from "./layer/Presentation/TaskFilter";
import { TaskInput } from "./layer/Presentation/TaskInput";

export function Home(): JSX.Element {
    const current_date = new Date().toISOString();
    const [filter, setFilter] = useState<FilterType>("all");

    const {
        setting: { setting },
        tasks: { tasks, add, edit, complete },
    } = useBiz();

    const filtered_tasks = filterTasks(current_date, filter, tasks, setting[0]);

    return (
        <Box component="main" sx={{ flexGrow: 1 }}>
            <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
            <TaskInput handleAddTask={add} />
            <TaskFilter filter={filter} setFilter={setFilter} />
            <EditableTaskList tasks={filtered_tasks} current_date={current_date} onEditTask={edit} onCompleteTask={complete} />
        </Box>
    );
}
