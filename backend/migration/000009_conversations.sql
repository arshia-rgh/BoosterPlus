-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE conversations (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 user_id VARCHAR(36) NOT NULL,
 kind VARCHAR(16) NOT NULL,
 order_id VARCHAR(36) NULL,
 linked_order_id VARCHAR(36) NULL,
 subject VARCHAR(160) NOT NULL,
 slug VARCHAR(80) NOT NULL DEFAULT '',
 request_key VARCHAR(36) NOT NULL,
 request_hash CHAR(64) NOT NULL,
 created_by VARCHAR(36) NOT NULL,
 state VARCHAR(16) NOT NULL DEFAULT 'open',
 assigned_to VARCHAR(36) NOT NULL DEFAULT '',
 version BIGINT NOT NULL DEFAULT 1,
 public_version BIGINT NOT NULL DEFAULT 1,
 sequence BIGINT NOT NULL DEFAULT 0,
 public_sequence BIGINT NOT NULL DEFAULT 0,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 public_updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY conversation_order (order_id),
 UNIQUE KEY conversation_request (created_by,request_key),
 KEY conversation_customer (user_id,public_updated_at,id),
 KEY conversation_inbox (state,updated_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE conversation_messages (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 conversation_id VARCHAR(36) NOT NULL,
 sender_id VARCHAR(36) NOT NULL,
 sender_role VARCHAR(32) NOT NULL,
 sender_label VARCHAR(100) NOT NULL,
 visibility VARCHAR(16) NOT NULL,
 sequence BIGINT NOT NULL,
 public_sequence BIGINT NULL,
 request_key VARCHAR(36) NOT NULL,
 request_hash CHAR(64) NOT NULL,
 body TEXT NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY conversation_message_request (conversation_id,sender_id,request_key),
 UNIQUE KEY conversation_message_sequence (conversation_id,sequence),
 UNIQUE KEY conversation_message_public (conversation_id,public_sequence)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE conversation_reads (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 conversation_id VARCHAR(36) NOT NULL,
 user_id VARCHAR(36) NOT NULL,
 audience VARCHAR(16) NOT NULL,
 sequence BIGINT NOT NULL DEFAULT 0,
 UNIQUE KEY conversation_reader (conversation_id,user_id,audience)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE notifications (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 user_id VARCHAR(36) NOT NULL,
 resource_id VARCHAR(36) NOT NULL,
 message_id VARCHAR(36) NOT NULL,
 kind VARCHAR(32) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 read_at DATETIME(6) NULL,
 emailed_at DATETIME(6) NULL,
 email_state VARCHAR(16) NOT NULL DEFAULT 'pending',
 UNIQUE KEY notification_message (user_id,message_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
-- +goose Down
DROP TABLE notifications;
DROP TABLE conversation_reads;
DROP TABLE conversation_messages;
DROP TABLE conversations;
