-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE coupons (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 code VARCHAR(40) NOT NULL,
 version BIGINT NOT NULL DEFAULT 1,
 definition JSON NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY coupon_code (code)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE coupon_revisions (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 coupon_id VARCHAR(36) NOT NULL,
 version BIGINT NOT NULL,
 definition JSON NOT NULL,
 created_at DATETIME(6) NOT NULL,
 created_by VARCHAR(36) NOT NULL,
 UNIQUE KEY coupon_revision (coupon_id,version)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
-- Only payable-order/payment transactions may write claims. No public claim API.
-- Limits apply across policy revisions and include both held and redeemed uses.
CREATE TABLE coupon_claims (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 coupon_id VARCHAR(36) NOT NULL,
 coupon_version BIGINT NOT NULL,
 user_id VARCHAR(36) NOT NULL,
 contract_id VARCHAR(36) NOT NULL,
 state VARCHAR(16) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY coupon_contract (contract_id),
 KEY coupon_usage (coupon_id,state,user_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
-- +goose Down
-- Destructive development rollback only; production uses forward corrections.
DROP TABLE coupon_claims;
DROP TABLE coupon_revisions;
DROP TABLE coupons;
