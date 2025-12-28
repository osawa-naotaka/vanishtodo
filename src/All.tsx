import { BottomNavigation, BottomNavigationAction, Box, Toolbar } from "@mui/material";
import type { JSX } from "react";
import { BaseLayout } from "./layer/Presentation/BaseLayout";
import { useTasks } from "./layer/Presentation/CustomeHook";
import { TaskList } from "./layer/Presentation/TaskList";
import { Delete, Restore } from "@mui/icons-material";

export function All(): JSX.Element {
    const current_date = new Date().toISOString();
    const { tasks, handleSelectTask, handleRestoreTasks, handleDeleteTasks } = useTasks();

    function handleChange(_event: React.SyntheticEvent, value: string): void {
        if (value === "restore") {
            handleRestoreTasks(tasks);
        } else if (value === "delete") {
            handleDeleteTasks(tasks);
        }
    }

    return (
        <BaseLayout selected="all">
            <Box component="main" sx={{ flexGrow: 1 }}>
                <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
                <TaskList tasks={tasks} current_date={current_date} onSelectTask={handleSelectTask} />
                <BottomNavigation showLabels onChange={handleChange}>
                    <BottomNavigationAction label="復帰" value="restore" icon={<Restore />} />
                    <BottomNavigationAction label="削除" value="delete" icon={<Delete />} />
                </BottomNavigation>
            </Box>
        </BaseLayout>
    );
}
