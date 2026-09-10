-- +goose NO TRANSACTION
-- +goose Up
ALTER TABLE jobs ADD COLUMN retry_generation BIGINT NOT NULL DEFAULT 0;
CREATE INDEX jobs_operations ON jobs (state, created_at, id);
-- +goose Down
DROP INDEX jobs_operations ON jobs;
ALTER TABLE jobs DROP COLUMN retry_generation;
