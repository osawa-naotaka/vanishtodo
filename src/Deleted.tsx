import { RestoreFromTrash } from "@mui/icons-material";
import { BottomNavigation, BottomNavigationAction, Box, Toolbar } from "@mui/material";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { type JSX, useRef } from "react";
import type { TaskContent } from "../type/types";
import { task_config } from "./Home";
import { Persistent, type SelectableTask } from "./layer/Broker";
import { generateLimitter } from "./layer/Business";
import { isLoginAtom, networkAtom, tasksAtom, tasksWriterAtom } from "./layer/Jotai";
import { touchItem } from "./layer/Persistent";
import { TaskList } from "./layer/Presentation/TaskList";

export function Deleted(): JSX.Element {
    const current_date = new Date().toISOString();
    const per_tasks = useRef<Persistent<TaskContent>>(new Persistent<TaskContent>(task_config));

    const [tasks, setTasks] = useAtom(tasksAtom);
    const taskWriter = useSetAtom(tasksWriterAtom);
    const isLogin = useAtomValue(isLoginAtom);
    const network = useAtomValue(networkAtom);

    function updateIsSelected(task: SelectableTask, isSelected: boolean): void {
        setTasks((prevTasks) => prevTasks.map((t) => (t.task.meta.id === task.task.meta.id ? { ...t, isSelected } : t)));
    }

    async function undeleteTask(task: SelectableTask): Promise<void> {
        const touched = touchItem<TaskContent>(task.task);
        touched.data.isDeleted = false;
        per_tasks.current.update(touched);
        taskWriter(per_tasks.current.items);
        if (isLogin) {
            const result = await network.putJson(`${task_config.api_base}/${touched.meta.id}`, touched);
            if (result.status !== "success") {
                console.error("Home: Failed to sync deleted task to server", result.error_info);
            }
        }
    }

    const { isDeleted } = generateLimitter<SelectableTask>((t) => t.task);
    const filtered_tasks = tasks.filter((t) => isDeleted(t));

    function handleChange(_event: React.SyntheticEvent, value: string): void {
        if (value === "undelete") {
            for (const item of tasks) {
                if (item.isSelected) {
                    undeleteTask(item);
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
