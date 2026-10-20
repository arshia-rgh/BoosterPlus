-- +goose NO TRANSACTION
-- +goose Up
-- Existing attempts/imports without a proven merchant stay blocked. A token
-- change must never silently assign them to a different supplier shop.
ALTER TABLE supplier_connections ADD COLUMN merchant_id VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE supplier_imports ADD COLUMN merchant_id VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE supplier_purchases ADD COLUMN merchant_id VARCHAR(20) NOT NULL DEFAULT '';
-- +goose Down
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'supplier merchant evidence is forward-only';
