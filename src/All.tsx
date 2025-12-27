import { Box, Toolbar } from "@mui/material";
import type { JSX } from "react";
import { useTasks } from "./Home";
import { BaseLayout } from "./layer/Presentation/BaseLayout";
import { TaskList } from "./layer/Presentation/TaskList";

export function All(): JSX.Element {
    const current_date = new Date().toISOString();
    const { tasks } = useTasks();

    return (
        <BaseLayout>
            <Box component="main" sx={{ flexGrow: 1 }}>
                <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
                <TaskList tasks={tasks} current_date={current_date} />
            </Box>
        </BaseLayout>
    );
}
