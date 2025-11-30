// =============================================================================
// VanishToDo - Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// 基本型
// -----------------------------------------------------------------------------

// タスクの重さ
type TaskWeight = "light" | "medium" | "heavy";

// タスクタイトル（LLM解析のリクエスト用）
type TaskTitle = {
    title: string;  // タスクタイトル（1-500文字、解析対象テキスト）
}

// -----------------------------------------------------------------------------
// タスク関連型
// -----------------------------------------------------------------------------

// タスク作成入力（クライアント → サーバー）
// サーバー生成フィールド（id, version, createdAt, updatedAt）は含まない
type TaskCreateInput = {
    title: string;                  // タスクタイトル（1-500文字）
    weight?: TaskWeight | null;     // 重さ（省略時null）
    dueDate?: Date | null;          // 締切日（省略時null）
}

// タスク更新入力（クライアント → サーバー）
// id, createdAt, updatedAt は更新不可
// version は楽観的ロック用に必須
type TaskUpdateInput = {
    title: string;                  // タスクタイトル（1-500文字）
    weight?: TaskWeight | null;     // 重さ
    dueDate?: Date | null;          // 締切日
    completedAt?: Date | null;      // 完了日時（nullでない場合は完了状態）
    isDeleted: boolean;             // 削除フラグ
    version: number;                // 楽観的ロック用バージョン番号
}

// タスク削除入力（クライアント → サーバー）
type TaskDeleteInput = {
    version: number;                // 楽観的ロック用バージョン番号
}

// タスク（サーバー → クライアント、DB格納データ）
type Task = {
    id: string;                     // タスクID（UUID、サーバー生成）
    title: string;                  // タスクタイトル
    weight?: TaskWeight | null;     // 重さ
    dueDate?: Date | null;          // 締切日
    completedAt?: Date | null;      // 完了日時（nullの場合は未完了）
    isDeleted: boolean;             // 削除フラグ
    version: number;                // 楽観的ロック用バージョン番号
    createdAt: Date;                // 作成日時（サーバー生成）
    updatedAt: Date;                // 更新日時（サーバー生成）
}

// LLM解析結果の個別タスク入力（TaskCreateInputと同じ構造）
type TaskInput = TaskCreateInput;

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
        code: string;                       // エラーコード
        message: string;                    // エラーメッセージ（日本語）
        details?: Record<string, string>;   // フィールド別のエラーメッセージ（省略可能）
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
    tasks: TaskInput[];  // 解析結果の複数タスク
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
interface UserSettings {
    id: string;                     // ユーザーID
    dailyGoals: {
        heavy: number;              // 重タスク目標数（0-20）
        medium: number;             // 中タスク目標数（0-20）
        light: number;              // 軽タスク目標数（0-20）
    };
    createdAt: Date;                // 作成日時
    updatedAt: Date;                // 更新日時
}

// ユーザー設定更新入力（クライアント → サーバー）
interface UserSettingsUpdate {
    dailyGoals?: {
        heavy?: number;             // 重タスク目標数（0-20）
        medium?: number;            // 中タスク目標数（0-20）
        light?: number;             // 軽タスク目標数（0-20）
    };
}

// -----------------------------------------------------------------------------
// UI用の追加型（フロントエンド専用）
// -----------------------------------------------------------------------------

// フィルタ種別
type FilterType = "ALL" | "HEAVY" | "MEDIUM" | "LIGHT" | "DEADLINE";

// 表示設定
interface DisplayConfig {
    limits: {
        heavy: number;              // 重タスク表示上限
        medium: number;             // 中タスク表示上限
        light: number;              // 軽タスク表示上限
    };
    currentFilter: FilterType;      // 現在のフィルタ
    showCompletedToday: boolean;    // 本日完了分表示フラグ
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
    id: string;                     // ログID（UUID）
    timestamp: Date;                // 記録日時
    type: LogType;                  // ログ種別
}

// タスク操作ログ
interface TaskOperationLog extends BaseLogEntry {
    type: "TASK_OPERATION";
    taskId: string;                 // 対象タスクID
    operation: TaskOperationType;   // 操作種別
    beforeValue?: Partial<Task>;    // 変更前の値（UPDATE時）
    afterValue?: Partial<Task>;     // 変更後の値（CREATE/UPDATE時）
}

// LLM処理ログ
interface LLMProcessLog extends BaseLogEntry {
    type: "LLM_PROCESS";
    processType: LLMProcessType;    // 処理種別
    taskId?: string;                // 関連タスクID（オプション）
    inputText: string;              // 入力テキスト
    outputResult: any;              // 出力結果
    modelName: string;              // 使用モデル名
    tokenCount?: number;            // 使用トークン数（オプション）
    processTimeMs?: number;         // 処理時間（ミリ秒、オプション）
    success: boolean;               // 成功フラグ
    errorMessage?: string;          // エラーメッセージ（失敗時）
}

// 統合ログエントリ型
type LogEntry = TaskOperationLog | LLMProcessLog;

// ログストレージ
interface LogStorage {
    date: string;                   // YYYY-MM-DD形式の日付
    logs: LogEntry[];               // ログエントリ配列
}

// Durable Object全体の状態
interface DurableObjectState {
    logStorage: LogStorage;                     // ログストレージ
}