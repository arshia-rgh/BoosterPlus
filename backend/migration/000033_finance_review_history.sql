-- +goose NO TRANSACTION
-- +goose Up
ALTER TABLE case_events ADD COLUMN internal_rationale VARCHAR(2000) NOT NULL DEFAULT '';
ALTER TABLE transfer_events ADD COLUMN snapshot JSON NULL;

ALTER TABLE payment_records ADD COLUMN manual_job_id VARCHAR(64) NOT NULL DEFAULT '';
ALTER TABLE transfer_records ADD COLUMN manual_job_id VARCHAR(64) NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE transfer_records DROP COLUMN manual_job_id;
ALTER TABLE payment_records DROP COLUMN manual_job_id;
ALTER TABLE transfer_events DROP COLUMN snapshot;
ALTER TABLE case_events DROP COLUMN internal_rationale;
