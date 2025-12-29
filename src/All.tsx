import { Delete, Restore } from "@mui/icons-material";
import { BottomNavigation, BottomNavigationAction, Box, Toolbar } from "@mui/material";
import type { JSX } from "react";
import { isDeleted } from "./layer/Business";
import { useBiz } from "./layer/Presentation/ContextProvider";
import { TaskList } from "./layer/Presentation/TaskList";

export function All(): JSX.Element {
    const current_date = new Date().toISOString();
    const {
        tasks: { tasks, restore, del, select },
    } = useBiz();

    const filtered_tasks = tasks.filter((t) => !isDeleted(t.task));

    function handleChange(_event: React.SyntheticEvent, value: string): void {
        if (value === "restore") {
            restore(tasks);
        } else if (value === "delete") {
            del(tasks);
        }
    }

    return (
        <Box component="main" sx={{ flexGrow: 1 }}>
            <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
            <TaskList tasks={filtered_tasks} current_date={current_date} onSelectTask={select} />
            <BottomNavigation showLabels onChange={handleChange}>
                <BottomNavigationAction label="復帰" value="restore" icon={<Restore />} />
                <BottomNavigationAction label="削除" value="delete" icon={<Delete />} />
            </BottomNavigation>
        </Box>
    );
}
