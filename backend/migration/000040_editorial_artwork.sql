-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE artworks (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 user_id VARCHAR(36) NOT NULL,
 request_hash VARCHAR(64) NOT NULL,
 purpose VARCHAR(16) NOT NULL,
 state VARCHAR(16) NOT NULL DEFAULT 'processing',
 width BIGINT NOT NULL DEFAULT 0,
 height BIGINT NOT NULL DEFAULT 0,
 focus_x BIGINT NOT NULL,
 focus_y BIGINT NOT NULL,
 variants JSON NOT NULL,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 KEY artwork_state_age (state,updated_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
-- +goose Down
DROP TABLE artworks;
