import { RestoreFromTrash } from "@mui/icons-material";
import { BottomNavigation, BottomNavigationAction, Box, Toolbar } from "@mui/material";
import type { JSX } from "react";
import { isDeleted } from "./layer/Business";
import { useBiz } from "./layer/Presentation/ContextProvider";
import { TaskList } from "./layer/Presentation/TaskList";

export function Deleted(): JSX.Element {
    const current_date = new Date().toISOString();
    const {
        tasks: { tasks, select, undelete },
    } = useBiz();
    const filtered_tasks = tasks.filter((task) => isDeleted(task.task));

    function handleChange(): void {
        undelete(tasks);
    }

    return (
        <Box component="main" sx={{ flexGrow: 1 }}>
            <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
            <TaskList tasks={filtered_tasks} current_date={current_date} onSelectTask={select} />
            <BottomNavigation showLabels onChange={handleChange}>
                <BottomNavigationAction label="元に戻す" value="undelete" icon={<RestoreFromTrash />} />
            </BottomNavigation>
        </Box>
    );
}
