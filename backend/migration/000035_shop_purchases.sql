-- +goose NO TRANSACTION
-- +goose Up
ALTER TABLE orders ADD COLUMN shop_product_id VARCHAR(36) NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN shop_snapshot JSON NULL;
ALTER TABLE shop_stocks ADD COLUMN release_id VARCHAR(36) NOT NULL DEFAULT '';
ALTER TABLE shop_stocks ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE shop_stocks ADD COLUMN label VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE shop_stocks ADD COLUMN region VARCHAR(80) NOT NULL DEFAULT '';
ALTER TABLE shop_stocks ADD COLUMN platform VARCHAR(80) NOT NULL DEFAULT '';
ALTER TABLE shop_stocks ADD COLUMN server VARCHAR(80) NOT NULL DEFAULT '';
ALTER TABLE shop_stocks ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT '';
ALTER TABLE shop_stocks ADD COLUMN unit_amount_minor BIGINT NOT NULL DEFAULT 0;
ALTER TABLE shop_stocks ADD COLUMN min_quantity BIGINT NOT NULL DEFAULT 1;
ALTER TABLE shop_stocks ADD COLUMN max_quantity BIGINT NOT NULL DEFAULT 1;
CREATE TABLE shop_reservations (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 order_id VARCHAR(36) NOT NULL,
 user_id VARCHAR(36) NOT NULL,
 product_id VARCHAR(36) NOT NULL,
 release_id VARCHAR(36) NOT NULL,
 variant_key VARCHAR(48) NOT NULL,
 quantity BIGINT NOT NULL,
 state VARCHAR(32) NOT NULL DEFAULT 'reserved',
 version BIGINT NOT NULL DEFAULT 1,
 expires_at DATETIME(6) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY shop_order_reservation (order_id),
 KEY shop_reservation_expiry (state,expires_at,id),
 KEY shop_customer_reservations (user_id,state,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE shop_recipients (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 order_id VARCHAR(36) NOT NULL,
 user_id VARCHAR(36) NOT NULL,
 recipient_values JSON NOT NULL,
 version BIGINT NOT NULL DEFAULT 1,
 erased_at DATETIME(6) NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY shop_order_recipient (order_id),
 KEY shop_recipient_owner (user_id,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- +goose Down
DROP TABLE shop_recipients;
DROP TABLE shop_reservations;
ALTER TABLE shop_stocks DROP COLUMN max_quantity;
ALTER TABLE shop_stocks DROP COLUMN min_quantity;
ALTER TABLE shop_stocks DROP COLUMN unit_amount_minor;
ALTER TABLE shop_stocks DROP COLUMN currency;
ALTER TABLE shop_stocks DROP COLUMN server;
ALTER TABLE shop_stocks DROP COLUMN platform;
ALTER TABLE shop_stocks DROP COLUMN region;
ALTER TABLE shop_stocks DROP COLUMN label;
ALTER TABLE shop_stocks DROP COLUMN enabled;
ALTER TABLE shop_stocks DROP COLUMN release_id;
ALTER TABLE orders DROP COLUMN shop_snapshot;
ALTER TABLE orders DROP COLUMN shop_product_id;
