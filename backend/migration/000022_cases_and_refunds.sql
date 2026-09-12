-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE service_cases (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 request_hash VARCHAR(64) NOT NULL,
 order_id VARCHAR(36) NOT NULL,
 active_order_id VARCHAR(36) NULL,
 user_id VARCHAR(36) NOT NULL,
 kind VARCHAR(32) NOT NULL,
 policy JSON NOT NULL,
 state VARCHAR(32) NOT NULL DEFAULT 'open',
 previous_state VARCHAR(32) NOT NULL,
 outcome VARCHAR(32) NOT NULL DEFAULT '',
 version BIGINT NOT NULL DEFAULT 1,
 appeal_count BIGINT NOT NULL DEFAULT 0,
 appeal_until DATETIME(6) NULL,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY case_active_order (active_order_id),
 KEY case_order_history (order_id,created_at,id),
 KEY case_review_queue (state,updated_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE case_events (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 case_id VARCHAR(36) NOT NULL,
 version BIGINT NOT NULL,
 action VARCHAR(32) NOT NULL,
 actor_id VARCHAR(36) NOT NULL,
 actor_role VARCHAR(32) NOT NULL,
 note VARCHAR(2000) NOT NULL,
 message_id VARCHAR(36) NOT NULL DEFAULT '',
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY case_event_version (case_id,version)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE money_transfers (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 request_hash VARCHAR(64) NOT NULL,
 kind VARCHAR(32) NOT NULL,
 case_id VARCHAR(36) NOT NULL,
 receipt_id VARCHAR(36) NOT NULL,
 order_id VARCHAR(36) NOT NULL,
 user_id VARCHAR(36) NOT NULL,
 account VARCHAR(80) NOT NULL,
 currency VARCHAR(32) NOT NULL,
 network VARCHAR(64) NOT NULL,
 amount VARCHAR(128) NOT NULL,
 terms VARCHAR(2000) NOT NULL,
 state VARCHAR(32) NOT NULL DEFAULT 'recipient_pending',
 version BIGINT NOT NULL DEFAULT 1,
 recipient JSON NOT NULL,
 recipient_at DATETIME(6) NULL,
 approved_by VARCHAR(36) NOT NULL DEFAULT '',
 approved_at DATETIME(6) NULL,
 current_attempt VARCHAR(36) NOT NULL DEFAULT '',
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 KEY transfer_receipt_cap (receipt_id,state),
 KEY transfer_case (case_id,created_at,id),
 KEY transfer_customer (user_id,created_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE transfer_attempts (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 transfer_id VARCHAR(36) NOT NULL,
 account VARCHAR(80) NOT NULL,
 active_transfer_id VARCHAR(36) NULL,
 recipient JSON NOT NULL,
 state VARCHAR(32) NOT NULL DEFAULT 'approved',
 version BIGINT NOT NULL DEFAULT 0,
 provider_id VARCHAR(32) NULL,
 batch_id VARCHAR(32) NOT NULL DEFAULT '',
 issue VARCHAR(48) NOT NULL DEFAULT '',
 lease_owner VARCHAR(36) NOT NULL DEFAULT '',
 lease_until DATETIME(6) NULL,
 data JSON NOT NULL,
 checked_at DATETIME(6) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY transfer_active_attempt (active_transfer_id),
 UNIQUE KEY transfer_provider_reference (account,provider_id),
 KEY transfer_reconcile_due (account,checked_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE transfer_observations (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 record_id VARCHAR(36) NOT NULL,
 attempt_id VARCHAR(36) NOT NULL,
 version BIGINT NOT NULL,
 data JSON NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY transfer_observation_version (record_id,version)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE transfer_events (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 transfer_id VARCHAR(36) NOT NULL,
 version BIGINT NOT NULL,
 action VARCHAR(32) NOT NULL,
 actor_id VARCHAR(36) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY transfer_event_version (transfer_id,version)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE transfer_records (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 account VARCHAR(80) NOT NULL,
 provider_id VARCHAR(32) NOT NULL,
 attempt_id VARCHAR(36) NOT NULL DEFAULT '',
 version BIGINT NOT NULL DEFAULT 0,
 lease_owner VARCHAR(36) NOT NULL DEFAULT '',
 lease_until DATETIME(6) NULL,
 state VARCHAR(32) NOT NULL DEFAULT 'unknown',
 issue VARCHAR(48) NOT NULL DEFAULT '',
 data JSON NOT NULL,
 checked_at DATETIME(6) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY transfer_record_reference (account,provider_id),
 KEY transfer_record_due (account,checked_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
ALTER TABLE payment_settings ADD COLUMN outgoing_page BIGINT NOT NULL DEFAULT 0;
-- +goose Down
ALTER TABLE payment_settings DROP COLUMN outgoing_page;
DROP TABLE transfer_records;
DROP TABLE transfer_events;
DROP TABLE transfer_observations;
DROP TABLE transfer_attempts;
DROP TABLE money_transfers;
DROP TABLE case_events;
DROP TABLE service_cases;
