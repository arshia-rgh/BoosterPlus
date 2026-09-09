-- +goose NO TRANSACTION
-- +goose Up
-- Legacy visibility cannot expose a game without an intact publication snapshot.
UPDATE games AS g
LEFT JOIN catalog_releases AS r ON r.id=g.current_release AND r.game_id=g.id
SET g.published=FALSE
WHERE g.published=TRUE AND r.id IS NULL;

-- +goose Down
-- Withdraw new sales before a subsequent rollback removes publication storage.
-- Retain drafts and release snapshots unless migration 5 is explicitly rolled back.
UPDATE games SET published=FALSE;
