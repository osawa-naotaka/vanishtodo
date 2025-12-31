import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { cors } from "hono/cors";
import * as v from "valibot";
import type { ApiErrorInfo, ApiFailResponse, ApiResponseData, ApiSuccessResponse, ApiVoid, Task, UserSetting } from "../type/types";
import { loginRequestSchema, taskSchema, tasks, userSettingSchema, users } from "../type/types";
import { Resend } from "resend";

type Bindings = {
    DB: D1Database;
    AI: Ai;
    RESENDN_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors());

// ========================================
// ユーティリティ関数
// ========================================

function errorResponse(status: number, error_info: ApiErrorInfo): Response {
    const response: ApiFailResponse = {
        status: "fail",
        error_info,
    };
    return new Response(JSON.stringify(response), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function successResponse(data: ApiResponseData, status = 200): Response {
    const response: ApiSuccessResponse = {
        status: "success",
        data,
    };
    return new Response(JSON.stringify(response), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function dbTaskToTask(dbTask: typeof tasks.$inferSelect): Task {
    return {
        meta: {
            id: dbTask.id,
            version: dbTask.version,
            createdAt: dbTask.created_at,
            updatedAt: dbTask.updated_at,
        },
        data: {
            title: dbTask.title,
            weight: dbTask.weight || undefined,
            dueDate: dbTask.due_date || undefined,
            completedAt: dbTask.completed_at || undefined,
            isDeleted: dbTask.is_deleted !== false,
        },
    };
}

function taskToDbTask(task: Task): typeof tasks.$inferInsert {
    return {
        id: task.meta.id,
        title: task.data.title,
        weight: task.data.weight || null,
        due_date: task.data.dueDate || null,
        completed_at: task.data.completedAt || null,
        is_deleted: task.data.isDeleted,
        version: task.meta.version,
        created_at: task.meta.createdAt,
        updated_at: task.meta.updatedAt,
    };
}

function dbUserToUser(dbUser: typeof users.$inferSelect): UserSetting {
    return {
        meta: {
            id: dbUser.id,
            version: dbUser.version,
            createdAt: dbUser.created_at,
            updatedAt: dbUser.updated_at,
        },
        data: {
            timezone: dbUser.timezone,
            dailyGoals: {
                heavy: dbUser.daily_goal_heavy,
                medium: dbUser.daily_goal_medium,
                light: dbUser.daily_goal_light,
            },
        },
    };
}

function userToDbUser(user: UserSetting): typeof users.$inferInsert {
    return {
        id: user.meta.id,
        timezone: user.data.timezone,
        daily_goal_heavy: user.data.dailyGoals.heavy,
        daily_goal_medium: user.data.dailyGoals.medium,
        daily_goal_light: user.data.dailyGoals.light,
        version: user.meta.version,
        created_at: user.meta.createdAt,
        updated_at: user.meta.updatedAt,
    };
}

// ========================================
// API-001: タスク一覧取得
// ========================================
app.get("/api/v1/tasks", async (c) => {
    try {
        const db = drizzle(c.env.DB);
        const result = await db.select().from(tasks).orderBy(desc(tasks.created_at));

        const response = result.map(dbTaskToTask);

        return successResponse(response);
    } catch (error: unknown) {
        let details = "";
        if (error instanceof Error) {
            details = error.stack || error.message;
        }
        return errorResponse(500, {
            code: "INTERNAL_ERROR",
            message: "/api/v1/tasksの取得中にサーバー側のロジック異常が検出されました",
            details,
        });
    }
});

// ========================================
// API-004: タスク更新
// ========================================
app.put("/api/v1/tasks/:id", async (c) => {
    try {
        const taskId = c.req.param("id");
        const requestBody = await c.req.json();

        // バリデーション
        const parseResult = v.safeParse(taskSchema, requestBody);
        if (!parseResult.success) {
            return errorResponse(400, {
                code: "VALIDATION_ERROR",
                message: "入力内容に誤りがあります",
                details: parseResult.issues.map((issue) => issue.message).join("; "),
                input: JSON.stringify(requestBody),
            });
        }

        const updateData = parseResult.output;

        const db = drizzle(c.env.DB);

        // 既存タスクの取得
        const existingTask = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);

        if (existingTask.length === 0) {
            return errorResponse(400, {
                code: "NOT_FOUND",
                message: "タスクが見つかりません",
            });
        }

        // 楽観的ロックのチェック
        const force = c.req.query("force") === "true";
        if (!force && existingTask[0].version + 1 !== updateData.meta.version) {
            return errorResponse(400, {
                code: "CONFLICT",
                message: "タスクが他で更新されています。ページをリロードしてください。",
                input: `${existingTask[0].version}|${updateData.meta.version}`,
            });
        }

        await db.update(tasks).set(taskToDbTask(updateData)).where(eq(tasks.id, taskId));

        const response: ApiVoid = {
            type: "void",
        };

        return successResponse(response);
    } catch (error) {
        console.error("Error updating task:", error);
        return errorResponse(500, {
            code: "INTERNAL_ERROR",
            message: "サーバーエラーが発生しました",
        });
    }
});

// ========================================
// API-003: タスク作成
// ========================================
app.post("/api/v1/tasks", async (c) => {
    try {
        const requestBody = await c.req.json();

        // バリデーション
        const parseResult = v.safeParse(taskSchema, requestBody);
        if (!parseResult.success) {
            return errorResponse(400, {
                code: "VALIDATION_ERROR",
                message: "入力内容に誤りがあります",
                details: parseResult.issues.map((issue) => issue.message).join("; "),
                input: JSON.stringify(requestBody),
            });
        }

        const createData = parseResult.output;

        const db = drizzle(c.env.DB);

        await db.insert(tasks).values(taskToDbTask(createData));

        const response: ApiVoid = {
            type: "void",
        };

        return successResponse(response);
    } catch (error) {
        console.error("Error updating task:", error);
        return errorResponse(500, {
            code: "INTERNAL_ERROR",
            message: "サーバーエラーが発生しました",
        });
    }
});

// ========================================
// API-007: ユーザー設定取得
// ========================================
app.get("/api/v1/setting", async (c) => {
    try {
        const db = drizzle(c.env.DB);
        const result = await db.select().from(users);

        const response = result.map(dbUserToUser);

        return successResponse(response);
    } catch (error: unknown) {
        let details = "";
        if (error instanceof Error) {
            details = error.stack || error.message;
        }
        return errorResponse(500, {
            code: "INTERNAL_ERROR",
            message: "/api/v1/settingsの取得中にサーバー側のロジック異常が検出されました",
            details,
        });
    }
});

// ========================================
// API-008: ユーザー設定更新
// ========================================
app.put("/api/v1/setting/:id", async (c) => {
    try {
        const settingId = c.req.param("id");
        const requestBody = await c.req.json();

        // バリデーション
        const parseResult = v.safeParse(userSettingSchema, requestBody);
        if (!parseResult.success) {
            return errorResponse(400, {
                code: "VALIDATION_ERROR",
                message: "入力内容に誤りがあります",
                details: parseResult.issues.map((issue) => issue.message).join("; "),
                input: JSON.stringify(requestBody),
            });
        }

        const updateData = parseResult.output;

        const db = drizzle(c.env.DB);

        // 既存タスクの取得
        const existingTask = await db.select().from(users).where(eq(users.id, settingId)).limit(1);

        if (existingTask.length === 0) {
            return errorResponse(400, {
                code: "NOT_FOUND",
                message: "ユーザー設定が見つかりません",
            });
        }

        // 楽観的ロックのチェック
        const force = c.req.query("force") === "true";
        if (!force && existingTask[0].version + 1 !== updateData.meta.version) {
            return errorResponse(400, {
                code: "CONFLICT",
                message: "ユーザー設定が他で更新されています。ページをリロードしてください。",
                input: `${existingTask[0].version}|${updateData.meta.version}`,
            });
        }

        await db.update(users).set(userToDbUser(updateData)).where(eq(users.id, settingId));

        const response: ApiVoid = {
            type: "void",
        };

        return successResponse(response);
    } catch (error) {
        console.error("Error updating task:", error);
        return errorResponse(500, {
            code: "INTERNAL_ERROR",
            message: "サーバーエラーが発生しました",
        });
    }
});

// ========================================
// API-009: magic link送信
// ========================================
app.post("/api/v1/login", async (c) => {
    try {
        const requestBody = await c.req.json();

        // バリデーション
        const parseResult = v.safeParse(loginRequestSchema, requestBody);
        if (!parseResult.success) {
            return errorResponse(400, {
                code: "VALIDATION_ERROR",
                message: "入力内容に誤りがあります",
                details: parseResult.issues.map((issue) => issue.message).join("; "),
                input: JSON.stringify(requestBody),
            });
        }

        console.log("Magic link requested for email:", parseResult.output.email);
        /*
        const resend = new Resend(c.env.RESENDN_API_KEY);

        const { data } = await resend.emails.send({
            from: 'VanishToDo <vanishtodo@lulliecat.com>',
            to: [parseResult.output.email],
            subject: 'login link to VanishToDo',
            text: 'Click here to login: https://vanishtodo.lulliecat.com/login/magic-link?token=YOUR-TOKEN',
        });
        console.log("Magic link email sent:", data);
        */

        const response: ApiVoid = {
            type: "void",
        };

        return successResponse(response);
    } catch (error) {
        console.error("Error updating task:", error);
        return errorResponse(500, {
            code: "INTERNAL_ERROR",
            message: "サーバーエラーが発生しました",
        });
    }
});

export default app;
