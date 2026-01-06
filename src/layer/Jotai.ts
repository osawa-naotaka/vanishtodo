import { atom } from "jotai";
import type { ApiVoid, Container, Result, Task, UserSetting } from "../../type/types";
import type { SelectableTask } from "./Broker";
import { Network } from "./Network";
import type { PersistentContentConfig } from "./Persistent";
import { LocalStorage } from "./Persistent";

// -----------------------------------------------------------------------------
// 永続化層（簡易版）
// -----------------------------------------------------------------------------
export class Persistent<T> {
    private readonly m_storage: LocalStorage<Container<T>[]>;

    get items(): Container<T>[] {
        return this.m_storage.item;
    }

    set items(items: Container<T>[]) {
        this.m_storage.item = items;
    }

    constructor(config: PersistentContentConfig<Container<T>[]>) {
        this.m_storage = new LocalStorage<Container<T>[]>(config);
    }

    create(item: Container<T>): void {
        const arr = this.m_storage.item;
        arr.push(item);
        this.m_storage.item = arr;
    }

    update(item: Container<T>): Result<ApiVoid> {
        const arr = this.m_storage.item;
        const idx = arr.findIndex((x) => x.meta.id === item.meta.id);
        if (idx < 0) {
            return {
                status: "fatal",
                error_info: {
                    code: "INTERNAL_ERROR",
                    message: `更新時にIDが見つかりません`,
                },
            };
        }
        arr[idx] = item;
        this.m_storage.item = arr;
        return { status: "success", data: { type: "void" } };
    }
}


// -----------------------------------------------------------------------------
// Jotaiアトム定義
// -----------------------------------------------------------------------------
export const userSettingInitialValue: UserSetting = {
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

export const tasksAtom = atom<SelectableTask[]>([]);
export const userSettingAtom = atom<UserSetting>(userSettingInitialValue);

export const tasksWriterAtom = atom(null, (_get, set, tasks: Task[]) => {
    set(
        tasksAtom,
        tasks.map((task) => ({
            isSelected: false,
            task: task,
        })),
    );
});

export const networkAtom = atom<Network>(new Network("/api/v1"));
export const isLoginAtom = atom<boolean>(false);
export const userIdAtom = atom<string>("a6e2b2b4-2314-448d-8af3-0b37d845770e");
