import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { type Context, Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { cors } from "hono/cors";
import * as jose from "jose";
// import { Resend } from "resend";
import * as v from "valibot";
import type { ApiAuthSuccess, ApiErrorInfo, ApiFailResponse, ApiResponseData, ApiSuccessResponse, ApiVoid, CodeType, Task, UserSetting } from "../type/types";
import { auth_tokens, errorInfoMap, loginAuthSchema, loginRequestSchema, taskSchema, tasks, userSettingSchema, users } from "../type/types";

type Bindings = {
    DB: D1Database;
    AI: Ai;
    RESENDN_API_KEY: string;
    SECRET_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors());

// ========================================
// ユーティリティ関数
// ========================================

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
            userId: dbTask.user_id,
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
        user_id: task.data.userId,
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
            email: dbUser.email,
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
        email: user.data.email,
        timezone: user.data.timezone,
        daily_goal_heavy: user.data.dailyGoals.heavy,
        daily_goal_medium: user.data.dailyGoals.medium,
        daily_goal_light: user.data.dailyGoals.light,
        version: user.meta.version,
        created_at: user.meta.createdAt,
        updated_at: user.meta.updatedAt,
    };
}

const jwtPayloadSchema = v.object({
    userId: v.string(),
});

async function auth(c: Context<{ Bindings: Bindings }>): Promise<string | Response> {
    const jwt = getCookie(c, "vanishtodo_jwt");
    if (!jwt) {
        return createErrorResponse("no-cookie");
    }

    const secret = new TextEncoder().encode(c.env.SECRET_KEY);
    const { payload } = await jose.jwtVerify(jwt, secret);
    const parseResult = v.safeParse(jwtPayloadSchema, payload);
    if (!parseResult.success) {
        return createErrorResponse("malformed-jwt-payload");
    }
    const userId = parseResult.output.userId;

    return userId;
}

