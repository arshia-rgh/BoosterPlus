package vault

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// DenyAll is used by maintenance workers, which expose no human vault access.
func DenyAll(context.Context, *ent.Tx, *identity.Principal, Scope, Operation) error {
	return identity.ErrForbidden
}

// RotateForOwner rewraps one policy-authorized live bundle with recent owner
// authentication. It does not reveal/decrypt the payload, extend expiry, or
// override a concurrent replacement. Already-current keys are idempotent.
func (s *Store) RotateForOwner(ctx context.Context, p *identity.Principal, scope Scope, version int) (View, error) {
	var result View
	err := s.auth.AuthorizedTransaction(ctx, p, "owner", true, func(tx *ent.Tx, current *identity.Principal) error {
		if e := s.policy(ctx, tx, current, scope, Rotate); e != nil {
			return e
		}
		row, e := record(ctx, tx.Client(), scope)
		if e != nil {
			return e
		}
		if row.State != secretbundle.StateActive || !row.ExpiresAt.After(s.now()) {
			return ErrUnavailable
		}
		storedScope, e := cipherScope(row, scope)
		if e != nil {
			return e
		}
		if row.KeyVersion == s.keys.active {
			result = metadata(row)
			return nil
		}
		if row.Version != version || version >= 2147483646 {
			return ErrConflict
		}
		encrypted, e := s.keys.Rewrap(row.ID, storedScope, envelope(row))
		if e != nil {
			return e
		}
		row, e = tx.SecretBundle.UpdateOneID(row.ID).Where(secretbundle.VersionEQ(version)).AddVersion(1).SetKeyVersion(encrypted.KeyID).SetWrappedKey(encrypted.WrappedKey).SetUpdatedAt(s.now()).Save(ctx)
		if ent.IsNotFound(e) {
			return ErrConflict
		}
		if e != nil {
			return e
		}
		if e = audit(ctx, tx, current, row.ID, "vault_key_rotated", s.now()); e != nil {
			return e
		}
		result = metadata(row)
		return nil
	})
	return result, err
}

// Status checks scope policy before returning nonsecret lifecycle metadata.
func (s *Store) Status(ctx context.Context, p *identity.Principal, scope Scope) (View, error) {
	var result View
	err := s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		if current.User.ID != scope.OwnerID {
			return identity.ErrForbidden
		}
		if e := s.policy(ctx, tx, current, scope, Inspect); e != nil {
			return e
		}
		row, e := record(ctx, tx.Client(), scope)
		if e != nil {
			return e
		}
		result = metadata(row)
		if !row.ExpiresAt.After(s.now()) && row.State == secretbundle.StateActive {
			result.State = "expired"
		}
		return nil
	})
	return result, err
}

// Expire atomically clears live ciphertext and wrapping material with an audit.
// It is an internal worker operation. Historical encrypted backups follow their
// separately approved retention; this does not claim immediate backup erasure.
func (s *Store) Expire(ctx context.Context) error {
	rows, err := s.client.SecretBundle.Query().Where(secretbundle.StateEQ(secretbundle.StateActive), secretbundle.ExpiresAtLTE(s.now())).Order(ent.Asc(secretbundle.FieldExpiresAt)).Limit(100).All(ctx)
	if err != nil {
		return err
	}
	for _, row := range rows {
		if err = s.expireOne(ctx, row); err != nil {
			return err
		}
	}
	return nil
}
func (s *Store) expireOne(ctx context.Context, row *ent.SecretBundle) error {
	tx, err := s.client.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return err
	}
	count, err := tx.SecretBundle.Update().Where(secretbundle.IDEQ(row.ID), secretbundle.VersionEQ(row.Version), secretbundle.StateEQ(secretbundle.StateActive), secretbundle.ExpiresAtLTE(s.now())).AddVersion(1).SetState(secretbundle.StateDeleted).ClearWrappedKey().ClearEncryptedPayload().SetKeyVersion("").SetUpdatedAt(s.now()).Save(ctx)
	if err != nil {
		return errors.Join(err, tx.Rollback())
	}
	if count == 1 {
		_, err = tx.AuthAudit.Create().SetID(uuid.NewString()).SetAction("vault_expired").SetTargetID(row.ID).SetMetadata(map[string]string{}).SetCreatedAt(s.now()).Save(ctx)
		if err != nil {
			return errors.Join(err, tx.Rollback())
		}
	}
	return tx.Commit()
}

// RunCleanup retries bounded expiry work without logging secret data or errors.
func (s *Store) RunCleanup(ctx context.Context, logger *slog.Logger) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			task, cancel := context.WithTimeout(ctx, 30*time.Second)
			err := s.Expire(task)
			cancel()
			if err != nil && ctx.Err() == nil {
				logger.ErrorContext(ctx, "protected secret expiry unavailable")
			}
		}
	}
}
