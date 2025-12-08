-- Migration number: 0001 	 2025-12-08T11:24:00.645Z
DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY, user_name TEXT);
INSERT INTO users (user_id, user_name) VALUES (1, 'TAIGA Ruli');
