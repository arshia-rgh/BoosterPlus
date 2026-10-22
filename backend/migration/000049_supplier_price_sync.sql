-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE supplier_price_runs (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 connection_id VARCHAR(32) NOT NULL,
 window_start DATETIME(6) NOT NULL,
 state VARCHAR(16) NOT NULL DEFAULT 'running',
 lease_owner VARCHAR(36) NOT NULL DEFAULT '',
 lease_until DATETIME(6) NULL,
 cursor_id VARCHAR(36) NOT NULL DEFAULT '',
 batch INT NOT NULL DEFAULT 0,
 checked INT NOT NULL DEFAULT 0,
 repriced INT NOT NULL DEFAULT 0,
 flagged INT NOT NULL DEFAULT 0,
 deferred INT NOT NULL DEFAULT 0,
 failed INT NOT NULL DEFAULT 0,
 issue VARCHAR(64) NOT NULL DEFAULT '',
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 finished_at DATETIME(6) NULL,
 UNIQUE KEY supplier_price_run_window (connection_id,window_start),
 KEY supplier_price_run_recent (connection_id,created_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE supplier_price_reviews (
 shop_product_id VARCHAR(36) NOT NULL PRIMARY KEY,
 connection_id VARCHAR(32) NOT NULL,
 version INT NOT NULL DEFAULT 1,
 status VARCHAR(32) NOT NULL,
 attention VARCHAR(16) NOT NULL DEFAULT '',
 release_id VARCHAR(36) NOT NULL,
 quantity VARCHAR(64) NOT NULL DEFAULT '',
 baseline_total VARCHAR(64) NOT NULL DEFAULT '',
 supplier_total VARCHAR(64) NOT NULL DEFAULT '',
 selling_minor VARCHAR(12) NOT NULL DEFAULT '',
 failures INT NOT NULL DEFAULT 0,
 run_id VARCHAR(36) NOT NULL,
 checked_at DATETIME(6) NOT NULL,
 detected_at DATETIME(6) NULL,
 acknowledged_by VARCHAR(36) NOT NULL DEFAULT '',
 acknowledged_at DATETIME(6) NULL,
 repriced_at DATETIME(6) NULL,
 repriced_from_minor VARCHAR(12) NOT NULL DEFAULT '',
 repriced_to_minor VARCHAR(12) NOT NULL DEFAULT '',
 repriced_from_total VARCHAR(64) NOT NULL DEFAULT '',
 repriced_to_total VARCHAR(64) NOT NULL DEFAULT '',
 updated_at DATETIME(6) NOT NULL,
 KEY supplier_price_review_attention (attention,detected_at,shop_product_id),
 KEY supplier_price_review_repriced (repriced_at,shop_product_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
-- +goose Down
-- Removes only automatic price-check records and alerts. Releases created by
-- automatic repricing stay ordinary immutable publications for older runtimes.
DROP TABLE supplier_price_reviews;
DROP TABLE supplier_price_runs;
