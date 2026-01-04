import { Delete, Restore } from "@mui/icons-material";
import { BottomNavigation, BottomNavigationAction, Box, Toolbar } from "@mui/material";
import type { JSX } from "react";
import type { SelectableTask } from "./layer/Broker";
import { useBroker } from "./layer/Broker";
import { generateLimitter } from "./layer/Business";
import { TaskList } from "./layer/Presentation/TaskList";

export function All(): JSX.Element {
    const current_date = new Date().toISOString();
    const { broker, tasks, updateIsSelected } = useBroker();

    const { isDeleted } = generateLimitter<SelectableTask>((t) => t.task);

    const filtered_tasks = tasks.filter((t) => !isDeleted(t));

    function handleChange(_event: React.SyntheticEvent, value: string): void {
        if (value === "restore") {
            for (const item of tasks) {
                if (item.isSelected) {
                    broker.publish("uncomplete-task", { task: item.task });
                }
            }
        } else if (value === "delete") {
            for (const item of tasks) {
                if (item.isSelected) {
                    broker.publish("delete-task", { task: item.task });
                }
            }
        }
    }

    return (
        <Box component="main" sx={{ flexGrow: 1 }}>
            <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
            <TaskList tasks={filtered_tasks} current_date={current_date} onSelectTask={updateIsSelected} />
            <BottomNavigation showLabels onChange={handleChange}>
                <BottomNavigationAction label="復帰" value="restore" icon={<Restore />} />
                <BottomNavigationAction label="削除" value="delete" icon={<Delete />} />
            </BottomNavigation>
        </Box>
    );
}
