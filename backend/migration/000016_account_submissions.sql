-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE account_submissions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  game_id VARCHAR(36) NOT NULL,
  game_name VARCHAR(120) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  state VARCHAR(32) NOT NULL DEFAULT 'draft',
  title VARCHAR(120) NOT NULL,
  answers JSON NOT NULL,
  snapshot JSON NOT NULL,
  ownership_notes TEXT NOT NULL,
  ownership_declared BOOLEAN NOT NULL DEFAULT FALSE,
  current_note TEXT NOT NULL,
  request_key VARCHAR(36) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  UNIQUE KEY submission_request (user_id, request_key),
  KEY submission_customer (user_id, created_at, id),
  KEY submission_queue (state, created_at, id)
);
CREATE TABLE submission_events (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  submission_id VARCHAR(36) NOT NULL,
  version BIGINT NOT NULL,
  action VARCHAR(32) NOT NULL,
  state VARCHAR(32) NOT NULL,
  message TEXT NOT NULL,
  actor_role VARCHAR(24) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  UNIQUE KEY submission_event_version (submission_id, version)
);
ALTER TABLE conversations ADD COLUMN submission_id VARCHAR(36) NULL;
CREATE UNIQUE INDEX conversation_submission ON conversations (submission_id);
-- +goose Down
DROP INDEX conversation_submission ON conversations;
ALTER TABLE conversations DROP COLUMN submission_id;
DROP TABLE submission_events;
DROP TABLE account_submissions;
