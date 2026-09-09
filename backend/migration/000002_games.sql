-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE games (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    slug VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    configuration JSON NOT NULL,
    version BIGINT NOT NULL DEFAULT 1,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL,
    UNIQUE KEY games_slug_key (slug)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- +goose Down
DROP TABLE games;
