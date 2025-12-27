import { useEffect, useRef, useState } from "react";
import type { Task, TaskCreate, UserSetting } from "../../../type/types";
import { Business } from "../Business";
import { Network } from "../Network";
import { Persistent } from "../Persistent";

export type UseTasksHooks = {
    tasks: Task[];
    setting: UserSetting | null;
    handleAddTask: (data: TaskCreate) => void;
    handleEditTask: (task: Task) => void;
    handleCompleteTask: (task: Task) => void;
};

export function useTasks(): UseTasksHooks {
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
