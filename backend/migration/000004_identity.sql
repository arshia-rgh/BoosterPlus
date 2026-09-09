-- +goose NO TRANSACTION
-- +goose Up
ALTER TABLE users
    ADD COLUMN email_verified_at DATETIME(6) NULL,
    ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'customer',
    ADD COLUMN staff_alias VARCHAR(80) NOT NULL DEFAULT '',
    ADD COLUMN suspended BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN auth_version BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN terms_version VARCHAR(64) NOT NULL DEFAULT '',
    ADD COLUMN terms_accepted_at DATETIME(6) NULL,
    ADD COLUMN notify_updates BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN mfa_secret BLOB NULL,
    ADD COLUMN mfa_pending BLOB NULL,
    ADD COLUMN mfa_pending_expires DATETIME(6) NULL,
    ADD COLUMN mfa_counter BIGINT NOT NULL DEFAULT -1,
    ADD COLUMN mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN mfa_recovery_hashes JSON NULL;
CREATE TABLE auth_identities (
    id VARCHAR(64) NOT NULL PRIMARY KEY, user_id VARCHAR(36) NOT NULL,
    provider VARCHAR(16) NOT NULL, subject VARCHAR(255) NOT NULL, created_at DATETIME(6) NOT NULL,
    UNIQUE KEY auth_identity_subject (provider, subject), KEY auth_identity_user (user_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE auth_sessions (
    id VARCHAR(64) NOT NULL PRIMARY KEY, user_id VARCHAR(36) NOT NULL, token_hash CHAR(64) NOT NULL,
    auth_version BIGINT NOT NULL, authenticated_at DATETIME(6) NOT NULL, mfa_verified_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL, last_seen_at DATETIME(6) NOT NULL, expires_at DATETIME(6) NOT NULL,
    revoked_at DATETIME(6) NULL, UNIQUE KEY auth_session_token (token_hash),
    KEY auth_session_user (user_id), KEY auth_session_expiry (expires_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE auth_challenges (
    id VARCHAR(64) NOT NULL PRIMARY KEY, email VARCHAR(254) NOT NULL, purpose VARCHAR(32) NOT NULL,
    user_id VARCHAR(36) NOT NULL DEFAULT '', session_id VARCHAR(64) NOT NULL DEFAULT '',
    browser_hash CHAR(64) NOT NULL, code_digest CHAR(64) NOT NULL,
    attempts INT NOT NULL DEFAULT 0, consumed BOOLEAN NOT NULL DEFAULT FALSE,
    terms_version VARCHAR(64) NOT NULL DEFAULT '', created_at DATETIME(6) NOT NULL, expires_at DATETIME(6) NOT NULL,
    KEY auth_challenge_destination (email,purpose), KEY auth_challenge_expiry (expires_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE auth_messages (
    id VARCHAR(64) NOT NULL PRIMARY KEY, challenge_id VARCHAR(64) NOT NULL DEFAULT '',
    encrypted_payload BLOB NULL, created_at DATETIME(6) NOT NULL, expires_at DATETIME(6) NOT NULL,
    sent_at DATETIME(6) NULL, KEY auth_message_expiry (expires_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE auth_rates (
    id VARCHAR(64) NOT NULL PRIMARY KEY, count INT NOT NULL DEFAULT 0, expires_at DATETIME(6) NOT NULL,
    KEY auth_rate_expiry (expires_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE auth_flows (
    id VARCHAR(64) NOT NULL PRIMARY KEY, browser_hash CHAR(64) NOT NULL, purpose VARCHAR(32) NOT NULL,
    user_id VARCHAR(36) NOT NULL DEFAULT '', session_id VARCHAR(64) NOT NULL DEFAULT '',
    nonce VARCHAR(64) NOT NULL, verifier BLOB NOT NULL, terms_version VARCHAR(64) NOT NULL DEFAULT '',
    consumed BOOLEAN NOT NULL DEFAULT FALSE, expires_at DATETIME(6) NOT NULL,
    KEY auth_flow_expiry (expires_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE auth_audits (
    id VARCHAR(64) NOT NULL PRIMARY KEY, actor_id VARCHAR(36) NOT NULL DEFAULT '',
    actor_reference VARCHAR(80) NOT NULL DEFAULT '', action VARCHAR(64) NOT NULL,
    target_id VARCHAR(64) NOT NULL DEFAULT '', metadata JSON NOT NULL, created_at DATETIME(6) NOT NULL,
    KEY auth_audit_created (created_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE auth_recoveries (
    id VARCHAR(64) NOT NULL PRIMARY KEY, user_id VARCHAR(36) NOT NULL, new_email VARCHAR(254) NOT NULL,
    state VARCHAR(32) NOT NULL DEFAULT 'pending', case_reference VARCHAR(80) NOT NULL DEFAULT '',
    created_at DATETIME(6) NOT NULL, expires_at DATETIME(6) NOT NULL,
    KEY auth_recovery_state (state,created_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE auth_controls (id INT NOT NULL PRIMARY KEY, version BIGINT NOT NULL DEFAULT 0);
INSERT INTO auth_controls (id) VALUES (1);

-- +goose Down
DROP TABLE auth_controls;
DROP TABLE auth_recoveries;
DROP TABLE auth_audits;
DROP TABLE auth_flows;
DROP TABLE auth_rates;
DROP TABLE auth_messages;
DROP TABLE auth_challenges;
DROP TABLE auth_sessions;
DROP TABLE auth_identities;
ALTER TABLE users DROP COLUMN mfa_recovery_hashes, DROP COLUMN mfa_enabled, DROP COLUMN mfa_counter,
    DROP COLUMN mfa_pending_expires, DROP COLUMN mfa_pending, DROP COLUMN mfa_secret,
    DROP COLUMN notify_updates, DROP COLUMN terms_accepted_at, DROP COLUMN terms_version,
    DROP COLUMN auth_version, DROP COLUMN suspended, DROP COLUMN staff_alias, DROP COLUMN role,
    DROP COLUMN email_verified_at;
