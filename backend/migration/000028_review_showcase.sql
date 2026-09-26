-- +goose NO TRANSACTION
-- +goose Up
-- Explicit CLI-only index for the bounded public recent-review feed.
CREATE INDEX review_showcase ON reviews (state, published_at, id);

-- +goose Down
DROP INDEX review_showcase ON reviews;
