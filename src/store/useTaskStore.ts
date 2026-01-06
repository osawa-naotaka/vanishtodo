import { create } from "zustand";
import type { ApiErrorInfo, Container, Task, TaskContent, TaskCreate, UserSetting, UserSettingContent } from "../../type/types";
import { apiAuthSuccessSchema, apiVoidSchema, tasksSchema, userSettingSchema } from "../../type/types";
import { generateItem, LocalStorage, touchItem } from "../layer/Persistent";
import type { PersistentContentConfig } from "../layer/Persistent";
import { Network } from "../layer/Network";

// -----------------------------------------------------------------------------
// Zustand Store型定義
// -----------------------------------------------------------------------------

export type SelectableTask = {
    task: Task;
    isSelected: boolean;
};

type TaskStore = {
    // State
    tasks: SelectableTask[];
    userSetting: UserSetting;
    isLogin: boolean;

    // Persistent層とNetwork層の実体
    network: Network;
    taskStorage: LocalStorage<Container<TaskContent>[]>;
    settingStorage: LocalStorage<UserSetting>;

    // Actions - タスク操作
    createTask: (task: TaskCreate) => void;
    editTask: (task: Task) => void;
    completeTask: (task: Task) => void;
    uncompleteTask: (task: Task) => void;
    deleteTask: (task: Task) => void;
    undeleteTask: (task: Task) => void;

    // Actions - ユーザー設定操作
    editUserSetting: (userSetting: UserSetting) => void;

    // Actions - 選択状態操作
    updateIsSelected: (task: SelectableTask, isSelected: boolean) => void;

    // Actions - 同期操作
    syncTasksFromDB: () => Promise<void>;
    syncSettingsFromDB: (userId: string) => Promise<void>;

    // Actions - 認証操作
    requestLogin: (email: string) => Promise<void>;
    authToken: (token: string) => Promise<string | null>; // 成功時はuserIdを返す

    // Actions - LocalStorageからの読み込み
    loadFromLocalStorage: () => void;

    // Actions - エラーハンドリング
    notifyError: (error_info: ApiErrorInfo) => void;
};

// -----------------------------------------------------------------------------
// 初期値
// -----------------------------------------------------------------------------

const userSettingInitialValue: UserSetting = {
    meta: {
        id: "a6e2b2b4-2314-448d-8af3-0b37d845770e",
        version: 0,
        createdAt: "1980-01-01T00:00:00.000Z",
        updatedAt: "1980-01-01T00:00:00.000Z",
    },
    data: {
        email: "anonymous@lulliecat.com",
        timezone: 9,
        dailyGoals: {
            heavy: 1,
            medium: 2,
            light: 3,
        },
    },
};

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const task_config: PersistentContentConfig<Container<TaskContent>[]> = {
    name: "tasks",
    storage_key: "vanish-todo-tasks",
    api_base: "/tasks",
    schema: tasksSchema,
    initial_value: [],
};

const setting_config: PersistentContentConfig<UserSetting> = {
    name: "user_settings",
    storage_key: "vanish-todo-user-settings",
    api_base: "/setting",
    schema: userSettingSchema,
    initial_value: userSettingInitialValue,
};

// -----------------------------------------------------------------------------
// Zustand Store作成
// -----------------------------------------------------------------------------

