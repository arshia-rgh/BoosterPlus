-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE job_attempts (
 job_id VARCHAR(64) NOT NULL,
 retry_generation BIGINT NOT NULL,
 attempt INT NOT NULL,
 outcome VARCHAR(32) NOT NULL,
 started_at DATETIME(6) NOT NULL,
 finished_at DATETIME(6) NULL,
 PRIMARY KEY (job_id,retry_generation,attempt),
 KEY job_attempt_outcome (outcome,job_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
-- Existing jobs have no historical per-attempt timestamps. Do not invent them.
-- +goose Down
DROP TABLE job_attempts;
