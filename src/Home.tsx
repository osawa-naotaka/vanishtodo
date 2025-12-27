import { Box, Toolbar } from "@mui/material";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import type { Task, TaskCreate, Tasks, UserSetting } from "../type/types";
import { Business, filterTasks } from "./layer/Business";
import { Network } from "./layer/Network";
import { Persistent } from "./layer/Persistent";
import { BaseLayout } from "./layer/Presentation/BaseLayout";
import { EditableTaskList } from "./layer/Presentation/EditableTaskList";
import { useTaskFilter } from "./layer/Presentation/TaskFilter";
import { TaskInput } from "./layer/Presentation/TaskInput";

export function useTasks(): {
    tasks: Task[];
    setting: UserSetting | null;
    handleAddTask: (data: TaskCreate) => void;
    handleEditTask: (task: Task) => void;
    handleCompleteTask: (task: Task) => void;
} {
    const biz = useRef<Business>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [setting, setSetting] = useState<UserSetting | null>(null);

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
                if (e.status === "success") {
                    setSetting(e.data);
                } else {
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

    return { tasks, setting, handleAddTask, handleEditTask, handleCompleteTask };
}

export function Home(): JSX.Element {
    const current_date = new Date().toISOString();
    const { filter, TaskFilter } = useTaskFilter();

    const { tasks, setting, handleAddTask, handleEditTask, handleCompleteTask } = useTasks();
    const filtered_tasks: Tasks = setting ? filterTasks(current_date, filter, tasks, setting) : [];

    return (
        <BaseLayout>
            <Box component="main" sx={{ flexGrow: 1 }}>
                <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
                <TaskInput handleAddTask={handleAddTask} />
                <TaskFilter />
                <EditableTaskList tasks={filtered_tasks} current_date={current_date} handleEditTask={handleEditTask} handleCompleteTask={handleCompleteTask} />
            </Box>
        </BaseLayout>
    );
}
