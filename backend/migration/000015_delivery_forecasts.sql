-- +goose NO TRANSACTION
-- +goose Up
ALTER TABLE fulfillments ADD COLUMN forecast JSON NULL;
-- +goose Down
ALTER TABLE fulfillments DROP COLUMN forecast;
