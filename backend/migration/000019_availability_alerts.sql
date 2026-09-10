-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE availability_targets (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  game_id VARCHAR(36) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  package_key VARCHAR(48) NOT NULL,
  variant_key VARCHAR(48) NOT NULL,
  available BOOLEAN NOT NULL,
  cycle BIGINT NOT NULL,
  checked_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  UNIQUE KEY availability_target (game_id, package_key, variant_key)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE availability_subscriptions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  target_id VARCHAR(36) NOT NULL,
  version BIGINT NOT NULL,
  state VARCHAR(16) NOT NULL,
  email_fingerprint VARCHAR(64) NOT NULL,
  last_cycle BIGINT NOT NULL,
  consent_version VARCHAR(32) NOT NULL,
  suppression_reason VARCHAR(32) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  UNIQUE KEY availability_subscription (user_id, target_id),
  KEY availability_fanout (target_id, state, last_cycle, id),
  KEY availability_owner (user_id, id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE availability_deliveries (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  subscription_id VARCHAR(36) NOT NULL,
  target_id VARCHAR(36) NOT NULL,
  subscription_version BIGINT NOT NULL,
  cycle BIGINT NOT NULL,
  email_fingerprint VARCHAR(64) NOT NULL,
  state VARCHAR(16) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  sent_at DATETIME(6) NULL,
  UNIQUE KEY availability_delivery (subscription_id, cycle)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
-- +goose Down
DROP TABLE availability_deliveries;
DROP TABLE availability_subscriptions;
DROP TABLE availability_targets;
