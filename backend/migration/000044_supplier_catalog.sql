-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE supplier_connections (
 id VARCHAR(32) NOT NULL PRIMARY KEY,
 version BIGINT NOT NULL DEFAULT 1,
 markup_bps INT NOT NULL DEFAULT 1500,
 current_import VARCHAR(36) NOT NULL DEFAULT '',
 active_import VARCHAR(36) NOT NULL DEFAULT '',
 purchases_enabled BOOLEAN NOT NULL DEFAULT FALSE,
 updated_at DATETIME(6) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE supplier_imports (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 connection_id VARCHAR(32) NOT NULL,
 created_by VARCHAR(36) NOT NULL,
 auth_version BIGINT NOT NULL,
 state VARCHAR(32) NOT NULL DEFAULT 'queued',
 lease_owner VARCHAR(36) NOT NULL DEFAULT '',
 lease_until DATETIME(6) NULL,
 metadata JSON NULL,
 product_count INT NOT NULL DEFAULT 0,
 offer_count INT NOT NULL DEFAULT 0,
 issue VARCHAR(64) NOT NULL DEFAULT '',
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 KEY supplier_import_history (connection_id,created_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE supplier_items (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 import_id VARCHAR(36) NOT NULL,
 connection_id VARCHAR(32) NOT NULL,
 product_id VARCHAR(240) NOT NULL,
 game_id VARCHAR(240) NOT NULL DEFAULT '',
 category_id VARCHAR(240) NOT NULL DEFAULT '',
 title VARCHAR(500) NOT NULL,
 data JSON NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY supplier_import_product (import_id,product_id),
 KEY supplier_import_game (import_id,game_id,id),
 KEY supplier_import_category (import_id,category_id,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE supplier_prices (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 connection_id VARCHAR(32) NOT NULL,
 product_id VARCHAR(240) NOT NULL,
 offer_id VARCHAR(240) NOT NULL,
 version BIGINT NOT NULL DEFAULT 1,
 markup_bps INT NULL,
 override_minor VARCHAR(12) NOT NULL DEFAULT '',
 game_id VARCHAR(36) NOT NULL DEFAULT '',
 region VARCHAR(80) NOT NULL DEFAULT '',
 delivery_method VARCHAR(32) NOT NULL DEFAULT '',
 shop_product_id VARCHAR(36) NULL,
 updated_by VARCHAR(36) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY supplier_offer_price (connection_id,product_id,offer_id),
 UNIQUE KEY supplier_bound_product (shop_product_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
-- +goose Down
DROP TABLE supplier_prices;
DROP TABLE supplier_items;
DROP TABLE supplier_imports;
DROP TABLE supplier_connections;
