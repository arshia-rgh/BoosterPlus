-- +goose NO TRANSACTION
-- +goose Up
ALTER TABLE secret_bundles MODIFY COLUMN purpose ENUM('game_access','account_transfer','chat_form','supplier_input','supplier_delivery') NOT NULL;
-- Only supplier_delivery permits a larger bounded envelope. Every existing
-- credential/form scope still enforces its original 8192-byte application cap.
ALTER TABLE secret_bundles MODIFY COLUMN encrypted_payload MEDIUMBLOB NULL;
CREATE TABLE supplier_purchases (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 order_id VARCHAR(36) NOT NULL,
 contract_id VARCHAR(36) NOT NULL,
 user_id VARCHAR(36) NOT NULL,
 connection_id VARCHAR(32) NOT NULL,
 product JSON NOT NULL,
 offer_id VARCHAR(240) NOT NULL,
 quantity VARCHAR(64) NOT NULL,
 maximum_cost VARCHAR(64) NOT NULL,
 amount_minor VARCHAR(12) NOT NULL,
 input_secret_id VARCHAR(36) NOT NULL,
 state VARCHAR(32) NOT NULL DEFAULT 'awaiting_payment',
 version BIGINT NOT NULL DEFAULT 1,
 post_claimed BOOLEAN NOT NULL DEFAULT FALSE,
 provider_id VARCHAR(32) NULL,
 candidate_provider_id VARCHAR(32) NOT NULL DEFAULT '',
 lease_owner VARCHAR(36) NOT NULL DEFAULT '',
 lease_until DATETIME(6) NULL,
 next_check DATETIME(6) NOT NULL,
 scan_offset INT NOT NULL DEFAULT 0,
 issue VARCHAR(64) NOT NULL DEFAULT '',
 provider_status VARCHAR(32) NOT NULL DEFAULT '',
 actual_cost VARCHAR(64) NOT NULL DEFAULT '',
 delivered VARCHAR(64) NOT NULL DEFAULT '',
 delivery_secret_id VARCHAR(36) NOT NULL DEFAULT '',
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY supplier_purchase_order (order_id),
 UNIQUE KEY supplier_purchase_contract (contract_id),
 UNIQUE KEY supplier_purchase_provider (connection_id,provider_id),
 KEY supplier_purchase_due (next_check,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE supplier_signals (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 connection_id VARCHAR(32) NOT NULL,
 digest CHAR(64) NOT NULL,
 purchase_id VARCHAR(36) NOT NULL,
 provider_id VARCHAR(32) NOT NULL,
 signal_type VARCHAR(80) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY supplier_signal_digest (connection_id,digest)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
-- +goose Down
-- Purchase attempts and protected delivery data require a verified restore.
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'supplier purchase evidence is forward-only';
