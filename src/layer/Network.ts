import * as v from "valibot";
import type { ApiErrorInfo, OnComplete, Result, ResultErrorStatus } from "../../type/types";
import { apiFailResponseSchema, apiSuccessResponseSchema } from "../../type/types";

export class Network {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    getJson(path: string): Promise<Response> {
        return fetch(`${this.baseUrl}${path}`);
    }

    postJson(path: string, body: object): Promise<Response> {
        return fetch(`${this.baseUrl}${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
    }

    putJson(path: string, body: object): Promise<Response> {
        return fetch(`${this.baseUrl}${path}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
    }

    /**
     * fetch()が生成するPromise<Response>を処理し、onCompleteコールバックを呼び出します
     *
     * @param {Promise<Response>} promise
     * @param {OnComplete} onComplete
     * @returns {Promise<void>}
     */
    async processResponse<T>(promise: Promise<Response>, schema: v.BaseSchema<unknown, T, v.BaseIssue<unknown>>, onComplete: OnComplete<T>): Promise<void> {
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
                const data_parse = v.safeParse(schema, parse_success.output.data);
                if (data_parse.success) {
                    onComplete({ status: "success", data: data_parse.output });
                    return;
                }
                onComplete({
                    status: "fatal",
                    error_info: {
                        code: "INTERNAL_ERROR",
                        message: "サーバーからのレスポンスのデータ構造が想定と違います",
                        details: data_parse.issues.map((issue) => issue.message).join("; "),
                    },
                });
                return;
            }

            // fail response
            const parse_fail = v.safeParse(apiFailResponseSchema, r);
            if (parse_fail.success) {
                onComplete({
                    status: "fatal",
                    error_info: parse_fail.output.error_info,
                });
                return;
            }

            if (!resp.ok) {
                onComplete(this.processStatus(resp.status));
                return;
            }

            // malformed response
            onComplete({
                status: "fatal",
                error_info: {
                    code: "INTERNAL_ERROR",
                    message: "サーバーからのレスポンスの構造が想定と違います",
                },
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
            });
        }
    }

    private process_status: [number, ResultErrorStatus, ApiErrorInfo][] = [
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

    /**
     * httpレスポンスのステータスコードを用いて、VanishToDo用のエラー情報を生成します。
     *
     * @param {number} st httpレスポンスステータスコード
     * @param {OnComplete<T>} onComplete エラー発生時に呼び出すコールバック
     * @returns
     */
    private processStatus<T>(st: number): Result<T> {
        const index = this.process_status.findIndex(([code]) => code === st);
        if (index === -1) {
            return {
                status: "fatal",
                error_info: {
                    code: `UNHANDLED_STATUS_${st}`,
                    message: `httpステータスコード${st}はハンドルされず致命的エラーになりました`,
                },
            };
        }

        const [_code, status, error_info] = this.process_status[index];
        return {
            status: status,
            error_info,
        };
    }
}
