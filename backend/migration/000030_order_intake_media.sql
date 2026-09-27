-- +goose NO TRANSACTION
-- +goose Up
-- Empty scope preserves every existing conversation attachment.
ALTER TABLE media_files ADD COLUMN intake_key VARCHAR(36) NOT NULL DEFAULT '';
ALTER TABLE media_files ADD COLUMN intake_order_id VARCHAR(36) NULL;
CREATE INDEX media_intake_scope ON media_files(user_id, intake_key);
CREATE INDEX media_intake_order ON media_files(intake_order_id);

-- +goose Down
-- Revoke intake files before removing their authorization context. Existing
-- conversation media remains accessible; the worker purges revoked objects.
UPDATE media_files SET state='deleted', purged_at=NULL WHERE intake_key<>'';
DROP INDEX media_intake_order ON media_files;
DROP INDEX media_intake_scope ON media_files;
ALTER TABLE media_files DROP COLUMN intake_order_id;
ALTER TABLE media_files DROP COLUMN intake_key;
