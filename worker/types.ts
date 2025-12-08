/**
 * VanishToDo Types
 * 共通の型定義ファイル
 */

// ========================================
// Task関連の型
// ========================================

export type TaskWeight = "heavy" | "medium" | "light";

export interface Task {
    id: string;
    title: string;
    weight: TaskWeight | null;
    dueDate: string | null;
    completedAt: string | null;
    isDeleted: boolean;
    version: number;
    createdAt: string;
    updatedAt: string;
}

export interface TaskCreateInput {
    title: string;
    weight?: TaskWeight | null;
    dueDate?: string | null;
}

export interface TaskUpdateInput {
    title: string;
    weight?: TaskWeight | null;
    dueDate?: string | null;
    completedAt?: string | null;
    isDeleted: boolean;
    version: number;
}

export interface TaskDeleteInput {
    version: number;
}

export interface TaskTitle {
    title: string;
}

export interface TaskInput {
    title: string;
    weight?: TaskWeight | null;
    dueDate?: string | null;
}

// ========================================
// UserSettings関連の型
// ========================================

export interface DailyGoals {
    heavy: number;
    medium: number;
    light: number;
}

export interface DisplayLimits {
    heavy: number;
    medium: number;
    light: number;
}

export interface UserSettings {
    id: string;
    dailyGoals: DailyGoals;
    displayLimits: DisplayLimits;
    createdAt: string;
    updatedAt: string;
}

export interface UserSettingsUpdate {
    dailyGoals?: DailyGoals;
    displayLimits?: DisplayLimits;
}

// ========================================
// API Response関連の型
// ========================================

export interface ApiSuccessResponse<T> {
    status: "success";
    data: T;
}

export interface ApiFailResponse {
    status: "fail";
    error: {
        code: string;
        message: string;
        details?: Record<string, string>;
    };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiFailResponse;

export interface ApiTask {
    type: "task";
    task: Task;
}

export interface ApiTasks {
    type: "tasks";
    tasks: Task[];
}

export interface ApiAnalyze {
    type: "analyze";
    tasks: TaskInput[];
}

export interface ApiUserSettings {
    type: "settings";
    settings: UserSettings;
}

// ========================================
// Database Schema関連の型
// ========================================

export interface DBUser {
    id: string;
    timezone: number;
    daily_goal_heavy: number;
    daily_goal_medium: number;
    daily_goal_light: number;
    created_at: string;
    updated_at: string;
}

export interface DBTask {
    id: string;
    title: string;
    weight: string | null;
    due_date: string | null;
    completed_at: string | null;
    is_deleted: number;
    version: number;
    created_at: string;
    updated_at: string;
}
