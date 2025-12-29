import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Task, TaskCreate, UserSetting } from "../../../type/types";
import { tasksSchema, userSettingsSchema } from "../../../type/types";
import { BizTasks, BizUserSetting } from "../Business";
import { Network } from "../Network";
import { Persistent } from "../Persistent";

export type ContextType = {
    setting: UseUserSettingHooks;
    tasks: UseTasksHooks;
};

export type SelectableTask = {
    task: Task;
    isSelected: boolean;
};

export type UseTasksHooks = {
    tasks: SelectableTask[];
    add: (data: TaskCreate) => void;
    edit: (task: SelectableTask) => void;
    complete: (task: SelectableTask) => void;
    select: (task: SelectableTask, isSelected: boolean) => void;
    restore: (tasks: SelectableTask[]) => void;
    del: (tasks: SelectableTask[]) => void;
    undelete: (tasks: SelectableTask[]) => void;
};

export type UseUserSettingHooks = {
    setting: UserSetting[];
};

export const Context = createContext<ContextType | null>(null);

export function ContextProvider({ children }: { children: ReactNode }): ReactNode {
    const bizTask = useRef<BizTasks>(null);
    const [tasks, setTasks] = useState<SelectableTask[]>([]);
    const [setting, setSetting] = useState<UserSetting[]>([]);

    useEffect(() => {
        const n = new Network("/api/v1");
        const user_settings_config = {
            name: "user_settings",
            api_base: "/setting",
            storage_key: "vanish-todo-user-settings",
            schema: userSettingsSchema,
            initial_value: [],
        };
        const p = new Persistent(n, user_settings_config);
        const bizUserSetting = new BizUserSetting(p);
        setSetting(bizUserSetting.readAll());
        bizUserSetting.init((e) => {
            if (e.status === "success") {
                setSetting(e.data);
            } else {
                console.error(e);
            }
        });
    }, []);

    useEffect(() => {
        const n = new Network("/api/v1");
        const tasks_config = {
            name: "tasks",
            api_base: "/tasks",
            storage_key: "vanish-todo-tasks",
            schema: tasksSchema,
            initial_value: [],
        };

        const p = new Persistent(n, tasks_config);
        bizTask.current = new BizTasks(p);
        setTasks(bizTask.current.readAll().map((t) => ({ task: t, isSelected: false })));
        bizTask.current.init((e) => {
            if (e.status === "success") {
                setTasks(e.data.map((t) => ({ task: t, isSelected: false })));
            } else {
                console.error(e);
            }
        });
    }, []);

    function edit(task: SelectableTask): void {
        if (bizTask.current) {
            const tasks = bizTask.current.edit(task.task, (e) => {
                console.error(e);
            });

            setTasks(tasks.map((t) => ({ task: t, isSelected: false })));
        }
    }

    function add(data: TaskCreate): void {
        if (bizTask.current) {
            const tasks = bizTask.current.create(data, (e) => {
                console.error(e);
            });

            setTasks(tasks.map((t) => ({ task: t, isSelected: false })));
        }
    }

    function complete(task: SelectableTask): void {
        if (bizTask.current) {
            const tasks = bizTask.current.complete(task.task, (e) => {
                console.error(e);
            });

            setTasks(tasks.map((t) => ({ task: t, isSelected: false })));
        }
    }

    function restore(tasks: SelectableTask[]): void {
        if (bizTask.current) {
            for (const task of tasks) {
                if (task.isSelected) {
                    bizTask.current.restore(task.task, (e) => {
                        console.error(e);
                    });
                }
            }
            setTasks(bizTask.current.readAll().map((t) => ({ task: t, isSelected: false })));
        }
    }

    function del(tasks: SelectableTask[]): void {
        if (bizTask.current) {
            for (const task of tasks) {
                if (task.isSelected) {
                    bizTask.current.del(task.task, (e) => {
                        console.error(e);
                    });
                }
            }
            setTasks(bizTask.current.readAll().map((t) => ({ task: t, isSelected: false })));
        }
    }

    function undelete(tasks: SelectableTask[]): void {
        if (bizTask.current) {
            for (const task of tasks) {
                if (task.isSelected) {
                    bizTask.current.undelete(task.task, (e) => {
                        console.error(e);
                    });
                }
            }
            setTasks(bizTask.current.readAll().map((t) => ({ task: t, isSelected: false })));
        }
    }

    function select(task: SelectableTask, isSelected: boolean): void {
        setTasks((prevTasks) => prevTasks.map((t) => (t.task.meta.id === task.task.meta.id ? { ...t, isSelected } : t)));
    }

    return (
        <Context.Provider value={{ setting: { setting }, tasks: { tasks, edit, add, complete, restore, del, undelete, select } }}>{children}</Context.Provider>
    );
}

export function useBiz(): ContextType {
    const context = useContext(Context);
    if (!context) {
        throw new Error("ContextProviderが見つかりません。");
    }
    return context;
}
