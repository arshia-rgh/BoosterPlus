-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE shop_deliveries (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 order_id VARCHAR(36) NOT NULL,
 version BIGINT NOT NULL DEFAULT 1,
 assigned_id VARCHAR(36) NOT NULL,
 state VARCHAR(32) NOT NULL DEFAULT 'processing',
 note TEXT NOT NULL,
 proof_message_id VARCHAR(36) NOT NULL DEFAULT '',
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY shop_order_delivery (order_id),
 KEY shop_delivery_queue (state,updated_at,id),
 KEY shop_delivery_assignee (assigned_id,state,updated_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- +goose Down
DROP TABLE shop_deliveries;
