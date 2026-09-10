-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE fulfillments (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 order_id VARCHAR(36) NOT NULL,
 version BIGINT NOT NULL DEFAULT 1,
 access_version BIGINT NOT NULL DEFAULT 1,
 assigned_id VARCHAR(36) NOT NULL,
 mode VARCHAR(16) NOT NULL,
 progress INT NOT NULL DEFAULT 0,
 completion_pending BOOLEAN NOT NULL DEFAULT FALSE,
 current_note TEXT NOT NULL,
 estimated_start DATETIME(6) NULL,
 estimated_finish DATETIME(6) NULL,
 answers JSON NOT NULL,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY fulfillment_order (order_id),
 KEY fulfillment_assignee (assigned_id,updated_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
-- +goose Down
DROP TABLE fulfillments;
