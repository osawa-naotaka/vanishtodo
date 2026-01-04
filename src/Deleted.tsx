import { RestoreFromTrash } from "@mui/icons-material";
import { BottomNavigation, BottomNavigationAction, Box, Toolbar } from "@mui/material";
import type { JSX } from "react";
import { TaskList } from "./layer/Presentation/TaskList";
import { useBroker } from "./layer/Broker";
import type { SelectableTask } from "./layer/Presentation/ContextProvider";
import { generateLimitter } from "./layer/Business";

export function Deleted(): JSX.Element {
    const current_date = new Date().toISOString();
    const { broker, tasks, updateIsSelected } = useBroker();

    const { isDeleted } = generateLimitter<SelectableTask>((t) => t.task);
    const filtered_tasks = tasks.filter((t) => isDeleted(t));

    function handleChange(_event: React.SyntheticEvent, value: string): void {
        if (value === "undelete") {
            for(const item of tasks) {
                if (item.isSelected) {
                    broker.publish("undelete-task", { task: item.task });
                }
            }
        }
    }

    return (
        <Box component="main" sx={{ flexGrow: 1 }}>
            <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
            <TaskList tasks={filtered_tasks} current_date={current_date} onSelectTask={updateIsSelected} />
            <BottomNavigation showLabels onChange={handleChange}>
                <BottomNavigationAction label="元に戻す" value="undelete" icon={<RestoreFromTrash />} />
            </BottomNavigation>
        </Box>
    );
}
