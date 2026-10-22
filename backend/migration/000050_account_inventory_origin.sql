-- +goose NO TRANSACTION
-- +goose Up
-- Run with API/worker writers stopped. Every existing listing derives its
-- origin from its accepted seller offer; a listing whose offer is missing,
-- not accepted, mismatched or has an unknown model stops the migration (a
-- duplicate-key error on the security lock row) before any DDL. Ownership is
-- never defaulted or guessed.
INSERT INTO auth_controls (id,version)
SELECT 1,0 WHERE EXISTS (
 SELECT 1 FROM account_listings l LEFT JOIN seller_offers o ON o.id=l.offer_id
 WHERE o.id IS NULL OR o.state<>'accepted' OR o.submission_id<>l.submission_id OR o.seller_id<>l.seller_id
 OR JSON_UNQUOTE(JSON_EXTRACT(o.data,'$.model')) IS NULL
 OR JSON_UNQUOTE(JSON_EXTRACT(o.data,'$.model')) NOT IN ('buy_first','consignment')
);
ALTER TABLE account_listings ADD COLUMN origin VARCHAR(16) NOT NULL DEFAULT '';
UPDATE account_listings l JOIN seller_offers o ON o.id=l.offer_id SET l.origin=JSON_UNQUOTE(JSON_EXTRACT(o.data,'$.model'));
INSERT INTO auth_controls (id,version)
SELECT 1,0 WHERE EXISTS (SELECT 1 FROM account_listings WHERE origin NOT IN ('buy_first','consignment'));
-- PLAYORA-created listings have no submission, offer or seller. NULLs keep the
-- existing one-listing-per-submission/offer unique keys for seller rows.
ALTER TABLE account_listings MODIFY COLUMN submission_id VARCHAR(36) NULL;
ALTER TABLE account_listings MODIFY COLUMN offer_id VARCHAR(36) NULL;
ALTER TABLE account_listings MODIFY COLUMN seller_id VARCHAR(36) NULL;
CREATE INDEX account_inventory_origin ON account_listings (origin,state,id);
ALTER TABLE account_listings ALTER COLUMN origin DROP DEFAULT;
-- +goose Down
-- The runner refuses this step once any PLAYORA-created listing exists, so no
-- row is deleted here; NOT NULL is restored first and fails before any drop.
ALTER TABLE account_listings MODIFY COLUMN seller_id VARCHAR(36) NOT NULL;
ALTER TABLE account_listings MODIFY COLUMN offer_id VARCHAR(36) NOT NULL;
ALTER TABLE account_listings MODIFY COLUMN submission_id VARCHAR(36) NOT NULL;
DROP INDEX account_inventory_origin ON account_listings;
ALTER TABLE account_listings DROP COLUMN origin;
