import { useEffect, useRef, useState } from "react";
import type { Task, TaskCreate, UserSetting } from "../../../type/types";
import { BizTasks } from "../Business";
import { Network } from "../Network";
import { Persistent } from "../Persistent";

export type SelectableTask = {
    task: Task;
    isSelected: boolean;
};

export type UseTasksHooks = {
    tasks: SelectableTask[];
    setting: UserSetting | null;
    add: (data: TaskCreate) => void;
    edit: (task: SelectableTask) => void;
    complete: (task: SelectableTask) => void;
    select: (task: SelectableTask, isSelected: boolean) => void;
    restore: (tasks: SelectableTask[]) => void;
    del: (tasks: SelectableTask[]) => void;
    undelete: (tasks: SelectableTask[]) => void;
};

export function useTasks(): UseTasksHooks {
    const biz = useRef<BizTasks>(null);
    const [tasks, setTasks] = useState<SelectableTask[]>([]);
    const [setting, setSetting] = useState<UserSetting | null>(null);

    useEffect(() => {
        const n = new Network("/api/v1");
        const p = new Persistent(n);
        biz.current = new BizTasks(p);
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

    function edit(task: SelectableTask): void {
        if (biz.current) {
            const tasks = biz.current.edit(task.task, (e) => {
                console.error(e);
            });

            setTasks(tasks.map((t) => ({ task: t, isSelected: false })));
        }
    }

    function add(data: TaskCreate): void {
        if (biz.current) {
            const tasks = biz.current.create(data, (e) => {
                console.error(e);
            });

            setTasks(tasks.map((t) => ({ task: t, isSelected: false })));
        }
    }

    function complete(task: SelectableTask): void {
        if (biz.current) {
            const tasks = biz.current.complete(task.task, (e) => {
                console.error(e);
            });

            setTasks(tasks.map((t) => ({ task: t, isSelected: false })));
        }
    }

    function restore(tasks: SelectableTask[]): void {
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

    function del(tasks: SelectableTask[]): void {
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

    function undelete(tasks: SelectableTask[]): void {
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

    function select(task: SelectableTask, isSelected: boolean): void {
        setTasks((prevTasks) => prevTasks.map((t) => (t.task.meta.id === task.task.meta.id ? { ...t, isSelected } : t)));
    }

    return { tasks, setting, add, edit, complete, select, restore, del, undelete };
}
