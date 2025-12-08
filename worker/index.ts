import { Hono } from "hono";
import { cors } from "hono/cors";
import { v4 as uuidv4 } from "uuid";
import type {
    ApiAnalyze,
    ApiFailResponse,
    ApiResponse,
    ApiTask,
    ApiTasks,
    ApiUserSettings,
    DBTask,
    DBUser,
    Task,
    TaskCreateInput,
    TaskDeleteInput,
    TaskTitle,
    TaskUpdateInput,
    UserSettings,
    UserSettingsUpdate,
} from "./types";

type Bindings = {
    DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors());

// ========================================
// ユーティリティ関数
// ========================================

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

function errorResponse(code: string, message: string, status: number, details?: Record<string, string>): Response {
    const response: ApiFailResponse = {
        status: "fail",
        error: {
            code,
            message,
            ...(details && { details }),
        },
    };
    return new Response(JSON.stringify(response), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function successResponse<T>(data: T, status = 200): Response {
    const response: ApiResponse<T> = {
        status: "success",
        data,
    };
    return new Response(JSON.stringify(response), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function dbTaskToTask(dbTask: DBTask): Task {
    return {
        id: dbTask.id,
        title: dbTask.title,
        weight: dbTask.weight as Task["weight"],
        dueDate: dbTask.due_date,
        completedAt: dbTask.completed_at,
        isDeleted: dbTask.is_deleted === 1,
        version: dbTask.version,
        createdAt: dbTask.created_at,
        updatedAt: dbTask.updated_at,
    };
}

function dbUserToUserSettings(dbUser: DBUser): UserSettings {
    return {
        id: dbUser.id,
        dailyGoals: {
            heavy: dbUser.daily_goal_heavy,
            medium: dbUser.daily_goal_medium,
            light: dbUser.daily_goal_light,
        },
        displayLimits: {
            heavy: 3,
            medium: 5,
            light: 5,
        },
        createdAt: dbUser.created_at,
        updatedAt: dbUser.updated_at,
    };
}

function validateTaskInput(input: TaskCreateInput | TaskUpdateInput): Record<string, string> | null {
    const errors: Record<string, string> = {};

    if (!input.title || input.title.trim().length === 0) {
        errors.title = "タイトルは必須です";
    } else if (input.title.length > 500) {
        errors.title = "タイトルは500文字以内で入力してください";
    }

    if (input.weight !== undefined && input.weight !== null) {
        if (!["heavy", "medium", "light"].includes(input.weight)) {
            errors.weight = "重さはheavy, medium, lightのいずれかを指定してください";
        }
    }

    if (input.weight !== undefined && input.weight !== null && input.dueDate !== undefined && input.dueDate !== null) {
        errors.weight = "重さと締切日を同時に設定することはできません";
        errors.dueDate = "重さと締切日を同時に設定することはできません";
    }

    if (input.dueDate !== undefined && input.dueDate !== null) {
        const dueDate = new Date(input.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dueDate < today) {
            errors.dueDate = "締切日は本日以降の日付を指定してください";
        }
    }

    return Object.keys(errors).length > 0 ? errors : null;
}

// ========================================
// API-001: タスク一覧取得
// ========================================
app.get("/api/v1/tasks", async (c) => {
    try {
        const result = await c.env.DB.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all<DBTask>();

        const tasks = result.results.map(dbTaskToTask);

        const response: ApiTasks = {
            type: "tasks",
            tasks,
        };

        return successResponse(response);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return errorResponse("INTERNAL_ERROR", "サーバーエラーが発生しました", 500);
    }
});

// ========================================
// API-002: タスク単体取得
// ========================================
app.get("/api/v1/tasks/:id", async (c) => {
    try {
        const id = c.req.param("id");

        const result = await c.env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(id).first<DBTask>();

        if (!result) {
            return errorResponse("NOT_FOUND", "タスクが見つかりません", 404);
        }

        const task = dbTaskToTask(result);

        const response: ApiTask = {
            type: "task",
            task,
        };

        return successResponse(response);
    } catch (error) {
        console.error("Error fetching task:", error);
        return errorResponse("INTERNAL_ERROR", "サーバーエラーが発生しました", 500);
    }
});

// ========================================
// API-003: タスク作成
// ========================================
app.post("/api/v1/tasks", async (c) => {
    try {
        const input = await c.req.json<TaskCreateInput>();

        const errors = validateTaskInput(input);
        if (errors) {
            return errorResponse("VALIDATION_ERROR", "入力内容に誤りがあります", 400, errors);
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        await c.env.DB.prepare(
            `INSERT INTO tasks (id, title, weight, due_date, completed_at, is_deleted, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
            .bind(id, input.title, input.weight || null, input.dueDate || null, null, 0, 1, now, now)
            .run();

        const result = await c.env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(id).first<DBTask>();

        if (!result) {
            return errorResponse("INTERNAL_ERROR", "サーバーエラーが発生しました", 500);
        }

        const task = dbTaskToTask(result);

        const response: ApiTask = {
            type: "task",
            task,
        };

        return successResponse(response, 201);
    } catch (error) {
        console.error("Error creating task:", error);
        return errorResponse("INTERNAL_ERROR", "サーバーエラーが発生しました", 500);
    }
});

// ========================================
// API-004: タスク更新
// ========================================
app.put("/api/v1/tasks/:id", async (c) => {
    try {
        const id = c.req.param("id");
        const force = c.req.query("force") === "true";
        const input = await c.req.json<TaskUpdateInput>();

        const errors = validateTaskInput(input);
        if (errors) {
            return errorResponse("VALIDATION_ERROR", "入力内容に誤りがあります", 400, errors);
        }

        const existing = await c.env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(id).first<DBTask>();

        if (!existing) {
            return errorResponse("NOT_FOUND", "タスクが見つかりません", 404);
        }

        if (!force && existing.version !== input.version) {
            return errorResponse("CONFLICT", "タスクが他で更新されています。ページをリロードしてください。", 409);
        }

        const now = new Date().toISOString();
        const newVersion = existing.version + 1;

        await c.env.DB.prepare(
            `UPDATE tasks
       SET title = ?, weight = ?, due_date = ?, completed_at = ?, is_deleted = ?, version = ?, updated_at = ?
       WHERE id = ?`,
        )
            .bind(input.title, input.weight || null, input.dueDate || null, input.completedAt || null, input.isDeleted ? 1 : 0, newVersion, now, id)
            .run();

        const result = await c.env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(id).first<DBTask>();

        if (!result) {
            return errorResponse("INTERNAL_ERROR", "サーバーエラーが発生しました", 500);
        }

        const task = dbTaskToTask(result);

        const response: ApiTask = {
            type: "task",
            task,
        };

        return successResponse(response);
    } catch (error) {
        console.error("Error updating task:", error);
        return errorResponse("INTERNAL_ERROR", "サーバーエラーが発生しました", 500);
    }
});

// ========================================
// API-005: タスク削除
// ========================================
app.delete("/api/v1/tasks/:id", async (c) => {
    try {
        const id = c.req.param("id");
        const input = await c.req.json<TaskDeleteInput>();

        const existing = await c.env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(id).first<DBTask>();

        if (!existing) {
            return errorResponse("NOT_FOUND", "タスクが見つかりません", 404);
        }

        if (existing.version !== input.version) {
            return errorResponse("CONFLICT", "タスクが他で更新されています。ページをリロードしてください。", 409);
        }

        await c.env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(id).run();

        return new Response(null, { status: 204 });
    } catch (error) {
        console.error("Error deleting task:", error);
        return errorResponse("INTERNAL_ERROR", "サーバーエラーが発生しました", 500);
    }
});

// ========================================
// API-006: タスク解析（LLM処理）
// ========================================
app.post("/api/v1/tasks/analyze", async (c) => {
    try {
        const input = await c.req.json<TaskTitle>();

        if (!input.title || input.title.length === 0) {
            return errorResponse("VALIDATION_ERROR", "入力内容に誤りがあります", 400, { title: "タイトルは必須です" });
        }

        if (input.title.length > 2000) {
            return errorResponse("VALIDATION_ERROR", "入力内容に誤りがあります", 400, { title: "タイトルは2000文字以内で入力してください" });
        }

        // LLM処理は将来実装
        // 現時点では、入力テキストを行で分割してタスクとして返す
        const tasks = input.title
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => ({
                title: line,
                weight: null as null,
            }));

        const response: ApiAnalyze = {
            type: "analyze",
            tasks,
        };

        return successResponse(response);
    } catch (error) {
        console.error("Error analyzing task:", error);
        return errorResponse("INTERNAL_ERROR", "サーバーエラーが発生しました", 500);
    }
});

// ========================================
// API-007: ユーザー設定取得
// ========================================
app.get("/api/v1/settings", async (c) => {
    try {
        const result = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(DEFAULT_USER_ID).first<DBUser>();

        if (!result) {
            return errorResponse("INTERNAL_ERROR", "サーバーエラーが発生しました", 500);
        }

        const settings = dbUserToUserSettings(result);

        const response: ApiUserSettings = {
            type: "settings",
            settings,
        };

        return successResponse(response);
    } catch (error) {
        console.error("Error fetching settings:", error);
        return errorResponse("INTERNAL_ERROR", "サーバーエラーが発生しました", 500);
    }
});

// ========================================
// API-008: ユーザー設定更新
// ========================================
app.put("/api/v1/settings", async (c) => {
    try {
        const input = await c.req.json<UserSettingsUpdate>();

        const errors: Record<string, string> = {};

        if (input.dailyGoals) {
            if (
                input.dailyGoals.heavy < 0 ||
                input.dailyGoals.heavy > 10 ||
                input.dailyGoals.medium < 0 ||
                input.dailyGoals.medium > 10 ||
                input.dailyGoals.light < 0 ||
                input.dailyGoals.light > 10
            ) {
                errors.dailyGoals = "日次目標は0〜10の範囲で入力してください";
            }
        }

        if (input.displayLimits) {
            if (
                input.displayLimits.heavy < 1 ||
                input.displayLimits.heavy > 20 ||
                input.displayLimits.medium < 1 ||
                input.displayLimits.medium > 20 ||
                input.displayLimits.light < 1 ||
                input.displayLimits.light > 20
            ) {
                errors.displayLimits = "表示上限は1〜20の範囲で入力してください";
            }
        }

        if (Object.keys(errors).length > 0) {
            return errorResponse("VALIDATION_ERROR", "入力内容に誤りがあります", 400, errors);
        }

        const existing = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(DEFAULT_USER_ID).first<DBUser>();

        if (!existing) {
            return errorResponse("INTERNAL_ERROR", "サーバーエラーが発生しました", 500);
        }

        const now = new Date().toISOString();

        if (input.dailyGoals) {
            await c.env.DB.prepare(
                `UPDATE users
         SET daily_goal_heavy = ?, daily_goal_medium = ?, daily_goal_light = ?, updated_at = ?
         WHERE id = ?`,
            )
                .bind(input.dailyGoals.heavy, input.dailyGoals.medium, input.dailyGoals.light, now, DEFAULT_USER_ID)
                .run();
        }

        const result = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(DEFAULT_USER_ID).first<DBUser>();

        if (!result) {
            return errorResponse("INTERNAL_ERROR", "サーバーエラーが発生しました", 500);
        }

        const settings = dbUserToUserSettings(result);

        const response: ApiUserSettings = {
            type: "settings",
            settings,
        };

        return successResponse(response);
    } catch (error) {
        console.error("Error updating settings:", error);
        return errorResponse("INTERNAL_ERROR", "サーバーエラーが発生しました", 500);
    }
});

export default app;
