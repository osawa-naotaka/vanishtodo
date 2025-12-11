// =============================================================================
// VanishToDo - Type Definitions
// =============================================================================

import * as v from "valibot";

// -----------------------------------------------------------------------------
// 基本型
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// エラー型
// -----------------------------------------------------------------------------


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

// タスク（DB格納データ）
export const taskContentSchema = v.object({
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
export const taskInputSchema = v.object({
    title: taskTitleSchema,
    weight: v.optional(taskWeightSchema),
    dueDate: v.optional(dateSchema)
});

export type TaskInput = v.InferOutput<typeof taskInputSchema>;


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
});

export type ApiErrorInfo = v.InferOutput<typeof apiErrorInfoSchema>;
export type ApiFailResponse = v.InferOutput<typeof apiFailResponseSchema>;


// API呼び出し成功時のレスポンスボディ型
export type ApiResponseData = ApiTasks | ApiTask | ApiAnalyze | ApiUserSettings;

// タスク一覧取得のレスポンスボディ
export const apiTasksSchema = v.object({
    type: v.picklist(["tasks"]),
    tasks: tasksSchema,
});

export type ApiTasks = v.InferOutput<typeof apiTasksSchema>;

// タスク単体操作（作成・取得・更新）のレスポンスボディ
export const apiTaskSchema = v.object({
    type: v.picklist(["task"]),
    task: taskSchema,
});

export type ApiTask = v.InferOutput<typeof apiTaskSchema>;

// LLM解析のレスポンスボディ
export interface ApiAnalyze {
    type: "analyze";
    tasks: TaskInput[]; // 解析結果の複数タスク
}

// ユーザー設定のレスポンスボディ
export interface ApiUserSettings {
    type: "settings";
    settings: UserSettings;
}



// -----------------------------------------------------------------------------
// 永続化層関連型
// -----------------------------------------------------------------------------

// 戻り値
export type PersistentStatus = "success" | "abort" | "recoverable" | "conflict" | "fatal";
export type PersistentErrorStatus = Exclude<PersistentStatus, "success">;

export type PersistentResult<T> = PersistentSuccess<T> | PersistentFail<T>;

export type PersistentSuccess<T> = {
    status: "success";
    data: T;
}

export type PersistentFail<T> = {
    status: PersistentErrorStatus;
    error_info: ApiErrorInfo;
    data: T;
}


export type BaseSchemaType = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

export abstract class IPersistent {
    abstract get items(): Task[];
    abstract generateItem<T>(data: T): DBContainer<T>;
    abstract readTasks(): Promise<PersistentResult<Task[]>>;
    abstract touchItem<T>(item: DBContainer<T>): DBContainer<T>;
    abstract writeTask(item: Task, onError: (r: PersistentResult<null>) => void): Task[];
}

type Model = {
    user_settings: UserSettings; // ユーザー設定
    tasks: Task[]; // タスク一覧
};

type Status<T> = {
    code: T;
    model: Model;
};

type CmdLoadTasks = {
    inst: "LOAD_TASKS";
};

type CmdWriteTask = {
    inst: "WRITE_TASK";
    item: Task;
};

type CmdLoadUserSettings = {
    inst: "LOAD_USER_SETTINGS";
};

type CmdWriteUserSettings = {
    inst: "WRITE_USER_SETTINGS";
    item: UserSettings;
};

type QueueCmd = CmdLoadTasks | CmdWriteTask | CmdLoadUserSettings | CmdWriteUserSettings;

type Queue = QueueCmd[];

type UpdatePolicy = "USE_DB" | "USE_LOCAL";

type DBStatus = Status<"OK" | "NETWORK_ERROR" | "DB_INTERNAL_ERROR" | "CONFLICT">;

declare function initLocalStorage(): Model;
declare function loadDB(policy: UpdatePolicy): Promise<DBStatus>;

declare function generateItem<T>(data: T): DBContainer<T>;

declare function writeTask(item: Task, onError: (e: DBStatus) => void): Model;

declare function writeUserSettings(item: UserSettings, onError: (e: DBStatus) => void): Model;

declare function syncQueue(policy: UpdatePolicy, queue: Queue): DBStatus;



// -----------------------------------------------------------------------------
// ビジネス層
// -----------------------------------------------------------------------------




// -----------------------------------------------------------------------------
// ユーザー設定型
// -----------------------------------------------------------------------------

// タスク目標数 0~20
export const NumDailyGoalsTypeSchema = v.pipe(v.number(), v.minValue(0), v.maxValue(20));

// ユーザー設定（サーバー → クライアント）
export const UserSettingsContentSchema = v.object({
    dailyGoals: v.object({
        timezone: v.number(),
        heavy: NumDailyGoalsTypeSchema, // 重タスク目標数（0-20）
        medium: NumDailyGoalsTypeSchema, // 中タスク目標数（0-20）
        light: NumDailyGoalsTypeSchema, // 軽タスク目標数（0-20）
    }),
});

export type UserSettings = DBContainer<v.InferOutput<typeof UserSettingsContentSchema>>;


// ========================================
// Database Schema関連の型
// ========================================

export interface DBUser {
    id: string;
    timezone: number;
    heavy: number;
    medium: number;
    light: number;
    created_at: string;
    updated_at: string;
}

export interface DBTask {
    id: string;
    title: string;
    weight: "light" | "medium" | "heavy" | null;
    due_date: string | null;
    completed_at: string | null;
    is_deleted: number;
    version: number;
    created_at: string;
    updated_at: string;
}

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
