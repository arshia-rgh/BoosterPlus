package identity

import (
	"context"
	"net/http"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
)

// Protect reuses session, Origin and CSRF checks for feature endpoints. A blank
// capability permits anonymous requests but still protects mutations from CSRF.
func (s *Service) Protect(capability string, next func(http.ResponseWriter, *http.Request, *Principal) error) http.HandlerFunc {
	return s.handleLimit(func(w http.ResponseWriter, r *http.Request, state requestState) error {
		if capability != "" {
			if err := Require(state.principal, capability); err != nil {
				return err
			}
		}
		return next(w, r, state.principal)
	}, 256<<10)
}

// StaffTransaction fences catalog mutations against role/suspension changes and
// rechecks the live session inside the same READ COMMITTED transaction.
func (s *Service) StaffTransaction(ctx context.Context, p *Principal, sensitive bool, fn func(*ent.Tx, *Principal) error) error {
	if err := Require(p, "admin"); err != nil {
		return err
	}
	return s.transaction(ctx, func(tx *ent.Tx) error {
		if err := lockSecurity(ctx, tx); err != nil {
			return err
		}
		current, err := s.fresh(ctx, tx, p)
		if err != nil {
			return err
		}
		if err = Require(current, "admin"); err != nil {
			return err
		}
		if sensitive {
			if err = s.sensitive(current); err != nil {
				return err
			}
		}
		return fn(tx, current)
	})
}
