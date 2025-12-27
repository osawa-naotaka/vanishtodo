import { Box, Chip, Stack, Toolbar } from "@mui/material";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import type { Task, TaskCreate } from "../type/types";
import { Business } from "./layer/Business";
import { Network } from "./layer/Network";
import { Persistent } from "./layer/Persistent";
import { BaseLayout } from "./layer/Presentation/BaseLayout";
import { EditableTaskList } from "./layer/Presentation/EditableTaskList";
import { TaskInput } from "./layer/Presentation/TaskInput";

export function useTasks(): {
    tasks: Task[];
    handleAddTask: (data: TaskCreate) => void;
    handleEditTask: (task: Task) => void;
    handleCompleteTask: (task: Task) => void;
} {
    const biz = useRef<Business>(null);
    const [tasks, setTasks] = useState<Task[]>([]);

    useEffect(() => {
        const n = new Network("/api/v1");
        const p = new Persistent(n);
        biz.current = new Business(p);
        setTasks(biz.current.readTasksAll());
        biz.current.init(
            (e) => {
                if (e.status === "success") {
                    setTasks(e.data);
                } else {
                    console.error(e);
                }
            },
            (e) => {
                if (e.status !== "success") {
                    console.error(e);
                }
            },
        );
    }, []);

    function handleEditTask(task: Task): void {
        if (biz.current) {
            setTasks(
                biz.current.edit(task, (e) => {
                    console.error(e);
                }),
            );
        }
    }

    function handleAddTask(data: TaskCreate): void {
        if (biz.current) {
            setTasks(
                biz.current.create(data, (e) => {
                    console.error(e);
                }),
            );
        }
    }

    function handleCompleteTask(task: Task): void {
        if (biz.current) {
            setTasks(
                biz.current.complete(task, (e) => {
                    console.error(e);
                }),
            );
        }
    }

    return { tasks, handleAddTask, handleEditTask, handleCompleteTask };
}

export function Home(): JSX.Element {
    const current_date = new Date().toISOString();
    // const [filter, setFilter] = useState<"all" | "light" | "medium" | "heavy" | "due-date">("light");
    // const filtered_tasks = biz.current ? biz.current.filterTasks(current_date, filter, tasks, biz.current.readSetting()) : [];

    const { tasks, handleAddTask, handleEditTask, handleCompleteTask } = useTasks();

    return (
        <BaseLayout>
            <Box component="main" sx={{ flexGrow: 1 }}>
                <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
                <TaskInput handleAddTask={handleAddTask} />
                <Stack direction="row" spacing={1} sx={{ marginLeft: 3, marginBottom: 1, fontWeight: "bold" }}>
                    <Chip label="軽" color="success" sx={{ minWidth: 48 }} />
                    <Chip label="中" color="warning" variant="outlined" sx={{ minWidth: 48 }} />
                    <Chip label="重" color="error" variant="outlined" sx={{ minWidth: 48 }} />
                    <Chip label="締切" color="info" variant="outlined" sx={{ minWidth: 48 }} />
                </Stack>
                <EditableTaskList tasks={tasks} current_date={current_date} handleEditTask={handleEditTask} handleCompleteTask={handleCompleteTask} />
            </Box>
        </BaseLayout>
    );
}
