-- +goose NO TRANSACTION
-- +goose Up
CREATE TABLE staff_profiles (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 version BIGINT NOT NULL DEFAULT 1,
 timezone VARCHAR(64) NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT FALSE,
 game_tags JSON NOT NULL,
 region_tags JSON NOT NULL,
 updated_at DATETIME(6) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE availability_windows (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 user_id VARCHAR(36) NOT NULL,
 version BIGINT NOT NULL DEFAULT 1,
 request_key VARCHAR(36) NOT NULL,
 request_hash CHAR(64) NOT NULL,
 starts_at DATETIME(6) NOT NULL,
 ends_at DATETIME(6) NOT NULL,
 timezone VARCHAR(64) NOT NULL,
 active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY availability_request (user_id,request_key),
 KEY availability_staff_time (user_id,active,starts_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE bookings (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 order_id VARCHAR(36) NOT NULL,
 user_id VARCHAR(36) NOT NULL,
 assigned_id VARCHAR(36) NOT NULL,
 availability_id VARCHAR(36) NOT NULL,
 version BIGINT NOT NULL DEFAULT 1,
 request_key VARCHAR(36) NOT NULL,
 request_hash CHAR(64) NOT NULL,
 previous_id VARCHAR(36) NOT NULL DEFAULT '',
 starts_at DATETIME(6) NOT NULL,
 ends_at DATETIME(6) NOT NULL,
 timezone VARCHAR(64) NOT NULL,
 state VARCHAR(16) NOT NULL DEFAULT 'proposed',
 reminded BOOLEAN NOT NULL DEFAULT FALSE,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY booking_request (user_id,request_key),
 KEY booking_order (order_id,created_at,id),
 KEY booking_staff_time (assigned_id,state,starts_at,ends_at),
 KEY booking_customer_time (user_id,state,starts_at,ends_at),
 KEY booking_reminder (state,reminded,starts_at,id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE booking_events (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 booking_id VARCHAR(36) NOT NULL,
 version BIGINT NOT NULL,
 state VARCHAR(16) NOT NULL,
 note TEXT NOT NULL,
 actor_role VARCHAR(32) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY booking_event_version (booking_id,version)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
-- +goose Down
DROP TABLE booking_events;
DROP TABLE bookings;
DROP TABLE availability_windows;
DROP TABLE staff_profiles;
