-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE media_files (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 user_id VARCHAR(36) NOT NULL,
 conversation_id VARCHAR(36) NOT NULL,
 visibility VARCHAR(16) NOT NULL,
 request_key VARCHAR(36) NOT NULL,
 request_hash CHAR(64) NOT NULL,
 checksum CHAR(64) NOT NULL,
 size BIGINT NOT NULL,
 content_type VARCHAR(32) NOT NULL,
 state VARCHAR(16) NOT NULL DEFAULT 'pending',
 message_id VARCHAR(36) NULL,
 clean_content_type VARCHAR(32) NOT NULL DEFAULT '',
 clean_checksum CHAR(64) NOT NULL DEFAULT '',
 clean_size BIGINT NOT NULL DEFAULT 0,
 expires_at DATETIME(6) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 purged_at DATETIME(6) NULL,
 UNIQUE KEY media_request (user_id,request_key),
 KEY media_owner (user_id,state),
 KEY media_expiry (message_id,expires_at),
 KEY media_message (message_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
ALTER TABLE conversation_messages ADD COLUMN attachments JSON NULL;
-- +goose Down
ALTER TABLE conversation_messages DROP COLUMN attachments;
DROP TABLE media_files;
