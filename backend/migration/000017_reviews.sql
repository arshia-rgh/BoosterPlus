-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE reviews (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  contract_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  game_id VARCHAR(36) NOT NULL,
  game_name VARCHAR(120) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  service VARCHAR(48) NOT NULL,
  package_key VARCHAR(48) NOT NULL,
  request_key VARCHAR(36) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  state VARCHAR(24) NOT NULL DEFAULT 'pending',
  rating TINYINT NOT NULL,
  body TEXT NOT NULL,
  answers JSON NOT NULL,
  policy JSON NOT NULL,
  policy_release_id VARCHAR(36) NOT NULL,
  response TEXT NOT NULL,
  reason_code VARCHAR(32) NOT NULL,
  internal_reason TEXT NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  published_at DATETIME(6) NULL,
  UNIQUE KEY review_order (order_id),
  UNIQUE KEY review_request (user_id, request_key),
  KEY review_customer (user_id, created_at, id),
  KEY review_queue (state, updated_at, id),
  KEY review_public (game_id, state, rating, id)
);
CREATE TABLE review_revisions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  review_id VARCHAR(36) NOT NULL,
  version BIGINT NOT NULL,
  action VARCHAR(32) NOT NULL,
  state VARCHAR(24) NOT NULL,
  rating TINYINT NOT NULL,
  body TEXT NOT NULL,
  answers JSON NOT NULL,
  policy JSON NOT NULL,
  response TEXT NOT NULL,
  reason_code VARCHAR(32) NOT NULL,
  internal_reason TEXT NOT NULL,
  actor_role VARCHAR(24) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  UNIQUE KEY review_revision (review_id, version)
);
-- +goose Down
DROP TABLE review_revisions;
DROP TABLE reviews;
