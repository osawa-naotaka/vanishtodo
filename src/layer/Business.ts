import type {
    ApiAuthSuccess,
    ApiVoid,
    IPersistent,
    OnComplete,
    OnError,
    Result,
    Task,
    TaskContent,
    TaskCreate,
    UserSetting,
    UserSettingContent,
} from "../../type/types";
import { apiAuthSuccessSchema, apiVoidSchema } from "../../type/types";
import { dayDifference } from "../lib/date";
import type { Network } from "./Network";
import { generateItem, touchItem } from "./Persistent";

/**
 * ビジネス層インターフェースクラス
 */
export class Business {
    private m_per_task: IPersistent<TaskContent>;
    private m_per_setting: IPersistent<UserSettingContent>;
    private m_network: Network;

    /**
     * 永続化層をDIしてビジネス層を初期化します
     *
     * @param {IPersistent} persistent - 永続化層インターフェース(DI)
     */
    constructor(persistent: IPersistent<TaskContent>, persistent_setting: IPersistent<UserSettingContent>, network: Network) {
        this.m_per_task = persistent;
        this.m_per_setting = persistent_setting;
        this.m_network = network;
    }

    requestLogin(email: string): Promise<Result<ApiVoid>> {
        return this.m_network.postJson("/login", { email }, apiVoidSchema);
    }

    authenticate(token: string): Promise<Result<ApiAuthSuccess>> {
        return this.m_network.postJson("/auth", { token }, apiAuthSuccessSchema);
    }

    syncTask(onCompleteTasks: OnComplete<Task[]>): void {
        this.m_per_task.sync(onCompleteTasks);
    }

    /**
     * タスクを作成します
     *
     * @param {TaskCreateContent} data 作成するタスクデータ
     * @returns {Task[]} 全タスクリスト
     */
    create(data: TaskCreate, onError: OnError): Task[] {
        const c: TaskContent = {
            ...data,
            completedAt: undefined,
            isDeleted: false,
        };
        const item = generateItem(c);
        this.m_per_task.create(item, (e) => {
            if (e.status !== "success") {
                onError(e);
            }
        });
        return this.m_per_task.items;
    }

    /**
     * タスクを完了状態にします。comopleteAtに完了日時が設定されます。
     * completeAtは、nullの場合は未完了状態を示します。
     *
     * @param {Task} item
     * @returns {Task[]} 全タスクリスト
     */
    complete(item: Task, onError: OnError): Task[] {
        const c = touchItem<TaskContent>(item);
        c.data.completedAt = c.meta.updatedAt;
        this.m_per_task.update(c, (e) => {
            if (e.status !== "success") {
                onError(e);
            }
        });
        return this.m_per_task.items;
    }

    /**
     * タスクを編集します。具体的には、引数で渡されたタスクデータで上書きします。
     * その際に、updatedAtだけが自動更新されます。
     *
     * @param {Task} item 編集後のタスク
     * @returns {Task[]} 全タスクリスト
     */
    edit(item: Task, onError: OnError): Task[] {
        const updated = touchItem<TaskContent>(item);
        updated.data = item.data;
        this.m_per_task.update(updated, (e) => {
            if (e.status !== "success") {
                onError(e);
            }
        });
        return this.m_per_task.items;
    }

    del(item: Task, onError: OnError): Task[] {
        const deleted = touchItem<TaskContent>(item);
        deleted.data.isDeleted = true;
        this.m_per_task.update(deleted, (e) => {
            if (e.status !== "success") {
                onError(e);
            }
        });
        return this.m_per_task.items;
    }

    restore(item: Task, onError: OnError): Task[] {
        const restored = touchItem<TaskContent>(item);
        restored.data.completedAt = undefined;
        this.m_per_task.update(restored, (e) => {
            if (e.status !== "success") {
                onError(e);
            }
        });
        return this.m_per_task.items;
    }

