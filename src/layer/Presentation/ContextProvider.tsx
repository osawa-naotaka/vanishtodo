import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { LoginInfoContent, Task, TaskCreate, UserSetting, UserSettingContent } from "../../../type/types";
import { loginInfoContentSchema, tasksSchema, userSettingSchema } from "../../../type/types";
import { Business } from "../Business";
import { Network } from "../Network";
import { LocalStorage, Persistent, type PersistentContentConfig } from "../Persistent";

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
    setting: UserSetting;
    set: (setting: UserSettingContent) => void;
};

export type UseAuthHooks = {
    userId?: string;
    login: (email: string) => void;
    auth: (token: string, onSuccess: () => void) => void;
};

export const Context = createContext<ContextType | null>(null);

const default_use_setting: UserSetting = {
    meta: {
        id: "unknown",
        version: 1,
        createdAt: "1970-01-01T00:00:00.000Z",
        updatedAt: "1970-01-01T00:00:00.000Z",
    },
    data: {
        timezone: 9,
        email: "vanishtodo@lulliecat.com",
        dailyGoals: {
            heavy: 1,
            medium: 2,
            light: 3,
        },
    },
};

export function ContextProvider({ children }: { children: ReactNode }): ReactNode {
    const lp = new LocalStorage<LoginInfoContent>({
        name: "login_info",
        api_base: "/auth",
        storage_key: "vanish-todo-login-info",
        schema: loginInfoContentSchema,
        initial_value: { isLogin: false },
    });

    const n = new Network("/api/v1");

    const user_setting_config: PersistentContentConfig<UserSetting> = {
        name: "user_setting",
        api_base: "/setting",
        storage_key: "vanish-todo-user-settings",
        schema: userSettingSchema,
        initial_value: default_use_setting,
    };

    const tasks_config: PersistentContentConfig<Task[]> = {
        name: "tasks",
        api_base: "/tasks",
        storage_key: "vanish-todo-tasks",
        schema: tasksSchema,
        initial_value: [],
    };

    const p = new Persistent(n, tasks_config, user_setting_config);

    const biz = useRef<Business>(new Business(p, lp, n));
    const [tasks, setTasks] = useState<SelectableTask[]>([]);
    const [setting, setSetting] = useState<UserSetting>(default_use_setting);
    const [userId, setUserId] = useState<string | undefined>(undefined);

    useEffect(() => {
        setTasks(biz.current.tasks.map((t) => ({ task: t, isSelected: false })));
        setSetting(biz.current.setting);

        if (biz.current.loginInfo.userId) {
            setUserId(biz.current.loginInfo.userId);
        }
    }, []);

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
        setSetting(biz.current.setting);
    }

    function login(email: string): void {
        biz.current.requestLogin(email);
    }

    function auth(token: string, onSuccess: () => void): void {
        biz.current.authenticate(token, (result) => {
            if (result.status === "success") {
                setTasks(result.data.tasks.map((t) => ({ task: t, isSelected: false })));
                setSetting(result.data.setting);
                if (biz.current.loginInfo.userId) {
                    setUserId(biz.current.loginInfo.userId);
                }
                onSuccess();
            } else {
                console.error(result);
            }
        });
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
