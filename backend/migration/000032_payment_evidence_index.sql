-- +goose NO TRANSACTION
-- +goose Up
CREATE INDEX payment_attempt_evidence ON payment_records (account, attempt_id, checked_at, id);

-- +goose Down
DROP INDEX payment_attempt_evidence ON payment_records;