async function setJwtCookie(c: Context<{ Bindings: Bindings }>, userId: string): Promise<void> {
    const secret = new TextEncoder().encode(c.env.SECRET_KEY);
    const alg = "HS256";
    const jwt = await new jose.SignJWT({ userId }).setProtectedHeader({ alg }).setIssuedAt().setExpirationTime("30d").sign(secret);

    setCookie(c, "vanishtodo_jwt", jwt, { httpOnly: true, secure: true, sameSite: "Lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

function deleteJwtCookie(c: Context<{ Bindings: Bindings }>): void {
    deleteCookie(c, "vanishtodo_jwt", { httpOnly: true, secure: true, sameSite: "Lax", path: "/" });
}

type Handler = (c: Context<{ Bindings: Bindings }>) => Promise<Response>;

function withTryCatch(fn: Handler): Handler {
    return async (c) => {
        try {
            return fn(c);
        } catch (error: unknown) {
            let details = "";
            if (error instanceof Error) {
                details = error.stack || error.message;
            }
            return createErrorResponse("unknown-internal-error", details);
        }
    };
}

function createErrorResponse(code: CodeType, details?: string, input?: string): Response {
    const errorInfo = errorInfoMap[code];
    const error_info: ApiErrorInfo = {
        code,
        message: errorInfo[2],
    };
    if (details) {
        error_info.details = details;
    }
    if (input) {
        error_info.input = input;
    }
    const status = errorInfo[1];

    const response: ApiFailResponse = {
        status: "fail",
        error_info,
    };
    return new Response(JSON.stringify(response), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

// ========================================
// API-001: タスク一覧取得
// ========================================
app.get(
    "/api/v1/tasks",
    withTryCatch(async (c) => {
        const userId = await auth(c);
        if (userId instanceof Response) {
            return userId;
        }

        const db = drizzle(c.env.DB);
        const result = await db.select().from(tasks).where(eq(tasks.user_id, userId));
        const response = result.map(dbTaskToTask);

        return successResponse(response);
    }),
);

// ========================================
// API-004: タスク更新
// ========================================
app.put(
    "/api/v1/tasks",
    withTryCatch(async (c) => {
        const userId = await auth(c);
        if (userId instanceof Response) {
            return userId;
        }

        const requestBody = await c.req.json();

        // バリデーション
        const parseResult = v.safeParse(taskSchema, requestBody);
        if (!parseResult.success) {
            const details = parseResult.issues.map((issue) => issue.message).join("; ");
            const input = JSON.stringify(requestBody);
            return createErrorResponse("parse-error", details, input);
        }

        if (parseResult.output.data.userId !== userId) {
            return createErrorResponse("invalid-user-id", undefined, `${parseResult.output.data.userId}|${userId}`);
        }

        const updateData = parseResult.output;
        const taskId = updateData.meta.id;

        const db = drizzle(c.env.DB);

        // 既存タスクの取得
        const existingTask = await db
            .select()
            .from(tasks)
            .where(and(eq(tasks.id, taskId), eq(tasks.user_id, userId)));

        if (existingTask.length === 0) {
            return createErrorResponse("task-not-found");
        }

        if (existingTask.length > 1) {
            return createErrorResponse("task-duplicated");
        }

        // 楽観的ロックのチェック
        const force = c.req.query("force") === "true";
        if (!force && existingTask[0].version + 1 !== updateData.meta.version) {
            return createErrorResponse("version-conflict", undefined, `${existingTask[0].version}|${updateData.meta.version}`);
        }

        await db.update(tasks).set(taskToDbTask(updateData)).where(eq(tasks.id, taskId));

        const response: ApiVoid = {
            type: "void",
        };

        return successResponse(response);
    }),
);

// ========================================
// API-003: タスク作成
// ========================================
app.post(
    "/api/v1/tasks",
    withTryCatch(async (c) => {
        const userId = await auth(c);
        if (userId instanceof Response) {
            return userId;
        }

        const requestBody = await c.req.json();

        // バリデーション
        const parseResult = v.safeParse(taskSchema, requestBody);
        if (!parseResult.success) {
            const details = parseResult.issues.map((issue) => issue.message).join("; ");
            const input = JSON.stringify(requestBody);
            return createErrorResponse("parse-error", details, input);
        }
        if (parseResult.output.data.userId !== userId) {
            return createErrorResponse("invalid-user-id", undefined, `${parseResult.output.data.userId}|${userId}`);
        }
        const createData = parseResult.output;

        const db = drizzle(c.env.DB);

        await db.insert(tasks).values(taskToDbTask(createData));

        const response: ApiVoid = {
            type: "void",
        };

        return successResponse(response);
    }),
);

// ========================================
// API-007: ユーザー設定取得
// ========================================
app.get(
    "/api/v1/setting",
    withTryCatch(async (c) => {
        const userId = await auth(c);
        if (userId instanceof Response) {
            return userId;
        }

        const db = drizzle(c.env.DB);
        const result = await db.select().from(users).where(eq(users.id, userId));

        if (result.length === 0) {
            return createErrorResponse("task-not-found");
        }

        if (result.length > 1) {
            return createErrorResponse("task-duplicated");
        }

        const response = dbUserToUser(result[0]);

        return successResponse(response);
    }),
);

// ========================================
// API-008: ユーザー設定更新
// ========================================
app.put(
    "/api/v1/setting",
    withTryCatch(async (c) => {
        const userId = await auth(c);
        if (userId instanceof Response) {
            return userId;
        }

        const requestBody = await c.req.json();

        // バリデーション
        const parseResult = v.safeParse(userSettingSchema, requestBody);
        if (!parseResult.success) {
            const details = parseResult.issues.map((issue) => issue.message).join("; ");
            const input = JSON.stringify(requestBody);
            return createErrorResponse("parse-error", details, input);
        }

        if (parseResult.output.meta.id !== userId) {
            return createErrorResponse("invalid-user-id", undefined, `${parseResult.output.meta.id}|${userId}`);
        }

        const updateData = parseResult.output;

        const db = drizzle(c.env.DB);

        // 既存タスクの取得
        const existingTask = await db.select().from(users).where(eq(users.id, userId));

        if (existingTask.length === 0) {
            return createErrorResponse("user-setting-not-found");
        }

        if (existingTask.length > 1) {
            return createErrorResponse("user-setting-duplicated");
        }

        // 楽観的ロックのチェック
        const force = c.req.query("force") === "true";
        if (!force && existingTask[0].version + 1 !== updateData.meta.version) {
            return createErrorResponse("version-conflict", undefined, `${existingTask[0].version}|${updateData.meta.version}`);
        }

        await db.update(users).set(userToDbUser(updateData)).where(eq(users.id, userId));

        const response: ApiVoid = {
            type: "void",
        };

        return successResponse(response);
    }),
);

// ========================================
// API-009: magic link送信
// ========================================
app.post(
    "/api/v1/login",
    withTryCatch(async (c) => {
        const requestBody = await c.req.json();

        // バリデーション
        const parseResult = v.safeParse(loginRequestSchema, requestBody);
        if (!parseResult.success) {
            const details = parseResult.issues.map((issue) => issue.message).join("; ");
            const input = JSON.stringify(requestBody);
            return createErrorResponse("parse-error", details, input);
        }

        console.log("Magic link requested for email:", parseResult.output.email);
        const token = new Uint8Array(32);
        crypto.getRandomValues(token);
        const tokenString = Array.from(token)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        console.log(`Magic Link: http://localhost:5173/login/auth?token=${tokenString}`);
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

        const createData = parseResult.output;

        const db = drizzle(c.env.DB);

        await db.insert(auth_tokens).values({
            token: tokenString,
            email: createData.email,
            created_at: new Date().toISOString(),
        });

        const response: ApiVoid = {
            type: "void",
        };

        return successResponse(response);
    }),
);

// ========================================
// API-010: 認証トークン検証
// ========================================
app.post(
    "/api/v1/auth",
    withTryCatch(async (c) => {
        const requestBody = await c.req.json();

        // バリデーション
        const parseResult = v.safeParse(loginAuthSchema, requestBody);
        if (!parseResult.success) {
            const details = parseResult.issues.map((issue) => issue.message).join("; ");
            const input = JSON.stringify(requestBody);
            return createErrorResponse("parse-error", details, input);
        }

        const authData = parseResult.output;

        const db = drizzle(c.env.DB);
        const sent_token = await db.select().from(auth_tokens).where(eq(auth_tokens.token, authData.token));

        if (sent_token.length !== 1) {
            return createErrorResponse("auth-id-not-found");
        }

        // トークン使用後は削除
        await db.delete(auth_tokens).where(eq(auth_tokens.token, authData.token));

        const user = await db.select().from(users).where(eq(users.email, sent_token[0].email));

        if (user.length === 0) {
            const id = crypto.randomUUID();
            // ユーザーが存在しない場合、新規作成
            const new_user: typeof users.$inferInsert = {
                id,
                email: sent_token[0].email,
                timezone: 9,
                daily_goal_heavy: 1,
                daily_goal_medium: 2,
                daily_goal_light: 3,
                version: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            await db.insert(users).values(new_user);

            const response: ApiAuthSuccess = {
                type: "auth-success",
                userId: id,
            };

            await setJwtCookie(c, id);
            return successResponse(response);
        }

        if (user.length > 1) {
            return createErrorResponse("user-setting-duplicated");
        }

        const response: ApiAuthSuccess = {
            type: "auth-success",
            userId: user[0].id,
        };

        await setJwtCookie(c, user[0].id);
        return successResponse(response);
    }),
);

// ========================================
// API-011: ログアウト
// ========================================
app.post(
    "/api/v1/logout",
    withTryCatch(async (c) => {
        deleteJwtCookie(c);

        const response: ApiVoid = {
            type: "void",
        };

        return successResponse(response);
    }),
);

export default app;
