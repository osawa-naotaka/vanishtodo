import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { LoginInfoContent, Task, TaskCreate, UserSetting, UserSettingContent } from "../../../type/types";
import { loginInfoContentSchema, tasksSchema, userSettingsSchema } from "../../../type/types";
import { BizTasks, BizUserSetting } from "../Business";
import { Network } from "../Network";
import { LocalStorage, Persistent } from "../Persistent";

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
    userId?: string;
    set: (setting: UserSettingContent) => void;
};

export const Context = createContext<ContextType | null>(null);

export function ContextProvider({ children }: { children: ReactNode }): ReactNode {
    const bizTask = useRef<BizTasks>(null);
    const bizUserSetting = useRef<BizUserSetting>(null);
    const persistentLoginInfo = useRef<LocalStorage<LoginInfoContent>>(null);
    const [tasks, setTasks] = useState<SelectableTask[]>([]);
    const [raw_setting, setRawSetting] = useState<UserSetting[]>([]);
    const [userId, setUserId] = useState<string | undefined>(undefined);

    useEffect(() => {
        persistentLoginInfo.current = new LocalStorage<LoginInfoContent>({
            name: "login_info",
            api_base: "",
            storage_key: "vanish-todo-login-info",
            schema: loginInfoContentSchema,
            initial_value: {},
        });

        const n = new Network("/api/v1");

        const user_settings_config = {
            name: "user_settings",
            api_base: "/setting",
            storage_key: "vanish-todo-user-settings",
            schema: userSettingsSchema,
            initial_value: [],
        };
        const up = new Persistent(n, user_settings_config);
        bizUserSetting.current = new BizUserSetting(up);
        setRawSetting(bizUserSetting.current.readAll());

        const tasks_config = {
            name: "tasks",
            api_base: "/tasks",
            storage_key: "vanish-todo-tasks",
            schema: tasksSchema,
            initial_value: [],
        };

        const tp = new Persistent(n, tasks_config);
        bizTask.current = new BizTasks(tp);
        setTasks(bizTask.current.readAll().map((t) => ({ task: t, isSelected: false })));

        if(persistentLoginInfo.current.item.userId) {
            setUserId(persistentLoginInfo.current.item.userId);
        }
    }, [userId]);

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
