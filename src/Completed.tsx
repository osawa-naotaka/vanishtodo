import { Delete, Restore } from "@mui/icons-material";
import { BottomNavigation, BottomNavigationAction, Box, Toolbar } from "@mui/material";
import type { JSX } from "react";
import { filterCompletedTasks } from "./layer/Business";
import { BaseLayout } from "./layer/Presentation/BaseLayout";
import { useTasks } from "./layer/Presentation/CustomeHook";
import { TaskList } from "./layer/Presentation/TaskList";

export function Completed(): JSX.Element {
    const current_date = new Date().toISOString();
    const { tasks, select, restore, del } = useTasks();
    const filtered_tasks = filterCompletedTasks(tasks);

    function handleChange(_event: React.SyntheticEvent, value: string): void {
        if (value === "restore") {
            restore(tasks);
        } else if (value === "delete") {
            del(tasks);
        }
    }

    return (
        <BaseLayout selected="completed">
            <Box component="main" sx={{ flexGrow: 1 }}>
                <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
                <TaskList tasks={filtered_tasks} current_date={current_date} onSelectTask={select} />
                <BottomNavigation showLabels onChange={handleChange}>
                    <BottomNavigationAction label="復帰" value="restore" icon={<Restore />} />
                    <BottomNavigationAction label="削除" value="delete" icon={<Delete />} />
                </BottomNavigation>
            </Box>
        </BaseLayout>
    );
}
