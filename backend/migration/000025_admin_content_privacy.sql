-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE site_settings (
 id VARCHAR(32) NOT NULL PRIMARY KEY,
 version BIGINT NOT NULL DEFAULT 1,
 current_release VARCHAR(36) NOT NULL DEFAULT '',
 draft JSON NOT NULL,
 updated_at DATETIME(6) NOT NULL
);
CREATE TABLE site_releases (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 kind VARCHAR(32) NOT NULL,
 version BIGINT NOT NULL,
 label VARCHAR(64) NOT NULL,
 data JSON NOT NULL,
 created_by VARCHAR(36) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY site_release_version (kind, version),
 UNIQUE KEY site_release_label (kind, label)
);
CREATE TABLE privacy_requests (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 user_id VARCHAR(36) NOT NULL,
 active_user_id VARCHAR(36) NULL,
 version BIGINT NOT NULL DEFAULT 1,
 state VARCHAR(32) NOT NULL DEFAULT 'requested',
 policy_id VARCHAR(36) NOT NULL,
 reviewed_policy_id VARCHAR(36) NOT NULL DEFAULT '',
 manual_hold BOOLEAN NOT NULL DEFAULT FALSE,
 hold_reason VARCHAR(2000) NOT NULL DEFAULT '',
 reviewed_by VARCHAR(36) NOT NULL DEFAULT '',
 eligible_at DATETIME(6) NULL,
 completed_at DATETIME(6) NULL,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY privacy_active_user (active_user_id),
 KEY privacy_owner (user_id, id),
 KEY privacy_queue (state, created_at, id)
);
ALTER TABLE users ADD COLUMN deleted_at DATETIME(6) NULL;
CREATE INDEX receipt_report_created ON payment_receipts (created_at, id);
CREATE INDEX transfer_report_created ON money_transfers (kind, created_at, id);
-- +goose Down
DROP INDEX transfer_report_created ON money_transfers;
DROP INDEX receipt_report_created ON payment_receipts;
ALTER TABLE users DROP COLUMN deleted_at;
DROP TABLE privacy_requests;
DROP TABLE site_releases;
DROP TABLE site_settings;
