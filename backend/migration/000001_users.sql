-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE users (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    display_name VARCHAR(100) NOT NULL DEFAULT '',
    created_at DATETIME(6) NOT NULL,
    UNIQUE KEY users_email_key (email)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- +goose Down
DROP TABLE users;
