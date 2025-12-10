import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    timezone: integer("timezone").notNull().default(0),
    daily_goal_heavy: integer("daily_goal_heavy").notNull().default(1),
    daily_goal_medium: integer("daily_goal_medium").notNull().default(2),
    daily_goal_light: integer("daily_goal_light").notNull().default(3),
    created_at: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
    updated_at: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const tasks = sqliteTable("tasks", {
    id: text("id").primaryKey(),
    title: text("title", { length: 500 }).notNull(),
    weight: text("weight", { enum: ["light", "medium", "heavy"] }),
    due_date: text("due_date"),
    completed_at: text("completed_at"),
    is_deleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
    version: integer("version").notNull().default(1),
    created_at: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
    updated_at: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});
