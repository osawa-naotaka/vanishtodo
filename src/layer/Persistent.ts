import * as v from "valibot";
import type { ApiErrorInfo, DBContainer, PersistentErrorStatus, PersistentResult, Task, Tasks } from "../../type/types";
import { apiFailResponseSchema, apiSuccessResponseSchema, apiTasksSchema, IPersistent, tasksSchema } from "../../type/types";

export type OnComplete = (r: PersistentResult<unknown>) => void;

export class Persistent extends IPersistent {
    private m_tasks: Tasks;

    constructor() {
        super();
        // localStorage.removeItem("vanish-todo-tasks");
        const tasks = localStorage.getItem("vanish-todo-tasks");
        if (tasks) {
            this.m_tasks = v.parse(tasksSchema, JSON.parse(tasks));
        } else {
            this.m_tasks = [];
        }
    }

    get items(): Task[] {
        return Object.values(this.m_tasks);
    }

    generateItem<T>(data: T): DBContainer<T> {
        const date = new Date().toISOString();
        return {
            meta: {
                id: crypto.randomUUID(),
                version: 1,
                createdAt: date,
                updatedAt: date,
            },
            data,
        };
    }

    touchItem<T>(item: DBContainer<T>): DBContainer<T> {
        return {
            meta: {
                id: item.meta.id,
                version: item.meta.version + 1,
                createdAt: item.meta.createdAt,
                updatedAt: new Date().toISOString(),
            },
            data: item.data,
        };
    }

    readTasks(): Promise<PersistentResult<Task[]>> {
        return new Promise((resolve) => {
            const promise = fetch("/api/v1/tasks");
            this.processResponse(promise, (e) => {
                const resp = v.safeParse(apiTasksSchema, e.data);
                if (resp.success) {
                    this.m_tasks = resp.output.tasks;
                    localStorage.setItem("vanish-todo-tasks", JSON.stringify(this.m_tasks));
                    resolve({
                        status: "success",
                        data: this.m_tasks,
                    });
                } else {
                    resolve({
                        status: "fatal",
                        error_info: {
                            code: "INTERNAL_ERROR",
                            message: "サーバーから取得したタスクデータの構造が想定と違います",
                        },
                        data: this.m_tasks,
                    });
                }
            });
        });
    }

    writeTask(item: Task, onError: (r: PersistentResult<null>) => void): Task[] {
        const idx = this.m_tasks.findIndex((x) => x.meta.id === item.meta.id);
        console.log("writeTask idx:", idx);
        if (idx >= 0) {
            this.m_tasks[idx] = item;
            this.writeTaskToDb(item, onError);
        } else {
            this.m_tasks.push(item);
            this.createTaskToDb(item, onError);
        }

        const str = JSON.stringify(this.m_tasks);
        localStorage.setItem("vanish-todo-tasks", str);

        return JSON.parse(str);
    }

    private createTaskToDb(item: Task, onError: (r: PersistentResult<null>) => void): void {
        const promise = fetch("/api/v1/tasks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(item),
        });

