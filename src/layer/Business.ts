import type { IPersistent, OnComplete, OnError, Task, TaskContent, TaskInput, Tasks, UserSetting } from "../../type/types";

/**
 * ビジネス層インターフェースクラス
 */
export class Business {
    private m_persistent: IPersistent;

    /**
     * 永続化層をDIしてビジネス層を初期化します
     *
     * @param {IPersistent} persistent - 永続化層インターフェース(DI)
     */
    constructor(persistent: IPersistent) {
        this.m_persistent = persistent;
    }

    init(onCompleteTasks: OnComplete<Tasks>, onCompleteUserSetting: OnComplete<UserSetting>): void {
        this.m_persistent.syncUserSetting(onCompleteUserSetting);
        this.m_persistent.syncTasks(onCompleteTasks);
    }

    /**
     * タスクを作成します
     *
     * @param {TaskCreateContent} data 作成するタスクデータ
     * @returns {Task[]} 全タスクリスト
     */
    create(data: TaskInput, onError: OnError): Task[] {
        const c: TaskContent = {
            ...data,
            completedAt: undefined,
            isDeleted: false,
        };
        const item = this.m_persistent.generateItem(c);
        this.m_persistent.createTask(item, (e) => {
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
        const c = this.m_persistent.touchItem<TaskContent>(item);
        c.data.completedAt = c.meta.updatedAt;
        this.m_persistent.updateTask(c, (e) => {
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
        const updated = this.m_persistent.touchItem<TaskContent>(item);
        updated.data = item.data;
        this.m_persistent.updateTask(updated, (e) => {
            if (e.status !== "success") {
                onError(e);
            }
        });
        return this.m_persistent.tasks;
    }

    /**
     * TaskContent(create時データ構造)のバリデートをします
     * 1. タイトルは1-500文字であること
     * 2. 重さか締切日のどちらか一方が設定されている(nullでない)こと
     *
     * @param {TaskContent} data バリデート対象
     * @returns {boolean} バリデート結果
     */
    validateTaskCreateContent(data: TaskInput): boolean {
        if (data.title.length > 500 || data.title.length === 0) return false;
        if ((data.weight === null && data.dueDate === null) || (data.weight !== null && data.dueDate !== null)) return false;

        return true;
    }

    get tasks(): Tasks {
        return this.m_persistent.tasks;
    }
}
