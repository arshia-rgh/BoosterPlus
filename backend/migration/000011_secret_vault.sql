-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE secret_bundles (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 purpose VARCHAR(32) NOT NULL,
 resource_id VARCHAR(36) NOT NULL,
 owner_id VARCHAR(36) NOT NULL,
 version BIGINT NOT NULL DEFAULT 1,
 key_version VARCHAR(32) NOT NULL,
 wrapped_key BLOB NULL,
 encrypted_payload BLOB NULL,
 state VARCHAR(16) NOT NULL DEFAULT 'active',
 request_key VARCHAR(36) NOT NULL,
 request_hash CHAR(64) NOT NULL,
 expires_at DATETIME(6) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY secret_scope (purpose,resource_id,owner_id),
 KEY secret_expiry (state,expires_at),
 KEY secret_key_version (key_version,state)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
-- +goose Down
DROP TABLE secret_bundles;