        this.processResponse(promise, (e: PersistentResult<unknown>) => {
            if (e.status !== "success") {
                onError({ ...e, data: null });
            }
        });
    }

    private writeTaskToDb(item: Task, onError: (r: PersistentResult<null>) => void): void {
        const promise = fetch(`/api/v1/tasks/${item.meta.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(item),
        });

        this.processResponse(promise, (e: PersistentResult<unknown>) => {
            if (e.status !== "success") {
                onError({ ...e, data: null });
            }
        });
    }

    private process_status: [number, PersistentErrorStatus, ApiErrorInfo][] = [
        // [HTTPステータスコード, 永続化層ステータス, エラー情報]
        [409, "conflict", { code: "CONFLICT", message: "タスクのversionフィールドの不一致が検出されました。二か所以上での書き込みが競合したと思われます。" }],
        [429, "recoverable", { code: "TOO_MANY_REQUESTS", message: "リクエストが多すぎます" }],
        [503, "recoverable", { code: "SERVICE_UNAVAILABLE", message: "サービスが利用できません" }],
        [522, "recoverable", { code: "TIMEOUT", message: "サーバーの応答がタイムアウトしました" }],
        [523, "recoverable", { code: "UNREACHABLE", message: "サーバーに到達できませんでした" }],
        [524, "recoverable", { code: "NETWORK_TIMEOUT", message: "ネットワークのタイムアウトが発生しました" }],
        [530, "recoverable", { code: "DNS_ERROR", message: "DNSエラーが発生しました" }],

        [400, "fatal", { code: "BAD_REQUEST", message: "不正なリクエストです。リクエストのバリデーションに失敗した可能性があります。" }],
        [403, "fatal", { code: "FORBIDDEN", message: "アクセスが禁止されています" }],
        [404, "fatal", { code: "NOT_FOUND", message: "指定されたリソースが見つかりません" }],
        [405, "fatal", { code: "METHOD_NOT_ALLOWED", message: "許可されていないHTTPメソッドが使用されました" }],
        [413, "fatal", { code: "PAYLOAD_TOO_LARGE", message: "リクエストペイロードが大きすぎます" }],
        [414, "fatal", { code: "URI_TOO_LONG", message: "リクエストURIが長すぎます" }],
        [431, "fatal", { code: "UNSUPPORTED_MEDIA_TYPE", message: "サポートされていないメディアタイプです" }],
        [500, "fatal", { code: "INTERNAL_ERROR", message: "サーバー内部でエラーが発生しました" }],
    ];

    private processStatus(st: number, onComplet: OnComplete): void {
        const index = this.process_status.findIndex(([code]) => code === st);
        if (index === -1) {
            onComplet({
                status: "fatal",
                error_info: {
                    code: `UNHANDLED_STATUS_${st}`,
                    message: `httpステータスコード${st}はハンドルされず致命的エラーになりました`,
                },
                data: null,
            });
            return;
        }

        const [_code, status, error_info] = this.process_status[index];
        onComplet({
            status: status,
            error_info,
            data: null,
        });
        return;
    }

    /**
     * fetch()が生成するPromise<Response>を処理し、onCompleteコールバックを呼び出します
     *
     * @param {Promise<Response>} promise
     * @param {OnComplete} onComplete
     * @returns {Promise<void>}
     */
    private async processResponse(promise: Promise<Response>, onComplete: OnComplete): Promise<void> {
        try {
            // response header
            const resp = await promise;

            // response body
            let r = {};
            try {
                r = await resp.json();
            } catch (_e) {
                r = {};
            }

            // success response
            const parse_success = v.safeParse(apiSuccessResponseSchema, r);
            if (parse_success.success) {
                onComplete(parse_success.output);
                return;
            }

            // fail response
            const parse_fail = v.safeParse(apiFailResponseSchema, r);
            if (parse_fail.success) {
                onComplete({
                    status: "fatal",
                    error_info: parse_fail.output.error_info,
                    data: null,
                });
                return;
            }

            if (!resp.ok) {
                this.processStatus(resp.status, onComplete);
                return;
            }

            // malformed response
            onComplete({
                status: "fatal",
                error_info: {
                    code: "INTERNAL_ERROR",
                    message: "サーバーからのレスポンスの構造が想定と違います",
                },
                data: null,
            });

            return;
        } catch (e: unknown) {
            // ネットワークエラーの可能性ありなのでrecoverableで返す
            if (e instanceof TypeError) {
                onComplete({
                    status: "recoverable",
                    error_info: {
                        code: "NETWORK_ERROR",
                        message: e.message,
                    },
                    data: null,
                });
                return;
            }

            // Abort指示
            if (e instanceof DOMException) {
                onComplete({
                    status: "abort",
                    error_info: {
                        code: "ABORTED",
                        message: e.message,
                    },
                    data: null,
                });
                return;
            }

            // 未知のエラーはfatalで返す
            onComplete({
                status: "fatal",
                error_info: {
                    code: "INTERNAL_ERROR",
                    message: "不明なエラーが発生しました",
                },
                data: null,
            });
        }
    }
}
