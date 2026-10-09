package identity

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
)

// StaffJobTransaction rechecks the actor of a previously authenticated durable
// staff action. It is not an HTTP/session substitute: callers must bind an
// immutable reviewed operation inside the same transaction. Security-version
// changes invalidate pending authority; normal session expiry does not.
func (s *Service) StaffJobTransaction(ctx context.Context, actor string, version int64, fn func(*ent.Tx) error) error {
	return s.transaction(ctx, func(tx *ent.Tx) error {
		if err := lockSecurity(ctx, tx); err != nil {
			return err
		}
		user, err := tx.User.Get(ctx, actor)
		if err != nil {
			return err
		}
		if user.Portal != string(PortalAdmin) || user.DeletedAt != nil || user.Suspended || !user.MfaEnabled || user.EmailVerifiedAt == nil || user.AuthVersion != version || (user.Role != RoleAdmin && user.Role != RoleOwner) {
			return ErrForbidden
		}
		return fn(tx)
	})
}
