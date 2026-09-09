-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE jobs (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    kind VARCHAR(64) NOT NULL,
    idempotency_key VARCHAR(160) NOT NULL,
    payload JSON NOT NULL,
    request_hash CHAR(64) NOT NULL,
    state VARCHAR(16) NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    available_at DATETIME(6) NOT NULL,
    lease_until DATETIME(6) NULL,
    owner VARCHAR(64) NULL,
    last_error VARCHAR(64) NULL,
    created_at DATETIME(6) NOT NULL,
    UNIQUE KEY jobs_idempotency_key (idempotency_key),
    KEY jobs_pending (state, available_at, id),
    KEY jobs_leases (state, lease_until)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- +goose Down
DROP TABLE jobs;
