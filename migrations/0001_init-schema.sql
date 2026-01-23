-- Migration number: 0001 	 2025-12-08T11:24:00.645Z

-- usersテーブルの作成
DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    timezone INT NOT NULL,
    daily_goal_heavy INT NOT NULL,
    daily_goal_medium INT NOT NULL,
    daily_goal_light INT NOT NULL,
    version INT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CHECK (daily_goal_heavy >= 0 AND daily_goal_heavy <= 10),
    CHECK (daily_goal_medium >= 0 AND daily_goal_medium <= 10),
    CHECK (daily_goal_light >= 0 AND daily_goal_light <= 10),
    CHECK (version >= 1)
);

-- tasksテーブルの作成
DROP TABLE IF EXISTS tasks;
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(500) NOT NULL,
    weight VARCHAR(10),
    due_date DATE,
    completed_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL,
    version INT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CHECK ((weight IS NOT NULL AND due_date IS NULL) OR (weight IS NULL AND due_date IS NOT NULL) OR (weight IS NULL AND due_date IS NULL)),
    CHECK (version >= 1)
);

-- auth_tokensテーブルの作成
DROP TABLE IF EXISTS auth_tokens;
CREATE TABLE IF NOT EXISTS auth_tokens (
    token VARCHAR(64) NOT NULL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
