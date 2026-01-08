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
    auth: UseAuthHooks;
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
    set: (setting: UserSettingContent) => void;
};

export type UseAuthHooks = {
    userId?: string;
    login: (email: string) => void;
    auth: (token: string, onSuccess: () => void) => void;
};

export const Context = createContext<ContextType | null>(null);

export function ContextProvider({ children }: { children: ReactNode }): ReactNode {
    const lp = new LocalStorage<LoginInfoContent>({
        name: "login_info",
        api_base: "/auth",
        storage_key: "vanish-todo-login-info",
        schema: loginInfoContentSchema,
        initial_value: { isLogin: false },
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

    const biz = useRef<Business>(new Business(tp, up, lp, n));
    const [tasks, setTasks] = useState<SelectableTask[]>([]);
    const [raw_setting, setRawSetting] = useState<UserSetting[]>([]);
    const [userId, setUserId] = useState<string | undefined>(undefined);

    useEffect(() => {
        setTasks(biz.current.tasks.map((t) => ({ task: t, isSelected: false })));
        setRawSetting(biz.current.userSettings);

        if (biz.current.loginInfo.userId) {
            setUserId(biz.current.loginInfo.userId);
        }
    }, []);

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
        const tasks = biz.current.edit(task.task, (e) => {
            console.error(e);
        });

        setTasks(tasks.map((t) => ({ task: t, isSelected: false })));
    }

    function add(data: TaskCreate): void {
        const tasks = biz.current.create(data, (e) => {
            console.error(e);
        });

        setTasks(tasks.map((t) => ({ task: t, isSelected: false })));
    }

    function complete(task: SelectableTask): void {
        const tasks = biz.current.complete(task.task, (e) => {
            console.error(e);
        });

        setTasks(tasks.map((t) => ({ task: t, isSelected: false })));
    }

    function restore(tasks: SelectableTask[]): void {
        for (const task of tasks) {
            if (task.isSelected) {
                biz.current.restore(task.task, (e) => {
                    console.error(e);
                });
            }
        }
        setTasks(biz.current.tasks.map((t) => ({ task: t, isSelected: false })));
    }

    function del(tasks: SelectableTask[]): void {
        for (const task of tasks) {
            if (task.isSelected) {
                biz.current.del(task.task, (e) => {
                    console.error(e);
                });
            }
        }
        setTasks(biz.current.tasks.map((t) => ({ task: t, isSelected: false })));
    }

    function undelete(tasks: SelectableTask[]): void {
        for (const task of tasks) {
            if (task.isSelected) {
                biz.current.undelete(task.task, (e) => {
                    console.error(e);
                });
            }
        }
        setTasks(biz.current.tasks.map((t) => ({ task: t, isSelected: false })));
    }

    function select(task: SelectableTask, isSelected: boolean): void {
        setTasks((prevTasks) => prevTasks.map((t) => (t.task.meta.id === task.task.meta.id ? { ...t, isSelected } : t)));
    }

    function set(setting: UserSettingContent): void {
        biz.current.set(setting, (e) => {
            console.error(e);
        });
        if (raw_setting.length === 0) {
            return;
        }
        raw_setting[0].data = setting;
        setRawSetting([raw_setting[0]]);
    }

    function login(email: string): void {
        biz.current.requestLogin(email);
    }

    function auth(token: string, onSuccess: () => void): void {
        biz.current.authenticate(
            token,
            (tasks) => {
                if (tasks.status === "success") {
                    setTasks(tasks.data.map((t) => ({ task: t, isSelected: false })));
                    onSuccess(); // ad-hock. fix it.
                } else {
                    console.error(tasks);
                }
            },
            (settings) => {
                if (settings.status === "success") {
                    setRawSetting(settings.data);
                } else {
                    console.error(settings);
                }
            },
        );
    }

    return (
        <Context.Provider
            value={{ setting: { setting, set }, tasks: { tasks, edit, add, complete, restore, del, undelete, select }, auth: { login, auth, userId } }}
        >
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
