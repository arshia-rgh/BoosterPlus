package recovery

import (
	"context"
	"database/sql"
	"errors"
)

// SealSessions invalidates restored authentication state while preserving MFA
// enrollment, business records and financial evidence. Call only in quarantine.
func SealSessions(ctx context.Context, db *sql.DB) (result error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return errors.New("recovery authentication transaction unavailable")
	}
	defer func() {
		if rollbackErr := tx.Rollback(); rollbackErr != nil && !errors.Is(rollbackErr, sql.ErrTxDone) {
			result = errors.Join(result, errors.New("recovery authentication rollback failed"))
		}
	}()
	for _, query := range []string{
		"UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP(6) WHERE revoked_at IS NULL",
		"UPDATE auth_challenges SET consumed=TRUE WHERE consumed=FALSE",
		"DELETE FROM auth_flows",
		"UPDATE auth_messages SET encrypted_payload=NULL WHERE encrypted_payload IS NOT NULL",
		"UPDATE auth_recoveries SET state='expired',new_email='',case_reference='' WHERE state='pending'",
		"UPDATE users SET mfa_pending=NULL,mfa_pending_expires=NULL,mfa_recovery_hashes=NULL WHERE mfa_pending IS NOT NULL OR mfa_recovery_hashes IS NOT NULL",
	} {
		if _, err = tx.ExecContext(ctx, query); err != nil {
			return errors.New("recovery authentication invalidation failed")
		}
	}
	if err = tx.Commit(); err != nil {
		return errors.New("recovery authentication commit failed; keep target quarantined")
	}
	return nil
}
