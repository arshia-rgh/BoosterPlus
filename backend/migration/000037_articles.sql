-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE articles (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 game_id VARCHAR(36) NOT NULL DEFAULT '',
 version BIGINT NOT NULL DEFAULT 1,
 state VARCHAR(32) NOT NULL DEFAULT '',
 draft_revision VARCHAR(36) NOT NULL DEFAULT '',
 current_revision VARCHAR(36) NOT NULL DEFAULT '',
 scheduled_revision VARCHAR(36) NOT NULL DEFAULT '',
 schedule_token VARCHAR(36) NOT NULL DEFAULT '',
 scheduled_by VARCHAR(36) NOT NULL DEFAULT '',
 scheduled_auth_version BIGINT NOT NULL DEFAULT 0,
 scheduled_at DATETIME(6) NULL,
 published_at DATETIME(6) NULL,
 public_updated_at DATETIME(6) NULL,
 title VARCHAR(160) NOT NULL DEFAULT '',
 kind VARCHAR(16) NOT NULL DEFAULT '',
 author VARCHAR(120) NOT NULL DEFAULT '',
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 KEY article_game_list (game_id,state,id),
 KEY article_staff_list (state,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE article_revisions (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 article_id VARCHAR(36) NOT NULL DEFAULT '',
 version BIGINT NOT NULL DEFAULT 1,
 data JSON NOT NULL,
 title VARCHAR(160) NOT NULL DEFAULT '',
 slug VARCHAR(100) NOT NULL DEFAULT '',
 kind VARCHAR(16) NOT NULL DEFAULT '',
 author VARCHAR(120) NOT NULL DEFAULT '',
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY article_revision_version (article_id,version)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE article_slugs (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 game_id VARCHAR(36) NOT NULL DEFAULT '',
 slug VARCHAR(100) NOT NULL DEFAULT '',
 article_id VARCHAR(36) NOT NULL DEFAULT '',
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY article_game_slug (game_id,slug)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE article_events (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 article_id VARCHAR(36) NOT NULL DEFAULT '',
 version BIGINT NOT NULL DEFAULT 1,
 action VARCHAR(32) NOT NULL DEFAULT '',
 actor_id VARCHAR(36) NOT NULL DEFAULT '',
 revision_id VARCHAR(36) NOT NULL DEFAULT '',
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY article_event_version (article_id,version)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
-- +goose Down
DROP TABLE article_events;
DROP TABLE article_slugs;
DROP TABLE article_revisions;
DROP TABLE articles;
