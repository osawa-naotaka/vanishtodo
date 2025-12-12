import * as v from "valibot";
import type { ApiErrorInfo, ApiVoid, Result, ResultErrorStatus, Schema } from "../../type/types";
import { apiFailResponseSchema, apiSuccessResponseSchema, apiVoidSchema } from "../../type/types";

/**
 * ネットワーク層インターフェースクラス
 */
export class Network {
    private baseUrl: string;

    /**
     * ネットワーク層を初期化します
     *
     * @param {string} baseUrl - ベースURL
     */
    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * GETリクエストを送信します
     *
     * @param {string} path - リクエストパス
     * @returns {Promise<Response>} レスポンスのPromise
     */
    getJson<T>(path: string, schema: Schema<T>): Promise<Result<T>> {
        const promise = fetch(`${this.baseUrl}${path}`);
        return this.processResponse(promise, schema);
    }

    /**
     * POSTリクエストを送信します
     *
     * @param {string} path - リクエストパス
     * @param {object} body - リクエストボディ
     * @returns {Promise<Response>} レスポンスのPromise
     */
    postJson(path: string, body: object): Promise<Result<ApiVoid>> {
        const promise = fetch(`${this.baseUrl}${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        return this.processResponse(promise, apiVoidSchema);
    }

    /**
     * PUTリクエストを送信します
     *
     * @param {string} path - リクエストパス
     * @param {object} body - リクエストボディ
     * @returns {Promise<Result<T>>} レスポンスのパース結果のPromise
     */
    putJson(path: string, body: object): Promise<Result<ApiVoid>> {
        const promise = fetch(`${this.baseUrl}${path}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        return this.processResponse(promise, apiVoidSchema);
    }

    /**
     * レスポンスを処理します
     *
     * @param {Promise<Response>} promise - fetch()が生成するPromise<Response>
     * @param {Schema<T>} schema - バリデーションスキーマ
     * @returns {Promise<Result<T>>} 処理結果
     */
    private async processResponse<T>(promise: Promise<Response>, schema: Schema<T>): Promise<Result<T>> {
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
                    return { status: "success", data: data_parse.output };
                }
                return {
                    status: "fatal",
                    error_info: {
                        code: "INTERNAL_ERROR",
                        message: "サーバーからのレスポンスのデータ構造が想定と違います",
                        details: data_parse.issues.map((issue) => issue.message).join("; "),
                    },
                };
            }

            // fail response
            const parse_fail = v.safeParse(apiFailResponseSchema, r);
            if (parse_fail.success) {
                return {
                    status: "fatal",
                    error_info: parse_fail.output.error_info,
                };
            }

            if (!resp.ok) {
                return this.processStatus(resp.status);
            }

            // malformed response
            return {
                status: "fatal",
                error_info: {
                    code: "INTERNAL_ERROR",
                    message: "サーバーからのレスポンスの構造が想定と違います",
                },
            };
        } catch (e: unknown) {
            // ネットワークエラーの可能性ありなのでrecoverableで返す
            if (e instanceof TypeError) {
                return {
                    status: "recoverable",
                    error_info: {
                        code: "NETWORK_ERROR",
                        message: e.message,
                    },
                };
            }

            // Abort指示
            if (e instanceof DOMException) {
                return {
                    status: "abort",
                    error_info: {
                        code: "ABORTED",
                        message: e.message,
                    },
                };
            }

            // 未知のエラーはfatalで返す
            return {
                status: "fatal",
                error_info: {
                    code: "INTERNAL_ERROR",
                    message: "不明なエラーが発生しました",
                },
            };
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
