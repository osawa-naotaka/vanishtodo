// =============================================================================
// VanishToDo - Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// 基本型
// -----------------------------------------------------------------------------

// タスクの重さ
export type TaskWeight = "light" | "medium" | "heavy";

// タスクタイトル（LLM解析のリクエスト用）
type TaskTitle = {
    title: string; // タスクタイトル（1-500文字、解析対象テキスト）
};

// -----------------------------------------------------------------------------
// 永続化層関連型
// -----------------------------------------------------------------------------

export type DBContainer<T> = {
    id: string; // タスクID（UUIDv4、永続化層で生成）
    version: number; // 楽観的ロック用バージョン番号(永続化層で生成、DB層で検証)
    createdAt: string; // 作成日時 (永続化層で生成)
    updatedAt: string; // 更新日時（永続化層で生成）
    data: T; // 実際のデータ
};

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
// タスク関連型
// -----------------------------------------------------------------------------

// タスク作成・更新入力（クライアント → サーバー）
export type TaskCreateContent = {
    title: string; // タスクタイトル（1-500文字）
    weight?: TaskWeight; // 重さ
    dueDate?: string; // 締切日
};

// タスク削除入力（クライアント → サーバー）
type TaskDeleteInput = {
    version: number; // 楽観的ロック用バージョン番号
};

// タスク（サーバー → クライアント、DB格納データ）
export type TaskContent = {
    title: string; // タスクタイトル
    weight?: TaskWeight; // 重さ
    dueDate?: string; // 締切日
    completedAt?: string; // 完了日時（undefinedの場合は未完了）
    isDeleted: boolean; // 削除フラグ
};

export type Task = DBContainer<TaskContent>;

// LLM解析結果の個別タスク入力（TaskCreateUpdateInputと同じ構造）
type TaskInput = TaskCreateContent;

// -----------------------------------------------------------------------------
// API レスポンス型
// -----------------------------------------------------------------------------

// 共通レスポンス型
type ApiResponse = ApiSuccessResponse | ApiFailResponse;

// 成功レスポンス
interface ApiSuccessResponse {
    status: "success";
    data: ApiResponseData;
}

// 失敗レスポンス
interface ApiFailResponse {
    status: "fail";
    error: {
        code: string; // エラーコード
        message: string; // エラーメッセージ（日本語）
        details?: Record<string, string>; // フィールド別のエラーメッセージ（省略可能）
    };
}

// API呼び出し成功時のレスポンスボディ型
type ApiResponseData = ApiTasks | ApiTask | ApiAnalyze | ApiUserSettings;

// タスク一覧取得のレスポンスボディ
interface ApiTasks {
    type: "tasks";
    tasks: Task[];
}

// タスク単体操作（作成・取得・更新）のレスポンスボディ
interface ApiTask {
    type: "task";
    task: Task;
}

// LLM解析のレスポンスボディ
interface ApiAnalyze {
    type: "analyze";
    tasks: TaskInput[]; // 解析結果の複数タスク
}

// ユーザー設定のレスポンスボディ
interface ApiUserSettings {
    type: "settings";
    settings: UserSettings;
}

// -----------------------------------------------------------------------------
// ユーザー設定型
// -----------------------------------------------------------------------------

// ユーザー設定（サーバー → クライアント）
type UserSettingsContent = {
    dailyGoals: {
        heavy: number; // 重タスク目標数（0-20）
        medium: number; // 中タスク目標数（0-20）
        light: number; // 軽タスク目標数（0-20）
    };
};

type UserSettings = DBContainer<UserSettingsContent>;

// -----------------------------------------------------------------------------
// UI用の追加型（フロントエンド専用）
// -----------------------------------------------------------------------------

// フィルタ種別
type FilterType = "ALL" | "HEAVY" | "MEDIUM" | "LIGHT" | "DEADLINE";

// 表示設定
interface DisplayConfig {
    limits: {
        heavy: number; // 重タスク表示上限
        medium: number; // 中タスク表示上限
        light: number; // 軽タスク表示上限
    };
    currentFilter: FilterType; // 現在のフィルタ
    showCompletedToday: boolean; // 本日完了分表示フラグ
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
interface DurableObjectState {
    logStorage: LogStorage; // ログストレージ
}
