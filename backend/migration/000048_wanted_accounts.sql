-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE wanted_accounts (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 game_id VARCHAR(36) NOT NULL,
 title VARCHAR(80) NOT NULL,
 description VARCHAR(300) NOT NULL DEFAULT '',
 position INT NOT NULL,
 visible BOOLEAN NOT NULL DEFAULT FALSE,
 version INT NOT NULL DEFAULT 1,
 request_key VARCHAR(36) NOT NULL,
 request_hash VARCHAR(64) NOT NULL,
 created_by VARCHAR(36) NOT NULL,
 updated_by VARCHAR(36) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY wanted_account_request (game_id,request_key),
 KEY wanted_account_order (game_id,position,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
-- +goose Down
-- Removes only staff-authored wanted-account notices; no orders or financial evidence reference them.
DROP TABLE wanted_accounts;
