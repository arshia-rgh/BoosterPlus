-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE conversation_forms (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 conversation_id VARCHAR(36) NOT NULL,
 created_by VARCHAR(36) NOT NULL,
 recipient_id VARCHAR(36) NOT NULL,
 booster_id VARCHAR(36) NOT NULL DEFAULT '',
 mode ENUM('request','share') NOT NULL,
 purpose ENUM('information','game_access','seller_access','buyer_access') NOT NULL,
 resource_id VARCHAR(36) NOT NULL DEFAULT '',
 title VARCHAR(120) NOT NULL,
 description VARCHAR(500) NOT NULL DEFAULT '',
 fields JSON NOT NULL,
 answers JSON NULL,
 has_secure BOOLEAN NOT NULL DEFAULT FALSE,
 state ENUM('open','answered','cancelled') NOT NULL DEFAULT 'open',
 version INT NOT NULL DEFAULT 1,
 request_key VARCHAR(36) NOT NULL,
 request_hash VARCHAR(64) NOT NULL,
 response_key VARCHAR(36) NOT NULL DEFAULT '',
 response_hash VARCHAR(64) NOT NULL DEFAULT '',
 answered_by VARCHAR(36) NOT NULL DEFAULT '',
 answered_at DATETIME(6) NULL,
 expires_at DATETIME(6) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY conversation_form_request (conversation_id,created_by,request_key),
 KEY conversation_form_thread (conversation_id,created_at,id),
 KEY conversation_form_resource (purpose,resource_id,state,created_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
ALTER TABLE conversation_messages ADD COLUMN form_id VARCHAR(36) NOT NULL DEFAULT '';
ALTER TABLE conversation_messages MODIFY COLUMN purpose ENUM('message','proof','form','form_reply') NOT NULL DEFAULT 'message';
ALTER TABLE secret_bundles MODIFY COLUMN purpose ENUM('game_access','account_transfer','chat_form') NOT NULL;
ALTER TABLE account_deliveries ADD COLUMN form_id VARCHAR(36) NOT NULL DEFAULT '';
-- +goose Down
-- The CLI refuses rollback across schema 43 once form replies may exist.
ALTER TABLE account_deliveries DROP COLUMN form_id;
ALTER TABLE conversation_messages DROP COLUMN form_id;
DROP TABLE conversation_forms;
