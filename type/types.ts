// =============================================================================
// VanishToDo - Type Definitions
// =============================================================================

import * as v from "valibot";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// -----------------------------------------------------------------------------
// 基本型
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// リザルト・エラー型
// -----------------------------------------------------------------------------

export type ResultStatus = "success" | ResultErrorStatus;
export type ResultErrorStatus = "abort" | "recoverable" | "conflict" | "fatal";

export type Result<T> = ResultSuccess<T> | ResultFail<T>;

export type ResultSuccess<T> = {
    status: "success";
    data: T;
}

export type ResultFail<T> = {
    status: ResultErrorStatus;
    error_info: ApiErrorInfo;
    data?: T;
}

export type OnComplete<T> = (r: Result<T>) => void;
export type OnError = OnComplete<ApiVoid>;


// -----------------------------------------------------------------------------
// DB層関連型
// -----------------------------------------------------------------------------

//
// タスクおよび設定共通関連型
//

export const idSchema = v.pipe(v.string(), v.uuid()); // タスクID（UUIDv4、永続化層で生成）
export const dateSchema = v.pipe(v.string(), v.isoTimestamp());
export const versionSchema = v.pipe(v.number(), v.toMinValue(0)); // 楽観的ロック用バージョン番号

export const DBContainerMetaSchema = v.object({
    id: idSchema,
    version: versionSchema, // 楽観的ロック用バージョン番号(永続化層で生成、DB層で検証)
    createdAt: dateSchema, // 作成日時 (永続化層で生成)
    updatedAt: dateSchema, // 更新日時（永続化層で生成）
});

export const DBContainerSchema = <T>(dataSchema: Schema<T>) => v.object({
    meta: DBContainerMetaSchema,
    data: dataSchema,
});

export type DBContainer<T> = {
    meta: v.InferOutput<typeof DBContainerMetaSchema>;
    data: T;
};


//
// タスク型
//

export const taskTitleSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(500));
export const taskWeightList = ["light", "medium", "heavy"] as const;
export const taskWeightSchema = v.picklist(taskWeightList);

export const taskContentSchema = v.object({
    userId: v.optional(idSchema),
    title: taskTitleSchema,
    weight: v.optional(taskWeightSchema),
    dueDate: v.optional(dateSchema),
    completedAt: v.optional(dateSchema),
    isDeleted: v.boolean(),
});

export type TaskWeight = v.InferOutput<typeof taskWeightSchema>;
export type TaskContent = v.InferOutput<typeof taskContentSchema>;

export const taskSchema = v.object({
    meta: DBContainerMetaSchema,
    data: taskContentSchema,
});

export type Task = v.InferOutput<typeof taskSchema>;

export const tasksSchema = v.array(taskSchema);

export type Tasks = v.InferOutput<typeof tasksSchema>;


//
// タスク関連型
//

// タスク削除入力（クライアント → サーバー）
export const taskDeleteContentSchema = v.object({
    version: versionSchema, 
});

export type TaskDeleteContent = v.InferOutput<typeof taskDeleteContentSchema>;


// LLM解析結果の個別タスク入力
export const taskCreateSchema = v.object({
    userId: v.optional(idSchema),
    title: taskTitleSchema,
    weight: v.optional(taskWeightSchema),
    dueDate: v.optional(dateSchema)
});

export type TaskCreate = v.InferOutput<typeof taskCreateSchema>;


// -----------------------------------------------------------------------------
// ユーザー設定型
// -----------------------------------------------------------------------------

// タスク目標数 0~10
export const numDailyGoalsTypeSchema = v.pipe(v.number(), v.minValue(0), v.maxValue(10));

// ユーザー設定（サーバー → クライアント）
export const userSettingContentSchema = v.object({
    timezone: v.number(),
    email: v.pipe(v.string(), v.email()),
    dailyGoals: v.object({
        heavy: numDailyGoalsTypeSchema, // 重タスク目標数（0-10）
        medium: numDailyGoalsTypeSchema, // 中タスク目標数（0-10）
        light: numDailyGoalsTypeSchema, // 軽タスク目標数（0-10）
    }),
});

