-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE orders (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 user_id VARCHAR(36) NOT NULL,
 game_id VARCHAR(36) NOT NULL,
 game_name VARCHAR(120) NOT NULL,
 slug VARCHAR(80) NOT NULL,
 service VARCHAR(48) NOT NULL,
 package_key VARCHAR(48) NOT NULL DEFAULT '',
 variant_key VARCHAR(48) NOT NULL DEFAULT '',
 kind VARCHAR(16) NOT NULL,
 request_key VARCHAR(36) NOT NULL,
 request_hash CHAR(64) NOT NULL,
 version BIGINT NOT NULL DEFAULT 1,
 state VARCHAR(32) NOT NULL,
 answers JSON NOT NULL,
 snapshot JSON NOT NULL,
 estimate JSON NOT NULL,
 coupon_code VARCHAR(40) NOT NULL DEFAULT '',
 terms_version VARCHAR(80) NOT NULL,
 quote_count BIGINT NOT NULL DEFAULT 0,
 current_quote VARCHAR(36) NOT NULL DEFAULT '',
 current_contract VARCHAR(36) NOT NULL DEFAULT '',
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY order_request (user_id,request_key),
 KEY order_customer_history (user_id,created_at,id),
 KEY order_admin_queue (state,created_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE order_quotes (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 order_id VARCHAR(36) NOT NULL,
 revision BIGINT NOT NULL,
 state VARCHAR(16) NOT NULL,
 data JSON NOT NULL,
 created_by VARCHAR(36) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY order_quote_revision (order_id,revision)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE order_contracts (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 order_id VARCHAR(36) NOT NULL,
 active_order_id VARCHAR(36) NULL,
 user_id VARCHAR(36) NOT NULL,
 game_id VARCHAR(36) NOT NULL,
 package_key VARCHAR(48) NOT NULL DEFAULT '',
 variant_key VARCHAR(48) NOT NULL DEFAULT '',
 capacity_held BOOLEAN NOT NULL DEFAULT FALSE,
 payment_state VARCHAR(32) NOT NULL,
 data JSON NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY order_active_contract (active_order_id),
 KEY order_contract_history (order_id),
 KEY package_capacity (game_id,package_key,variant_key,capacity_held)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE order_events (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 order_id VARCHAR(36) NOT NULL,
 version BIGINT NOT NULL,
 action VARCHAR(48) NOT NULL,
 message VARCHAR(2000) NOT NULL DEFAULT '',
 actor_id VARCHAR(36) NOT NULL,
 actor_role VARCHAR(32) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY order_event_revision (order_id,version)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE favorites (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 user_id VARCHAR(36) NOT NULL,
 target VARCHAR(200) NOT NULL,
 slug VARCHAR(80) NOT NULL,
 service VARCHAR(48) NOT NULL DEFAULT '',
 package_key VARCHAR(48) NOT NULL DEFAULT '',
 kind VARCHAR(16) NOT NULL,
 name VARCHAR(300) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY favorite_target (user_id,target)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
-- +goose Down
-- Development-only destructive rollback; withdraw sales before removing orders.
DROP TABLE favorites;
DROP TABLE order_events;
DROP TABLE order_contracts;
DROP TABLE order_quotes;
DROP TABLE orders;
