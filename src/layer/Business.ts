import type {
    ApiVoid,
    ConnectResult,
    IPersistent,
    LoginInfoContent,
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
import { generateItem, type LocalStorage, touchItem } from "./Persistent";

/**
 * ビジネス層インターフェースクラス
 */
export class Business {
    private m_persistent: IPersistent<TaskContent, UserSettingContent>;
    private m_per_login: LocalStorage<LoginInfoContent>;
    private m_network: Network;

    /**
     * 永続化層をDIしてビジネス層を初期化します
     *
     * @param {IPersistent} per_task - 永続化層インターフェース(DI)
     */
    constructor(persistent: IPersistent<TaskContent, UserSettingContent>, per_login: LocalStorage<LoginInfoContent>, network: Network) {
        this.m_persistent = persistent;
        this.m_per_login = per_login;
        this.m_network = network;
    }

    requestLogin(email: string): Promise<Result<ApiVoid>> {
        return this.m_network.postJson("/login", { email }, apiVoidSchema);
    }

    async authenticate(token: string, onComplete: OnComplete<ConnectResult<TaskContent, UserSettingContent>>): Promise<void> {
        try {
            const result = await this.m_network.postJson("/auth", { token }, apiAuthSuccessSchema);
            if (result.status === "success") {
                this.m_per_login.item = { isLogin: true, userId: result.data.userId };
                this.m_persistent.connect(result.data.userId, onComplete);
            } else {
                this.m_per_login.item = { isLogin: false, userId: this.m_per_login.item.userId };
                this.m_persistent.disconnect();
                onComplete({
                    status: result.status,
                    error_info: result.error_info,
                    data: {
                        tasks: this.m_persistent.tasks,
                        setting: this.m_persistent.setting,
                    },
                });
            }
        } catch (e) {
            this.m_per_login.item = { isLogin: false, userId: this.m_per_login.item.userId };
            this.m_persistent.disconnect();
            onComplete({
                status: "fatal",
                error_info: { code: "500", message: "Unhandled error" },
                data: {
                    tasks: this.m_persistent.tasks,
                    setting: this.m_persistent.setting,
                },
            });
        }
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
            userId: this.m_per_login.item.userId || undefined,
        };
        const item = generateItem(c);
        this.m_persistent.create(item, (e) => {
            if (e.status !== "success") {
                onError(e);
            }
        });
        return this.m_persistent.tasks;
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
        this.m_persistent.update(c, (e) => {
            if (e.status !== "success") {
                onError(e);
            }
        });
        return this.m_persistent.tasks;
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
        this.m_persistent.update(updated, (e) => {
            if (e.status !== "success") {
                onError(e);
            }
        });
        return this.m_persistent.tasks;
    }

    del(item: Task, onError: OnError): Task[] {
        const deleted = touchItem<TaskContent>(item);
        deleted.data.isDeleted = true;
        this.m_persistent.update(deleted, (e) => {
            if (e.status !== "success") {
                onError(e);
            }
        });
        return this.m_persistent.tasks;
    }

    restore(item: Task, onError: OnError): Task[] {
        const restored = touchItem<TaskContent>(item);
        restored.data.completedAt = undefined;
        this.m_persistent.update(restored, (e) => {
            if (e.status !== "success") {
                onError(e);
            }
        });
        return this.m_persistent.tasks;
    }

    undelete(item: Task, onError: OnError): Task[] {
        const undeleted = touchItem<TaskContent>(item);
        undeleted.data.isDeleted = false;
        this.m_persistent.update(undeleted, (e) => {
            if (e.status !== "success") {
                onError(e);
            }
        });
        return this.m_persistent.tasks;
    }

    get tasks(): Task[] {
        return this.m_persistent.tasks;
    }

    get setting(): UserSetting {
        return this.m_persistent.setting;
    }

    get loginInfo(): LoginInfoContent {
        return this.m_per_login.item;
    }

    set(setting: UserSettingContent, onError: OnError): UserSetting {
        const existing = this.m_persistent.setting;
        const updated = touchItem<UserSettingContent>(existing);
        updated.data = setting;
        this.m_persistent.updateSetting(updated, (e) => {
            if (e.status !== "success") {
                onError(e);
            }
        });
        return this.m_persistent.setting;
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
