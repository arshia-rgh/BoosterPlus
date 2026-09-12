-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE seller_offers (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 submission_id VARCHAR(36) NOT NULL,
 active_submission_id VARCHAR(36) NULL,
 seller_id VARCHAR(36) NOT NULL,
 request_hash VARCHAR(64) NOT NULL,
 version BIGINT NOT NULL DEFAULT 1,
 data JSON NOT NULL,
 state VARCHAR(32) NOT NULL DEFAULT 'offered',
 expires_at DATETIME(6) NOT NULL,
 accepted_at DATETIME(6) NULL,
 control_verified_at DATETIME(6) NULL,
 control_verified_by VARCHAR(36) NOT NULL DEFAULT '',
 control_evidence VARCHAR(2000) NOT NULL DEFAULT '',
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY seller_active_offer (active_submission_id),
 KEY seller_offer_history (submission_id,created_at,id),
 KEY seller_own_offers (seller_id,created_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE seller_offer_events (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 offer_id VARCHAR(36) NOT NULL,
 version BIGINT NOT NULL,
 action VARCHAR(32) NOT NULL,
 actor_id VARCHAR(36) NOT NULL,
 actor_role VARCHAR(32) NOT NULL,
 note VARCHAR(2000) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY seller_offer_event_version (offer_id,version)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE account_listings (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 submission_id VARCHAR(36) NOT NULL,
 offer_id VARCHAR(36) NOT NULL,
 seller_id VARCHAR(36) NOT NULL,
 game_id VARCHAR(36) NOT NULL,
 game_name VARCHAR(120) NOT NULL,
 slug VARCHAR(80) NOT NULL,
 version BIGINT NOT NULL DEFAULT 1,
 state VARCHAR(32) NOT NULL DEFAULT 'draft',
 draft JSON NOT NULL,
 current_release VARCHAR(36) NOT NULL DEFAULT '',
 public_title VARCHAR(120) NOT NULL DEFAULT '',
 public_region VARCHAR(80) NOT NULL DEFAULT '',
 public_rank VARCHAR(80) NOT NULL DEFAULT '',
 public_currency VARCHAR(3) NOT NULL DEFAULT '',
 public_amount_minor BIGINT NOT NULL DEFAULT 0,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY account_single_inventory (submission_id),
 UNIQUE KEY account_offer_inventory (offer_id),
 KEY account_public_browse (state,game_id,created_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE account_listing_releases (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 listing_id VARCHAR(36) NOT NULL,
 version BIGINT NOT NULL,
 data JSON NOT NULL,
 created_by VARCHAR(36) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY account_listing_release_version (listing_id,version)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE account_reservations (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 listing_id VARCHAR(36) NOT NULL,
 active_listing_id VARCHAR(36) NULL,
 release_id VARCHAR(36) NOT NULL,
 order_id VARCHAR(36) NOT NULL,
 user_id VARCHAR(36) NOT NULL,
 state VARCHAR(32) NOT NULL DEFAULT 'reserved',
 version BIGINT NOT NULL DEFAULT 1,
 expires_at DATETIME(6) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY account_unique_reservation (active_listing_id),
 UNIQUE KEY account_order_reservation (order_id),
 KEY account_reservation_expiry (state,expires_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE account_deliveries (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 order_id VARCHAR(36) NOT NULL,
 listing_id VARCHAR(36) NOT NULL,
 buyer_id VARCHAR(36) NOT NULL,
 state VARCHAR(32) NOT NULL DEFAULT 'pending',
 version BIGINT NOT NULL DEFAULT 1,
 instructions VARCHAR(4000) NOT NULL DEFAULT '',
 secret_owner_id VARCHAR(36) NOT NULL DEFAULT '',
 secret_version BIGINT NOT NULL DEFAULT 0,
 delivered_at DATETIME(6) NULL,
 acknowledged_at DATETIME(6) NULL,
 dispute_until DATETIME(6) NULL,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY account_order_delivery (order_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
ALTER TABLE money_transfers ADD COLUMN seller_offer_id VARCHAR(36) NULL;
ALTER TABLE money_transfers ADD UNIQUE KEY seller_offer_payout (seller_offer_id);
ALTER TABLE orders ADD COLUMN listing_id VARCHAR(36) NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN account_snapshot JSON NULL;
ALTER TABLE payment_attempts ADD COLUMN post_claimed BOOL NOT NULL DEFAULT TRUE;
-- +goose Down
ALTER TABLE payment_attempts DROP COLUMN post_claimed;
ALTER TABLE orders DROP COLUMN account_snapshot;
ALTER TABLE orders DROP COLUMN listing_id;
ALTER TABLE money_transfers DROP INDEX seller_offer_payout;
ALTER TABLE money_transfers DROP COLUMN seller_offer_id;
DROP TABLE account_deliveries;
DROP TABLE account_reservations;
DROP TABLE account_listing_releases;
DROP TABLE account_listings;
DROP TABLE seller_offer_events;
DROP TABLE seller_offers;
