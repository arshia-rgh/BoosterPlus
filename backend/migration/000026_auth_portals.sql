-- +goose NO TRANSACTION
-- +goose Up
-- Explicit CLI-only upgrade. Legacy sessions/flows/challenges cannot identify a
-- portal reliably; force fresh sign-in without touching users or enrolled factors.
ALTER TABLE auth_sessions ADD COLUMN portal VARCHAR(16) NOT NULL DEFAULT 'customer';
ALTER TABLE auth_challenges ADD COLUMN portal VARCHAR(16) NOT NULL DEFAULT 'customer';
ALTER TABLE auth_flows ADD COLUMN portal VARCHAR(16) NOT NULL DEFAULT 'customer';
UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(6) WHERE revoked_at IS NULL;
UPDATE auth_challenges SET consumed = TRUE WHERE consumed = FALSE;
UPDATE auth_flows SET consumed = TRUE WHERE consumed = FALSE;
-- Old application writers must fail closed instead of creating unscoped sessions.
ALTER TABLE auth_sessions ALTER COLUMN portal DROP DEFAULT;
ALTER TABLE auth_challenges ALTER COLUMN portal DROP DEFAULT;
ALTER TABLE auth_flows ALTER COLUMN portal DROP DEFAULT;

-- +goose Down
-- Never restore a usable session merely because a deployment rolled back.
UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(6) WHERE revoked_at IS NULL;
UPDATE auth_challenges SET consumed = TRUE WHERE consumed = FALSE;
UPDATE auth_flows SET consumed = TRUE WHERE consumed = FALSE;
ALTER TABLE auth_flows DROP COLUMN portal;
ALTER TABLE auth_challenges DROP COLUMN portal;
ALTER TABLE auth_sessions DROP COLUMN portal;
