import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Task, TaskCreate, UserSetting, UserSettingContent } from "../../../type/types";
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
    setting: UserSettingContent;
    userId: string;
    set: (setting: UserSettingContent) => void;
};

export const Context = createContext<ContextType | null>(null);

export function ContextProvider({ children }: { children: ReactNode }): ReactNode {
    const bizTask = useRef<BizTasks>(null);
    const bizUserSetting = useRef<BizUserSetting>(null);
    const [tasks, setTasks] = useState<SelectableTask[]>([]);
    const [raw_setting, setRawSetting] = useState<UserSetting[]>([]);

    const setting: UserSettingContent =
        raw_setting.length > 0
            ? raw_setting[0].data
            : {
                  timezone: 9,
                  email: "default@example.com",
                  dailyGoals: {
                      heavy: 1,
                      medium: 2,
                      light: 3,
                  },
              };

    const userId = raw_setting.length > 0 ? raw_setting[0].meta.id : "default-user-id";

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
        bizUserSetting.current = new BizUserSetting(p);
        setRawSetting(bizUserSetting.current.readAll());
        bizUserSetting.current.init((e) => {
            if (e.status === "success") {
                setRawSetting(e.data);
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

    function set(setting: UserSettingContent): void {
        if (bizUserSetting.current) {
            bizUserSetting.current.set(setting, (e) => {
                console.error(e);
            });
            if (raw_setting.length === 0) {
                return;
            }
            raw_setting[0].data = setting;
            setRawSetting([raw_setting[0]]);
        }
    }

    return (
        <Context.Provider value={{ setting: { setting, userId, set }, tasks: { tasks, edit, add, complete, restore, del, undelete, select } }}>
            {children}
        </Context.Provider>
    );
}

export function useBiz(): ContextType {
    const context = useContext(Context);
    if (!context) {
        throw new Error("ContextProviderが見つかりません。");
    }
    return context;
}
