-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE supplier_bindings (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    shop_product_id VARCHAR(36) NOT NULL,
    release_id VARCHAR(36) NULL,
    data JSON NOT NULL,
    created_at DATETIME(6) NOT NULL,
    UNIQUE KEY supplier_binding_release (release_id),
    KEY supplier_binding_product (shop_product_id, id)
);
CREATE TABLE supplier_quotes (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    shop_product_id VARCHAR(36) NOT NULL,
    release_id VARCHAR(36) NOT NULL,
    data JSON NOT NULL,
    amount_minor VARCHAR(12) NOT NULL,
    order_id VARCHAR(36) NULL,
    expires_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    UNIQUE KEY supplier_quote_order (order_id),
    KEY supplier_quote_customer (user_id, expires_at)
);
-- +goose Down
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'accepted supplier quotes and publications are forward-only';
