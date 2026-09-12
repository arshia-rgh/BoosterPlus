-- +goose NO TRANSACTION
-- +goose Up
ALTER TABLE availability_targets ADD COLUMN criteria JSON NULL;
ALTER TABLE availability_targets ADD COLUMN stock_marker VARCHAR(100) NOT NULL DEFAULT '';
-- +goose Down
ALTER TABLE availability_targets DROP COLUMN stock_marker;
ALTER TABLE availability_targets DROP COLUMN criteria;
