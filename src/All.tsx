import { Delete, Restore } from "@mui/icons-material";
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

export function All(): JSX.Element {
    const current_date = new Date().toISOString();
    const per_tasks = useRef<Persistent<TaskContent>>(new Persistent<TaskContent>(task_config));

    const [tasks, setTasks] = useAtom(tasksAtom);
    const taskWriter = useSetAtom(tasksWriterAtom);
    const isLogin = useAtomValue(isLoginAtom);
    const network = useAtomValue(networkAtom);
    const { isDeleted } = generateLimitter<SelectableTask>((t) => t.task);

    const filtered_tasks = tasks.filter((t) => !isDeleted(t));

    function updateIsSelected(task: SelectableTask, isSelected: boolean): void {
        setTasks((prevTasks) => prevTasks.map((t) => (t.task.meta.id === task.task.meta.id ? { ...t, isSelected } : t)));
    }

    async function uncompleteTask(task: SelectableTask): Promise<void> {
        const touched = touchItem<TaskContent>(task.task);
        touched.data.completedAt = undefined;
        per_tasks.current.update(touched);
        taskWriter(per_tasks.current.items);
        if (isLogin) {
            const result = await network.putJson(`${task_config.api_base}/${touched.meta.id}`, touched);
            if (result.status !== "success") {
                console.error("Home: Failed to sync uncompleted task to server", result.error_info);
            }
        }
    }

    async function deleteTask(task: SelectableTask): Promise<void> {
        const touched = touchItem<TaskContent>(task.task);
        touched.data.isDeleted = true;
        per_tasks.current.update(touched);
        taskWriter(per_tasks.current.items);
        if (isLogin) {
            const result = await network.putJson(`${task_config.api_base}/${touched.meta.id}`, touched);
            if (result.status !== "success") {
                console.error("Home: Failed to sync deleted task to server", result.error_info);
            }
        }
    }

    function handleChange(_event: React.SyntheticEvent, value: string): void {
        if (value === "restore") {
            for (const item of tasks) {
                if (item.isSelected) {
                    uncompleteTask(item);
                }
            }
        } else if (value === "delete") {
            for (const item of tasks) {
                if (item.isSelected) {
                    deleteTask(item);
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
