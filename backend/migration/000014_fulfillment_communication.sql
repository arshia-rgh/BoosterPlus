-- +goose NO TRANSACTION
-- +goose Up
ALTER TABLE conversations ADD COLUMN fulfillment_order_id VARCHAR(36) NULL;
ALTER TABLE conversations ADD COLUMN booster_shared BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX conversation_fulfillment ON conversations (fulfillment_order_id);
ALTER TABLE conversation_messages ADD COLUMN purpose VARCHAR(16) NOT NULL DEFAULT 'message';
-- +goose Down
ALTER TABLE conversation_messages DROP COLUMN purpose;
DROP INDEX conversation_fulfillment ON conversations;
ALTER TABLE conversations DROP COLUMN booster_shared;
ALTER TABLE conversations DROP COLUMN fulfillment_order_id;
