import { useEffect, useRef, useState } from "react";
import { type Task, type TaskCreate, tasksSchema, type UserSetting, userSettingsSchema } from "../../../type/types";
import { BizTasks, BizUserSetting } from "../Business";
import { Network } from "../Network";
import { Persistent } from "../Persistent";

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

export function useUserSetting(): UseUserSettingHooks {
    const bizUserSetting = useRef<BizUserSetting>(null);
    const [setting, setSetting] = useState<UserSetting[]>([]);

    useEffect(() => {
        const n = new Network("/api/v1");
        const user_settings_config = {
            name: "user_settings",
            api_base: "/setting",
            storage_key: "vanish-todo-user-settings",
            schema: userSettingsSchema,
            initial_value: [
                {
                    meta: {
                        id: "",
                        version: 1,
                        createdAt: "",
                        updatedAt: "",
                    },
                    data: {
                        timezone: 9,
                        dailyGoals: {
                            heavy: 1,
                            medium: 2,
                            light: 3,
                        },
                    },
                },
            ],
        };
        const p = new Persistent(n, user_settings_config);
        bizUserSetting.current = new BizUserSetting(p);
        setSetting(bizUserSetting.current.read());
        bizUserSetting.current.init((e) => {
            if (e.status === "success") {
                setSetting(e.data);
            } else {
                console.error(e);
            }
        });
    }, []);

    return { setting };
}

export function useTasks(): UseTasksHooks {
    const bizTask = useRef<BizTasks>(null);
    const [tasks, setTasks] = useState<SelectableTask[]>([]);

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

    return { tasks, add, edit, complete, select, restore, del, undelete };
}
