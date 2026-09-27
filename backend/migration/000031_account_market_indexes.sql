-- +goose NO TRANSACTION
-- +goose Up
-- Explicit CLI-only access paths for global and game-scoped account discovery.
CREATE INDEX account_market_newest ON account_listings (state, created_at, id);
CREATE INDEX account_game_newest ON account_listings (state, slug, created_at, id);
CREATE INDEX account_market_price ON account_listings (state, public_currency, public_amount_minor, id);
CREATE INDEX account_game_price ON account_listings (state, slug, public_currency, public_amount_minor, id);

-- +goose Down
DROP INDEX account_game_price ON account_listings;
DROP INDEX account_market_price ON account_listings;
DROP INDEX account_game_newest ON account_listings;
DROP INDEX account_market_newest ON account_listings;