export const userSettingSchema = v.object({
    meta: DBContainerMetaSchema,
    data: userSettingContentSchema,
});

export type UserSetting = v.InferOutput<typeof userSettingSchema>;
export type UserSettingContent = v.InferOutput<typeof userSettingContentSchema>;

export const userSettingsSchema = v.array(userSettingSchema);

export type UserSettings = v.InferOutput<typeof userSettingsSchema>;

// -----------------------------------------------------------------------------
// 認証関連型
// -----------------------------------------------------------------------------

export const loginRequestSchema = v.object({
    email: v.pipe(v.string(), v.email()),
});

export type LoginRequest = v.InferOutput<typeof loginRequestSchema>;

export const loginAuthSchema = v.object({
    token: v.string(),
});

export type LoginAuth = v.InferOutput<typeof loginAuthSchema>;

export const loginInfoContentSchema = v.object({
    userId: v.optional(idSchema),
});

export const loginInfoSchema = v.object({
    meta: DBContainerMetaSchema,
    data: loginInfoContentSchema,
});

export type LoginInfoContent = v.InferOutput<typeof loginInfoContentSchema>;
export type LoginInfo = v.InferOutput<typeof loginInfoSchema>;

// -----------------------------------------------------------------------------
// ネットワーク層関連型
// -----------------------------------------------------------------------------

export abstract class IFetch {
    abstract getJson(path: string): Promise<Response>;
    abstract postJson(path: string, body: object): Promise<Response>;
    abstract putJson(path: string, body: object): Promise<Response>;
}

//
// APIレスポンス関連型
//

// 共通レスポンス型
export type ApiResponse = ApiSuccessResponse | ApiFailResponse;

// 成功レスポンス
export const apiSuccessResponseSchema = v.object({
    status: v.picklist(["success"]),
    data: v.unknown(),
});

export type ApiSuccessResponse = v.InferOutput<typeof apiSuccessResponseSchema>;

export const apiErrorInfoSchema = v.object({
    code: v.string(), // エラーコード
    message: v.string(), // エラーメッセージ（日本語）
    details: v.optional(v.string()), // stack traceなど
    input: v.optional(v.string()), // 入力データ（任意）
});

// 失敗レスポンス
export const apiFailResponseSchema = v.object({
    status: v.picklist(["fail"]),
    error_info: apiErrorInfoSchema,
    data: v.optional(v.unknown()),
});

export type ApiErrorInfo = v.InferOutput<typeof apiErrorInfoSchema>;
export type ApiFailResponse = v.InferOutput<typeof apiFailResponseSchema>;


// API呼び出し成功時のレスポンスボディ型
export type ApiResponseData = ApiTasks | ApiTask | ApiVoid | ApiAnalyze | ApiUserSettings | ApiAuthSuccess;

// タスク一覧取得のレスポンスボディ
export const apiTasksSchema = tasksSchema;

export function apiReadAllSchema<T>(schema: Schema<T>) {
    return v.array(DBContainerSchema(schema));
}

export type ApiTasks = v.InferOutput<typeof apiTasksSchema>;

// タスク単体取得のレスポンスボディ
export const apiTaskSchema = taskSchema;

export type ApiTask = v.InferOutput<typeof apiTaskSchema>;

// タスク単体作成・更新のレスポンスボディ
export const apiVoidSchema = v.object({
    type: v.picklist(["void"]),
});

export type ApiVoid = v.InferOutput<typeof apiVoidSchema>;

// LLM解析のレスポンスボディ
export interface ApiAnalyze {
    type: "analyze";
    tasks: TaskCreate[]; // 解析結果の複数タスク
}

