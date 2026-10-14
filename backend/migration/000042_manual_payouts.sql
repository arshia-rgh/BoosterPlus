-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE manual_payouts (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 transfer_id VARCHAR(36) NOT NULL,
 request_hash VARCHAR(64) NOT NULL,
 network VARCHAR(64) NOT NULL,
 transaction_hash VARCHAR(128) NOT NULL,
 snapshot JSON NOT NULL,
 recorded_by VARCHAR(36) NOT NULL,
 reason VARCHAR(2000) NOT NULL,
 completed_at DATETIME(6) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY manual_payout_transfer (transfer_id),
 UNIQUE KEY manual_payout_transaction (network,transaction_hash)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
-- +goose Down
DROP TABLE manual_payouts;
