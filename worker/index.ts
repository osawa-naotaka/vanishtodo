import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ApiFailResponse, ApiResponseData, ApiSuccessResponse, ApiTasks, DBTask, Task } from "../type/types";

type Bindings = {
    DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors());

// ========================================
// ユーティリティ関数
// ========================================

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

function dbTaskToTask(dbTask: DBTask): Task {
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
            isDeleted: dbTask.is_deleted !== 0,
        },
    };
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

export default app;
