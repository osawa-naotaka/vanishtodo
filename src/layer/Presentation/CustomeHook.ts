import { useEffect, useRef, useState } from "react";
import type { Task, TaskCreate, UserSetting } from "../../../type/types";
import { Business } from "../Business";
import { Network } from "../Network";
import { Persistent } from "../Persistent";

export type SelectableTask = {
    task: Task;
    isSelected: boolean;
};

export type UseTasksHooks = {
    tasks: SelectableTask[];
    setting: UserSetting | null;
    handleAddTask: (data: TaskCreate) => void;
    handleEditTask: (task: SelectableTask) => void;
    handleCompleteTask: (task: SelectableTask) => void;
    handleSelectTask: (task: SelectableTask, isSelected: boolean) => void;
    handleRestoreTasks: (tasks: SelectableTask[]) => void;
    handleDeleteTasks: (tasks: SelectableTask[]) => void;
    handleUndeleteTasks: (tasks: SelectableTask[]) => void;
};

export function useTasks(): UseTasksHooks {
    const biz = useRef<Business>(null);
    const [tasks, setTasks] = useState<SelectableTask[]>([]);
    const [setting, setSetting] = useState<UserSetting | null>(null);

    useEffect(() => {
        const n = new Network("/api/v1");
        const p = new Persistent(n);
        biz.current = new Business(p);
        setTasks(biz.current.readTasksAll().map((t) => ({ task: t, isSelected: false })));
        biz.current.init(
            (e) => {
                if (e.status === "success") {
                    setTasks(e.data.map((t) => ({ task: t, isSelected: false })));
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

    function handleEditTask(task: SelectableTask): void {
        if (biz.current) {
            const tasks = biz.current.edit(task.task, (e) => {
                console.error(e);
            });

            setTasks(tasks.map((t) => ({ task: t, isSelected: false })));
        }
    }

    function handleAddTask(data: TaskCreate): void {
        if (biz.current) {
            const tasks = biz.current.create(data, (e) => {
                console.error(e);
            });

            setTasks(tasks.map((t) => ({ task: t, isSelected: false })));
        }
    }

    function handleCompleteTask(task: SelectableTask): void {
        if (biz.current) {
            const tasks = biz.current.complete(task.task, (e) => {
                console.error(e);
            });

            setTasks(tasks.map((t) => ({ task: t, isSelected: false })));
        }
    }

    function handleRestoreTasks(tasks: SelectableTask[]): void {
        if (biz.current) {
            for (const task of tasks) {
                if (task.isSelected) {
                    biz.current.restore(task.task, (e) => {
                        console.error(e);
                    });
                }
            }
            setTasks(biz.current.readTasksAll().map((t) => ({ task: t, isSelected: false })));
        }
    }

    function handleDeleteTasks(tasks: SelectableTask[]): void {
        if (biz.current) {
            for (const task of tasks) {
                if (task.isSelected) {
                    biz.current.delete(task.task, (e) => {
                        console.error(e);
                    });
                }
            }
            setTasks(biz.current.readTasksAll().map((t) => ({ task: t, isSelected: false })));
        }
    }

    function handleUndeleteTasks(tasks: SelectableTask[]): void {
        if (biz.current) {
            for (const task of tasks) {
                if (task.isSelected) {
                    biz.current.undelete(task.task, (e) => {
                        console.error(e);
                    });
                }
            }
            setTasks(biz.current.readTasksAll().map((t) => ({ task: t, isSelected: false })));
        }
    }

    function handleSelectTask(task: SelectableTask, isSelected: boolean): void {
        setTasks((prevTasks) => prevTasks.map((t) => (t.task.meta.id === task.task.meta.id ? { ...t, isSelected } : t)));
    }

    return { tasks, setting, handleAddTask, handleEditTask, handleCompleteTask, handleSelectTask, handleRestoreTasks, handleDeleteTasks, handleUndeleteTasks };
}
