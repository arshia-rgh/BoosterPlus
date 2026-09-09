package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// SchemaVersion is the runtime's expected forward-compatible schema version.
const SchemaVersion = 6

// Ready validates version state and critical schema shape without DDL or repair.
func Ready(ctx context.Context, db *sql.DB) error {
	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("database readiness: %w", err)
	}
	var count, version int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*), COALESCE(MAX(version),0) FROM schema_migration_journal WHERE state='applied'").Scan(&count, &version); err != nil {
		return errors.New("database schema is not installed")
	}
	if count != SchemaVersion || version != SchemaVersion {
		return errors.New("database schema version is incompatible")
	}
	var incomplete int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM schema_migration_journal WHERE state NOT IN ('applied','rolled_back')").Scan(&incomplete); err != nil {
		return fmt.Errorf("schema journal unavailable: %w", err)
	}
	if incomplete != 0 {
		return errors.New("database schema migration is interrupted")
	}
	if err := checkColumns(ctx, db); err != nil {
		return err
	}
	if err := checkIndexes(ctx, db); err != nil {
		return err
	}
	var controls int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM auth_controls WHERE id=1").Scan(&controls); err != nil || controls != 1 {
		return errors.New("identity security control row is missing")
	}
	return nil
}

func checkColumns(ctx context.Context, db *sql.DB) (result error) {
	expected := map[string]string{
		"users.email_verified_at": "datetime", "users.role": "varchar", "users.suspended": "tinyint", "users.auth_version": "bigint", "users.mfa_secret": "blob", "users.mfa_enabled": "tinyint",
		"auth_sessions.token_hash": "char", "auth_sessions.auth_version": "bigint", "auth_sessions.mfa_verified_at": "datetime", "auth_challenges.code_digest": "char", "auth_challenges.browser_hash": "char", "auth_challenges.attempts": "int", "auth_challenges.consumed": "tinyint", "auth_messages.encrypted_payload": "blob", "auth_identities.subject": "varchar", "auth_flows.verifier": "blob", "auth_rates.count": "int", "auth_audits.metadata": "json", "auth_recoveries.new_email": "varchar", "auth_controls.version": "bigint",
		"users.id": "varchar", "users.email": "varchar", "users.display_name": "varchar", "users.created_at": "datetime",
		"catalog_releases.id": "varchar", "catalog_releases.game_id": "varchar", "catalog_releases.configuration": "json", "catalog_releases.version": "bigint", "catalog_releases.created_by": "varchar", "catalog_releases.created_at": "datetime", "games.current_release": "varchar", "games.paused": "tinyint", "games.archived": "tinyint",
		"games.id": "varchar", "games.slug": "varchar", "games.name": "varchar", "games.configuration": "json", "games.version": "bigint", "games.published": "tinyint", "games.created_at": "datetime",
		"jobs.id": "varchar", "jobs.kind": "varchar", "jobs.idempotency_key": "varchar", "jobs.payload": "json", "jobs.request_hash": "char", "jobs.state": "varchar", "jobs.attempts": "int", "jobs.max_attempts": "int", "jobs.available_at": "datetime", "jobs.lease_until": "datetime", "jobs.owner": "varchar", "jobs.last_error": "varchar", "jobs.created_at": "datetime",
	}
	rows, err := db.QueryContext(ctx, "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name IN ('catalog_releases','users','games','jobs','auth_sessions','auth_challenges','auth_messages','auth_identities','auth_flows','auth_rates','auth_audits','auth_recoveries','auth_controls')")
	if err != nil {
		return err
	}
	defer func() { result = errors.Join(result, rows.Close()) }()
	for rows.Next() {
		var table, column, kind string
		if scanErr := rows.Scan(&table, &column, &kind); scanErr != nil {
			return scanErr
		}
		key := table + "." + column
		if wanted, ok := expected[key]; ok {
			if kind != wanted {
				return fmt.Errorf("incompatible column type: %s", key)
			}
			delete(expected, key)
		}
	}
	if rowErr := rows.Err(); rowErr != nil {
		return rowErr
	}
	if len(expected) != 0 {
		return errors.New("required schema columns are missing")
	}
	return nil
}

func checkIndexes(ctx context.Context, db *sql.DB) (result error) {
	expected := map[string]string{"catalog_releases.PRIMARY": "id", "catalog_releases.catalog_release_revision": "game_id,version", "auth_identities.auth_identity_subject": "provider,subject", "auth_sessions.auth_session_token": "token_hash", "auth_rates.PRIMARY": "id", "auth_controls.PRIMARY": "id",
		"users.PRIMARY": "id", "users.users_email_key": "email", "games.PRIMARY": "id", "games.games_slug_key": "slug", "jobs.PRIMARY": "id", "jobs.jobs_idempotency_key": "idempotency_key"}
	rows, err := db.QueryContext(ctx, "SELECT table_name,index_name,GROUP_CONCAT(column_name ORDER BY seq_in_index) FROM information_schema.statistics WHERE table_schema=DATABASE() AND non_unique=0 GROUP BY table_name,index_name")
	if err != nil {
		return err
	}
	defer func() { result = errors.Join(result, rows.Close()) }()
	for rows.Next() {
		var table, name, columns string
		if scanErr := rows.Scan(&table, &name, &columns); scanErr != nil {
			return scanErr
		}
		key := table + "." + name
		if wanted, ok := expected[key]; ok {
			if columns != wanted {
				return fmt.Errorf("incompatible unique index: %s", key)
			}
			delete(expected, key)
		}
	}
	if rowErr := rows.Err(); rowErr != nil {
		return rowErr
	}
	if len(expected) != 0 {
		return errors.New("required unique indexes are missing")
	}
	return nil
}
