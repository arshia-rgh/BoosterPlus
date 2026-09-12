-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE payment_settings (
 id BIGINT NOT NULL PRIMARY KEY,
 version BIGINT NOT NULL DEFAULT 1,
 published_id VARCHAR(36) NOT NULL DEFAULT '',
 draft JSON NOT NULL,
 discovery_page BIGINT NOT NULL DEFAULT 0,
 updated_at DATETIME(6) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE payment_policies (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 data JSON NOT NULL,
 created_by VARCHAR(36) NOT NULL,
 created_at DATETIME(6) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE payment_attempts (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 order_id VARCHAR(36) NOT NULL,
 contract_id VARCHAR(36) NOT NULL,
 active_contract_id VARCHAR(36) NULL,
 user_id VARCHAR(36) NOT NULL,
 account VARCHAR(80) NOT NULL,
 policy_id VARCHAR(36) NOT NULL,
 policy JSON NOT NULL,
 route JSON NOT NULL,
 currency VARCHAR(3) NOT NULL,
 amount_minor VARCHAR(12) NOT NULL,
 state VARCHAR(32) NOT NULL DEFAULT 'new',
 invoice_id VARCHAR(32) NULL,
 checkout_url VARCHAR(2048) NOT NULL DEFAULT '',
 issue VARCHAR(48) NOT NULL DEFAULT '',
 created_at DATETIME(6) NOT NULL,
 funds_detected_at DATETIME(6) NULL,
 expires_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY payment_active_attempt (active_contract_id),
 UNIQUE KEY payment_invoice (account,invoice_id),
 KEY payment_order_history (order_id,created_at,id),
 KEY payment_attempt_queue (state,updated_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE payment_signals (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 account VARCHAR(80) NOT NULL,
 payment_id VARCHAR(32) NOT NULL,
 digest VARCHAR(64) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY payment_signal_dedup (account,digest)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE payment_records (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 account VARCHAR(80) NOT NULL,
 payment_id VARCHAR(32) NOT NULL,
 attempt_id VARCHAR(36) NOT NULL DEFAULT '',
 version BIGINT NOT NULL DEFAULT 0,
 lease_owner VARCHAR(36) NOT NULL DEFAULT '',
 lease_until DATETIME(6) NULL,
 state VARCHAR(32) NOT NULL DEFAULT 'unknown',
 issue VARCHAR(48) NOT NULL DEFAULT '',
 data JSON NOT NULL,
 checked_at DATETIME(6) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY payment_provider_reference (account,payment_id),
 KEY payment_reconcile_due (account,checked_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE payment_observations (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 record_id VARCHAR(36) NOT NULL,
 version BIGINT NOT NULL,
 data JSON NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY payment_observation_revision (record_id,version)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE payment_receipts (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 record_id VARCHAR(36) NOT NULL,
 attempt_id VARCHAR(36) NOT NULL,
 order_id VARCHAR(36) NOT NULL,
 user_id VARCHAR(36) NOT NULL,
 currency VARCHAR(32) NOT NULL,
 network VARCHAR(64) NOT NULL,
 amount VARCHAR(128) NOT NULL,
 state VARCHAR(32) NOT NULL,
 observation_id VARCHAR(36) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY payment_receipt_reference (record_id),
 KEY payment_receipt_customer (user_id,created_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE payment_allocations (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 receipt_id VARCHAR(36) NOT NULL,
 contract_id VARCHAR(36) NOT NULL,
 order_id VARCHAR(36) NOT NULL,
 currency VARCHAR(3) NOT NULL,
 amount_minor VARCHAR(12) NOT NULL,
 crypto_amount VARCHAR(128) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY payment_contract_allocation (contract_id),
 UNIQUE KEY payment_receipt_allocation (receipt_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
INSERT INTO payment_settings (id,version,published_id,draft,discovery_page,updated_at) VALUES (1,1,'','{}',0,UTC_TIMESTAMP(6));
-- +goose Down
DROP TABLE payment_allocations;
DROP TABLE payment_receipts;
DROP TABLE payment_observations;
DROP TABLE payment_records;
DROP TABLE payment_signals;
DROP TABLE payment_attempts;
DROP TABLE payment_policies;
DROP TABLE payment_settings;
