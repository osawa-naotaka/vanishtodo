import { create } from "zustand";
import type { ApiErrorInfo, Container, Task, TaskContent, TaskCreate, UserSetting, UserSettingContent } from "../../type/types";
import { apiAuthSuccessSchema, apiVoidSchema, tasksSchema, userSettingSchema } from "../../type/types";
import { generateItem, LocalStorage, touchItem } from "../layer/Persistent";
import type { PersistentContentConfig } from "../layer/Persistent";
import { Network } from "../layer/Network";

// -----------------------------------------------------------------------------
// 非同期キュー（DB操作の順序保証）
// -----------------------------------------------------------------------------

class AsyncQueue {
    private readonly queue: (() => Promise<void>)[] = [];
    private isProcessing = false;

    enqueue(fn: () => Promise<void>): void {
        this.queue.push(fn);
        this.processQueue();
    }

    private async processQueue(): Promise<void> {
        if (this.isProcessing) {
            return;
        }
        this.isProcessing = true;
        while (this.queue.length > 0) {
            const fn = this.queue.shift();
            if (fn) {
                await fn();
            }
        }
        this.isProcessing = false;
    }
}

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
    dbQueue: AsyncQueue;

    // Actions - タスク操作
    createTask: (task: TaskCreate) => Promise<void>;
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
    const dbQueue = new AsyncQueue();

    return {
        // State
        tasks: [],
        userSetting: userSettingInitialValue,
        isLogin: false,
        network,
        taskStorage,
        settingStorage,
        dbQueue,

        // LocalStorageからの読み込み
        loadFromLocalStorage: () => {
            const tasks = get().taskStorage.item;
            const userSetting = get().settingStorage.item;
            console.log("[useTaskStore] loadFromLocalStorage called", {
                taskCount: tasks.length,
                taskIds: tasks.map((t) => t.meta.id),
                userEmail: userSetting.data.email,
            });
            set({
                tasks: tasks.map((t) => ({ task: t, isSelected: false })),
                userSetting,
            });
        },

        // タスク作成
        createTask: async (taskCreate: TaskCreate) => {
            const { userSetting, taskStorage, dbQueue, network, isLogin } = get();
            const c: TaskContent = {
                ...taskCreate,
                completedAt: undefined,
                isDeleted: false,
                userId: userSetting.meta.id,
            };
            const item = generateItem(c);

            console.log("[useTaskStore] createTask called", { isLogin, taskId: item.meta.id });

            // LocalStorageに保存
            const arr = taskStorage.item;
            arr.push(item);
            taskStorage.item = arr;
            console.log("[useTaskStore] createTask: Saved to LocalStorage", {
                taskCount: arr.length,
                taskIds: arr.map((t) => t.meta.id),
            });

            // State更新
            set({
                tasks: taskStorage.item.map((t) => ({ task: t, isSelected: false })),
            });

            // DBに同期(キュー経由で順序保証)
            if (isLogin) {
                dbQueue.enqueue(async () => {
                    console.log("[useTaskStore] Creating task in DB:", task_config.api_base);
                    const result = await network.postJson(task_config.api_base, item, apiVoidSchema);
                    if (result.status !== "success") {
                        console.error("[useTaskStore] Task creation failed:", result.error_info);
                        get().notifyError(result.error_info);
                    } else {
                        console.log("[useTaskStore] Task creation success");
                    }
                });
            } else {
                console.warn("[useTaskStore] Not logged in - skipping DB sync for task creation");
            }
        },

        // タスク編集（内部用 - すでにtouchItem済みのタスクを受け取る想定）
        editTask: (task: Task) => {
            const { taskStorage, dbQueue, network, isLogin } = get();

            console.log("[useTaskStore] editTask called", { isLogin, taskId: task.meta.id, version: task.meta.version, completedAt: task.data.completedAt });

            // LocalStorageに保存
            const arr = taskStorage.item;
            const idx = arr.findIndex((x) => x.meta.id === task.meta.id);
            if (idx < 0) {
                get().notifyError({
                    code: "INTERNAL_ERROR",
                    message: "更新時にIDが見つかりません",
                });
                return;
            }
            arr[idx] = task;
            taskStorage.item = arr;

            // State更新
            set({
                tasks: taskStorage.item.map((t) => ({ task: t, isSelected: false })),
            });

            // DBに同期(キュー経由で順序保証)
            if (isLogin) {
                dbQueue.enqueue(async () => {
                    console.log("[useTaskStore] Syncing to DB:", `${task_config.api_base}/${task.meta.id}`, "version:", task.meta.version);
                    const result = await network.putJson(`${task_config.api_base}/${task.meta.id}`, task);
                    if (result.status !== "success") {
                        console.error("[useTaskStore] DB sync failed:", result.error_info);
                        get().notifyError(result.error_info);
                    } else {
                        console.log("[useTaskStore] DB sync success");
                    }
                });
            } else {
                console.warn("[useTaskStore] Not logged in - skipping DB sync");
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
            const { settingStorage, dbQueue, network, isLogin } = get();
            const updated = touchItem(userSetting);

            // LocalStorageに保存
            settingStorage.item = updated;

            // State更新
            set({ userSetting: updated });

            // DBに同期(キュー経由で順序保証)
            if (isLogin) {
                dbQueue.enqueue(async () => {
                    const result = await network.putJson(`${setting_config.api_base}/${updated.meta.id}`, updated);
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
                console.log("[useTaskStore] Login successful, isLogin set to true, userId:", userId);

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
                    console.log("[useTaskStore] authToken: Saving DB tasks to LocalStorage", {
                        taskCount: tasksResult.data.length,
                        taskIds: tasksResult.data.map((t) => t.meta.id),
                    });
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