export const useTaskStore = create<TaskStore>((set, get) => {
    const network = new Network("/api/v1");
    const taskStorage = new LocalStorage<Container<TaskContent>[]>(task_config);
    const settingStorage = new LocalStorage<UserSetting>(setting_config);

    return {
        // State
        tasks: [],
        userSetting: userSettingInitialValue,
        isLogin: false,
        network,
        taskStorage,
        settingStorage,

        // LocalStorageからの読み込み
        loadFromLocalStorage: () => {
            const tasks = get().taskStorage.item;
            const userSetting = get().settingStorage.item;
            set({
                tasks: tasks.map((t) => ({ task: t, isSelected: false })),
                userSetting,
            });
        },

        // タスク作成
        createTask: (taskCreate: TaskCreate) => {
            const { userSetting, taskStorage, network, isLogin } = get();
            const c: TaskContent = {
                ...taskCreate,
                completedAt: undefined,
                isDeleted: false,
                userId: userSetting.meta.id,
            };
            const item = generateItem(c);

            // LocalStorageに保存
            const arr = taskStorage.item;
            arr.push(item);
            taskStorage.item = arr;

            // State更新
            set({
                tasks: taskStorage.item.map((t) => ({ task: t, isSelected: false })),
            });

            // DBに同期(非同期)
            if (isLogin) {
                network.postJson(task_config.api_base, item, apiVoidSchema).then((result) => {
                    if (result.status !== "success") {
                        get().notifyError(result.error_info);
                    }
                });
            }
        },

        // タスク編集
        editTask: (task: Task) => {
            const { taskStorage, network, isLogin } = get();
            const updated = touchItem(task);

            // LocalStorageに保存
            const arr = taskStorage.item;
            const idx = arr.findIndex((x) => x.meta.id === updated.meta.id);
            if (idx < 0) {
                get().notifyError({
                    code: "INTERNAL_ERROR",
                    message: "更新時にIDが見つかりません",
                });
                return;
            }
            arr[idx] = updated;
            taskStorage.item = arr;

            // State更新
            set({
                tasks: taskStorage.item.map((t) => ({ task: t, isSelected: false })),
            });

            // DBに同期(非同期)
            if (isLogin) {
                network.putJson(`${task_config.api_base}/${updated.meta.id}`, updated).then((result) => {
                    if (result.status !== "success") {
                        get().notifyError(result.error_info);
                    }
                });
            }
        },

        // タスク完了
        completeTask: (task: Task) => {
            const updated = touchItem(task);
            updated.data.completedAt = updated.meta.updatedAt;
            get().editTask(updated);
        },

        // タスク完了取り消し
        uncompleteTask: (task: Task) => {
            const updated = touchItem(task);
            updated.data.completedAt = undefined;
            get().editTask(updated);
        },

        // タスク削除
        deleteTask: (task: Task) => {
            const updated = touchItem(task);
            updated.data.isDeleted = true;
            get().editTask(updated);
        },

        // タスク削除取り消し
        undeleteTask: (task: Task) => {
            const updated = touchItem(task);
            updated.data.isDeleted = false;
            get().editTask(updated);
        },

        // ユーザー設定編集
        editUserSetting: (userSetting: UserSetting) => {
            const { settingStorage, network, isLogin } = get();
            const updated = touchItem(userSetting);

            // LocalStorageに保存
            settingStorage.item = updated;

            // State更新
            set({ userSetting: updated });

            // DBに同期(非同期)
            if (isLogin) {
                network.putJson(`${setting_config.api_base}/${updated.meta.id}`, updated).then((result) => {
                    if (result.status !== "success") {
                        get().notifyError(result.error_info);
                    }
                });
            }
        },

        // 選択状態更新
        updateIsSelected: (task: SelectableTask, isSelected: boolean) => {
            set((state) => ({
                tasks: state.tasks.map((t) => (t.task.meta.id === task.task.meta.id ? { ...t, isSelected } : t)),
            }));
        },

        // DBからタスク同期
        syncTasksFromDB: async () => {
            const { network, taskStorage, isLogin } = get();
            if (!isLogin) {
                return;
            }

            const result = await network.getJson(task_config.api_base, tasksSchema);
            if (result.status === "success") {
                taskStorage.item = result.data;
                set({
                    tasks: result.data.map((t) => ({ task: t, isSelected: false })),
                });
            } else {
                get().notifyError(result.error_info);
            }
        },

        // DBからユーザー設定同期
        syncSettingsFromDB: async (userId: string) => {
            const { network, settingStorage, isLogin } = get();
            if (!isLogin) {
                return;
            }

            const result = await network.getJson(`${setting_config.api_base}/${userId}`, userSettingSchema);
            if (result.status === "success") {
                settingStorage.item = result.data;
                set({ userSetting: result.data });
            } else {
                get().notifyError(result.error_info);
            }
        },

        // ログインリクエスト
        requestLogin: async (email: string) => {
            const { network, isLogin } = get();
            if (isLogin) {
                get().notifyError({
                    code: "INTERNAL_ERROR",
                    message: "すでにログインしています。",
                });
                return;
            }

            const result = await network.postJson("/login", { email }, apiVoidSchema);
            if (result.status !== "success") {
                get().notifyError(result.error_info);
            }
        },

        // トークン認証
        authToken: async (token: string) => {
            const { network, taskStorage, settingStorage } = get();
            const result = await network.postJson("/auth", { token }, apiAuthSuccessSchema);
            if (result.status === "success") {
                const userId = result.data.userId;

                // ログイン状態を設定
                set({ isLogin: true });

                // DB同期を実行（isLoginチェックをバイパスするため直接実装）
                const settingsResult = await network.getJson(`${setting_config.api_base}/${userId}`, userSettingSchema);
                if (settingsResult.status === "success") {
                    settingStorage.item = settingsResult.data;
                    set({ userSetting: settingsResult.data });
                } else {
                    get().notifyError(settingsResult.error_info);
                }

                const tasksResult = await network.getJson(task_config.api_base, tasksSchema);
                if (tasksResult.status === "success") {
                    taskStorage.item = tasksResult.data;
                    set({
                        tasks: tasksResult.data.map((t) => ({ task: t, isSelected: false })),
                    });
                } else {
                    get().notifyError(tasksResult.error_info);
                }

                return userId;
            }
            get().notifyError(result.error_info);
            return null;
        },

        // エラー通知
        notifyError: (error_info: ApiErrorInfo) => {
            console.error(error_info);
        },
    };
});
