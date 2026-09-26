-- +goose NO TRANSACTION
-- +goose Up
-- Historical hosted attempts remain hosted and can never acquire a new deposit.
ALTER TABLE payment_attempts ADD COLUMN native_checkout BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE payment_attempts ADD COLUMN deposit_claimed BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE payment_attempts ADD COLUMN deposit_payment_id VARCHAR(32) NOT NULL DEFAULT '';
ALTER TABLE payment_attempts ADD COLUMN deposit_data JSON NULL;

-- +goose Down
ALTER TABLE payment_attempts DROP COLUMN deposit_data;
ALTER TABLE payment_attempts DROP COLUMN deposit_payment_id;
ALTER TABLE payment_attempts DROP COLUMN deposit_claimed;
ALTER TABLE payment_attempts DROP COLUMN native_checkout;
