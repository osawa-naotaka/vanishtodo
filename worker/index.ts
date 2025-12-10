import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ApiError, ApiFailResponse, ApiResponseData, ApiSuccessResponse, ApiTask, ApiTasks, Task } from "../type/types";
import { taskContentSchema } from "../type/types";
import * as v from "valibot";
import { drizzle } from "drizzle-orm/d1";
import { tasks } from "./schema";
import { desc, eq } from "drizzle-orm";

type Bindings = {
    DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors());

// ========================================
// ユーティリティ関数
// ========================================

function errorResponse(status: number, error?: ApiError): Response {
    const response: ApiFailResponse = {
        status: "fail",
        error,
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

// ========================================
// API-001: タスク一覧取得
// ========================================
app.get("/api/v1/tasks", async (c) => {
    try {
        const db = drizzle(c.env.DB);
        const result = await db.select().from(tasks).orderBy(desc(tasks.created_at));

        const taskList = result.map(dbTaskToTask);

        const response: ApiTasks = {
            type: "tasks",
            tasks: taskList,
        };

        return successResponse(response);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return errorResponse(500, {
            code: "INTERNAL_ERROR", 
            message: "サーバーエラーが発生しました"
        });
    }
});

app.put("/api/v1/tasks/:id", async (c) => {
    try {
        const taskId = c.req.param("id");
        const requestBody = await c.req.json();

        // バリデーション
        const parseResult = v.safeParse(taskContentSchema, requestBody);
        if (!parseResult.success) {
            return errorResponse(400, {
                code: "VALIDATION_ERROR",
                message: "入力内容に誤りがあります",
                details: parseResult.issues,
            });
        }

        const updateData = parseResult.output;
        const version = requestBody.version;

        if (typeof version !== "number" || version < 0) {
            return errorResponse(400, {
                code: "VALIDATION_ERROR",
                message: "バージョン番号が必要です",
            });
        }

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
        if (!force && existingTask[0].version !== version) {
            return errorResponse(400, {
                code: "CONFLICT",
                message: "タスクが他で更新されています。ページをリロードしてください。"
            });
        }

        // 更新処理
        const now = new Date().toISOString();
        const newVersion = existingTask[0].version + 1;

        await db.update(tasks)
            .set({
                title: updateData.title,
                weight: updateData.weight || null,
                due_date: updateData.dueDate || null,
                completed_at: updateData.completedAt || null,
                is_deleted: updateData.isDeleted,
                version: newVersion,
                updated_at: now,
            })
            .where(eq(tasks.id, taskId));

        // 更新後のタスクを取得
        const updatedTask = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);

        const response: ApiTask = {
            type: "task",
            task: dbTaskToTask(updatedTask[0]),
        };

        return successResponse(response);
    } catch (error) {
        console.error("Error updating task:", error);
        return errorResponse(500, {
            code: "INTERNAL_ERROR",
            message: "サーバーエラーが発生しました"
        });
    }
});

export default app;
