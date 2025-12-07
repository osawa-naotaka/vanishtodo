import type { Task, TaskContent, TaskCreateContent } from "../types";
import type { IPersistent } from "../types";

/**
 * ビジネス層インターフェースクラス
 */
export class Business {
    private m_persistent: IPersistent;

    /**
     * 永続化層をDIしてビジネス層を初期化します
     * @param {IPersistent} persistent - 永続化層インターフェース(DI)
     */
    constructor(persistent: IPersistent) {
        this.m_persistent = persistent;
    }

    /**
     * タスクを作成します
     *
     * @param {TaskCreateContent} data 作成するタスクデータ
     * @returns {Task[]} 全タスクリスト
     */
    create(data: TaskCreateContent): Task[] {
        const c: TaskContent = {
            ...data,
            completedAt: undefined,
            isDeleted: false,
        };
        const item = this.m_persistent.generateItem(c);
        return this.m_persistent.writeTask(item);
    }

    /**
     * タスクを完了状態にします。comopleteAtに完了日時が設定されます。
     * completeAtは、nullの場合は未完了状態を示します。
     *
     * @param {Task} item
     * @returns {Task[]} 全タスクリスト
     */
    complete(item: Task): Task[] {
        const c = this.m_persistent.touchItem<TaskContent>(item);
        c.data.completedAt = c.meta.updatedAt;
        return this.m_persistent.writeTask(c);
    }

    /**
     * タスクを編集します。具体的には、引数で渡されたタスクデータで上書きします。
     * その際に、updatedAtだけが自動更新されます。
     *
     * @param {Task} item 編集後のタスク
     * @returns {Task[]} 全タスクリスト
     */
    edit(item: Task): Task[] {
        const updated = this.m_persistent.touchItem<TaskContent>(item);
        updated.data = item.data;
        return this.m_persistent.writeTask(updated);
    }

    /**
     * TaskContent(create時データ構造)のバリデートをします
     * 1. タイトルは1-500文字であること
     * 2. 重さか締切日のどちらか一方が設定されている(nullでない)こと
     *
     * @param {TaskContent} data バリデート対象
     * @returns {boolean} バリデート結果
     */
    validateTaskCreateContent(data: TaskCreateContent): boolean {
        if (data.title.length > 500 || data.title.length === 0) return false;
        if ((data.weight === null && data.dueDate === null) || (data.weight !== null && data.dueDate !== null)) return false;

        return true;
    }

    get tasks(): Task[] {
        return this.m_persistent.items;
    }
}