// ユーザー設定のレスポンスボディ
export const apiUserSettingsSchema = userSettingsSchema;
export type ApiUserSettings = v.InferOutput<typeof apiUserSettingsSchema>;

// 認証成功のレスポンスボディ
export const apiAuthSuccessSchema = v.object({
    type: v.picklist(["auth-success"]),
    userId: idSchema,
});

export type ApiAuthSuccess = v.InferOutput<typeof apiAuthSuccessSchema>;

// -----------------------------------------------------------------------------
// 永続化層関連型
// -----------------------------------------------------------------------------

export type Schema<T> = v.BaseSchema<unknown, T, v.BaseIssue<unknown>>;

export abstract class IPersistent<T> {
    abstract get items(): DBContainer<T>[];
    abstract sync(onComplete: OnComplete<DBContainer<T>[]>): void;
    abstract create(item: DBContainer<T>, onError: OnError): void;
    abstract update(item: DBContainer<T>, onError: OnError): void;
}

// -----------------------------------------------------------------------------
// ビジネス層
// -----------------------------------------------------------------------------






// ========================================
// Database Schema関連の型
// ========================================

export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    timezone: integer("timezone").notNull().default(0),
    daily_goal_heavy: integer("daily_goal_heavy").notNull().default(1),
    daily_goal_medium: integer("daily_goal_medium").notNull().default(2),
    daily_goal_light: integer("daily_goal_light").notNull().default(3),
    version: integer("version").notNull().default(1),
    created_at: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
    updated_at: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const tasks = sqliteTable("tasks", {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull(),
    title: text("title", { length: 500 }).notNull(),
    weight: text("weight", { enum: ["light", "medium", "heavy"] }),
    due_date: text("due_date"),
    completed_at: text("completed_at"),
    is_deleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
    version: integer("version").notNull().default(1),
    created_at: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
    updated_at: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const auth_tokens = sqliteTable("auth_tokens", {
    token: text("token").primaryKey(),
    email: text("email").notNull(),
    created_at: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});

// -----------------------------------------------------------------------------
// Durable Object用の型（バックエンド専用）
// -----------------------------------------------------------------------------

// ログ種別
type LogType = "TASK_OPERATION" | "LLM_PROCESS";

// タスク操作種別
type TaskOperationType = "CREATE" | "UPDATE" | "DELETE";

// LLM処理種別
type LLMProcessType = "ANALYZE" | "COMPLEMENT" | "WEIGHT_ESTIMATION";

// 基底ログエントリ
interface BaseLogEntry {
    id: string; // ログID（UUID）
    timestamp: Date; // 記録日時
    type: LogType; // ログ種別
}

// タスク操作ログ
interface TaskOperationLog extends BaseLogEntry {
    type: "TASK_OPERATION";
    taskId: string; // 対象タスクID
    operation: TaskOperationType; // 操作種別
    beforeValue?: Partial<Task>; // 変更前の値（UPDATE時）
    afterValue?: Partial<Task>; // 変更後の値（CREATE/UPDATE時）
}

// LLM処理ログ
interface LLMProcessLog extends BaseLogEntry {
    type: "LLM_PROCESS";
    processType: LLMProcessType; // 処理種別
    taskId?: string; // 関連タスクID（オプション）
    inputText: string; // 入力テキスト
    outputResult: any; // 出力結果
    modelName: string; // 使用モデル名
    tokenCount?: number; // 使用トークン数（オプション）
    processTimeMs?: number; // 処理時間（ミリ秒、オプション）
    success: boolean; // 成功フラグ
    errorMessage?: string; // エラーメッセージ（失敗時）
}

// 統合ログエントリ型
type LogEntry = TaskOperationLog | LLMProcessLog;

// ログストレージ
interface LogStorage {
    date: string; // YYYY-MM-DD形式の日付
    logs: LogEntry[]; // ログエントリ配列
}

// Durable Object全体の状態
export interface DurableObjectState {
    logStorage: LogStorage; // ログストレージ
}
