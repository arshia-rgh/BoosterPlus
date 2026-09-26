-- +goose NO TRANSACTION
-- +goose Up
-- Explicit CLI-only indexes for bounded public aggregate projections.
CREATE INDEX orders_discovery_game_state ON orders (game_id, state, id);
CREATE INDEX order_events_completion_period ON order_events (order_id, action, created_at);

-- +goose Down
DROP INDEX order_events_completion_period ON order_events;
DROP INDEX orders_discovery_game_state ON orders;
