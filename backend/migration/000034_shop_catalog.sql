-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE shop_products (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 game_id VARCHAR(36) NOT NULL,
 slug VARCHAR(80) NOT NULL,
 game_name VARCHAR(120) NOT NULL,
 version BIGINT NOT NULL DEFAULT 1,
 state VARCHAR(32) NOT NULL DEFAULT 'draft',
 draft JSON NOT NULL,
 current_release VARCHAR(36) NOT NULL DEFAULT '',
 title VARCHAR(120) NOT NULL DEFAULT '',
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY shop_product_slug (game_id,slug),
 KEY shop_staff_queue (state,updated_at,id),
 KEY shop_game_catalog (game_id,state,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE shop_product_releases (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 product_id VARCHAR(36) NOT NULL,
 version BIGINT NOT NULL,
 data JSON NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY shop_product_release_version (product_id,version)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE shop_stocks (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 product_id VARCHAR(36) NOT NULL,
 variant_key VARCHAR(48) NOT NULL,
 version BIGINT NOT NULL DEFAULT 1,
 total BIGINT NOT NULL DEFAULT 0,
 reserved BIGINT NOT NULL DEFAULT 0,
 committed BIGINT NOT NULL DEFAULT 0,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY shop_variant_stock (product_id,variant_key)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE shop_product_events (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 product_id VARCHAR(36) NOT NULL,
 version BIGINT NOT NULL,
 action VARCHAR(32) NOT NULL,
 actor_id VARCHAR(36) NOT NULL,
 note VARCHAR(2000) NOT NULL DEFAULT '',
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY shop_product_event_version (product_id,version)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- +goose Down
DROP TABLE shop_product_events;
DROP TABLE shop_stocks;
DROP TABLE shop_product_releases;
DROP TABLE shop_products;
