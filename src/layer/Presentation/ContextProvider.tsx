import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { LoginInfoContent, Task, TaskCreate, UserSetting, UserSettingContent } from "../../../type/types";
import { loginInfoContentSchema, tasksSchema, userSettingsSchema } from "../../../type/types";
import { Business } from "../Business";
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
    setUserId: (userId: string) => void;
    set: (setting: UserSettingContent) => void;
};

export const Context = createContext<ContextType | null>(null);

export function ContextProvider({ children }: { children: ReactNode }): ReactNode {
    const biz = useRef<Business>(null);
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

        const tasks_config = {
            name: "tasks",
            api_base: "/tasks",
            storage_key: "vanish-todo-tasks",
            schema: tasksSchema,
            initial_value: [],
        };

        const tp = new Persistent(n, tasks_config);
        biz.current = new Business(tp, up);
        setTasks(biz.current.tasks.map((t) => ({ task: t, isSelected: false })));
        setRawSetting(biz.current.userSettings);

        if (persistentLoginInfo.current.item.userId) {
            setUserId(persistentLoginInfo.current.item.userId);
        }
    }, []);

    useEffect(() => {
        if (userId) {
            if (biz.current) {
                biz.current.syncUserSetting((e) => {
                    if (e.status === "success") {
                        setRawSetting(e.data);
                    } else {
                        console.error(e);
                    }
                });

                biz.current.syncTask((e) => {
                    if (e.status === "success") {
                        setTasks(e.data.map((t) => ({ task: t, isSelected: false })));
                    } else {
                        console.error(e);
                    }
                });
            }
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
            setTasks(biz.current.tasks.map((t) => ({ task: t, isSelected: false })));
        }
    }

    function del(tasks: SelectableTask[]): void {
        if (biz.current) {
            for (const task of tasks) {
                if (task.isSelected) {
                    biz.current.del(task.task, (e) => {
                        console.error(e);
                    });
                }
            }
            setTasks(biz.current.tasks.map((t) => ({ task: t, isSelected: false })));
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
            setTasks(biz.current.tasks.map((t) => ({ task: t, isSelected: false })));
        }
    }

    function select(task: SelectableTask, isSelected: boolean): void {
        setTasks((prevTasks) => prevTasks.map((t) => (t.task.meta.id === task.task.meta.id ? { ...t, isSelected } : t)));
    }

    function set(setting: UserSettingContent): void {
        if (biz.current) {
            biz.current.set(setting, (e) => {
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
        <Context.Provider value={{ setting: { setting, userId, set, setUserId }, tasks: { tasks, edit, add, complete, restore, del, undelete, select } }}>
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