    undelete(item: Task, onError: OnError): Task[] {
        const undeleted = touchItem<TaskContent>(item);
        undeleted.data.isDeleted = false;
        this.m_per_task.update(undeleted, (e) => {
            if (e.status !== "success") {
                onError(e);
            }
        });
        return this.m_per_task.items;
    }

    get tasks(): Task[] {
        return this.m_per_task.items;
    }

    get userSettings(): UserSetting[] {
        return this.m_per_setting.items;
    }

    syncUserSetting(onCompleteUserSettings: OnComplete<UserSetting[]>): void {
        this.m_per_setting.sync(onCompleteUserSettings);
    }

    set(setting: UserSettingContent, onError: OnError): UserSetting[] {
        if (this.m_per_setting.items.length !== 1) {
            return [];
        }

        const existing = this.m_per_setting.items[0];
        const updated = touchItem<UserSettingContent>(existing);
        updated.data = setting;
        this.m_per_setting.update(updated, (e) => {
            if (e.status !== "success") {
                onError(e);
            }
        });
        return this.m_per_setting.items;
    }
}

type LimitOptions = {
    heavy: number;
    medium: number;
    light: number;
};

export function tasksToday(today: string, opt: LimitOptions, tasks: Task[]): Task[] {
    const pre = process(sortByUpdatedDate("asc")(tasks), or(isIncomplete, isCompleteToday(today)));
    const limited = limit(opt)(pre);
    return process(sortByUpdatedDate("asc")(limited), isIncomplete);
}

export function makeFilter(...f: ((task: Task) => boolean)[]): (task: Task) => boolean {
    return (task: Task) => {
        for (const fn of f) {
            if (!fn(task)) {
                return false;
            }
        }
        return true;
    };
}

export function limit(opt: LimitOptions): (tasks: Task[]) => Task[] {
    return (tasks: Task[]) => {
        const heavy_tasks = tasks.filter((task) => task.data.weight === "heavy").slice(0, opt.heavy);
        const medium_tasks = tasks.filter((task) => task.data.weight === "medium").slice(0, opt.medium);
        const light_tasks = tasks.filter((task) => task.data.weight === "light").slice(0, opt.light);
        const due_date_tasks = tasks.filter((task) => task.data.weight === undefined);
        return [...heavy_tasks, ...medium_tasks, ...light_tasks, ...due_date_tasks];
    };
}

export function sortByUpdatedDate(opt: "asc" | "desc"): (tasks: Task[]) => Task[] {
    return (tasks: Task[]) => {
        return tasks.sort((a, b) => {
            const da = new Date(a.meta.updatedAt);
            const db = new Date(b.meta.updatedAt);
            if (opt === "asc") {
                return db.getTime() - da.getTime();
            } else {
                return da.getTime() - db.getTime();
            }
        });
    };
}

export function or(...fns: ((task: Task) => boolean)[]): (task: Task) => boolean {
    return (task: Task) => {
        for (const fn of fns) {
            if (fn(task)) {
                return true;
            }
        }
        return false;
    };
}

export function process(tasks: Task[], ...fns: ((task: Task) => boolean)[]): Task[] {
    if (fns.length === 0) {
        return tasks;
    }

    return process(tasks.filter(fns[0]), ...fns.slice(1));
}

export function hasDueDate(task: Task): boolean {
    return task.data.weight === undefined;
}

export function hasWeight(task: Task): boolean {
    return task.data.weight !== undefined;
}

export function isIncomplete(task: Task): boolean {
    return task.data.completedAt === undefined && task.data.isDeleted === false;
}

export function isCompleteToday(current_date: string): (task: Task) => boolean {
    return (task: Task) => task.data.completedAt !== undefined && dayDifference(current_date, task.data.completedAt) === 0;
}

export function isDeleted(task: Task): boolean {
    return task.data.isDeleted;
}

export function isCompleted(task: Task): boolean {
    return task.data.completedAt !== undefined && task.data.isDeleted === false;
}
