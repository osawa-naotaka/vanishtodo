-- Migration number: 0001 	 2025-12-08T11:24:00.645Z

-- usersテーブルの作成
DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    timezone INT NOT NULL DEFAULT 0,
    daily_goal_heavy INT NOT NULL DEFAULT 1,
    daily_goal_medium INT NOT NULL DEFAULT 2,
    daily_goal_light INT NOT NULL DEFAULT 3,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (daily_goal_heavy >= 0 AND daily_goal_heavy <= 20),
    CHECK (daily_goal_medium >= 0 AND daily_goal_medium <= 20),
    CHECK (daily_goal_light >= 0 AND daily_goal_light <= 20)
);

-- デフォルトユーザーの挿入
INSERT INTO users (id, timezone, daily_goal_heavy, daily_goal_medium, daily_goal_light)
VALUES ('00000000-0000-0000-0000-000000000001', 9, 1, 2, 3);

-- tasksテーブルの作成
DROP TABLE IF EXISTS tasks;
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    weight VARCHAR(10),
    due_date DATE,
    completed_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((weight IS NOT NULL AND due_date IS NULL) OR (weight IS NULL AND due_date IS NOT NULL) OR (weight IS NULL AND due_date IS NULL)),
    CHECK (version >= 1)
);