-- +goose NO TRANSACTION
-- +goose Up
CREATE INDEX orders_report_created ON orders (created_at, id);
CREATE INDEX games_report_created ON games (created_at, id);
CREATE INDEX users_report_created ON users (created_at, id);
-- +goose Down
DROP INDEX users_report_created ON users;
DROP INDEX games_report_created ON games;
DROP INDEX orders_report_created ON orders;
