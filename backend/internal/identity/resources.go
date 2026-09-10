package identity

import (
	"context"
	"net/http"
	"time"

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

// ProtectRate applies shared per-address and per-account limits after the usual
// authenticated proxy, session, Origin and CSRF checks. Client headers cannot
// select the bucket identity without the configured proxy authentication key.
func (s *Service) ProtectRate(capability, scope string, limit int, window time.Duration, next func(http.ResponseWriter, *http.Request, *Principal) error) http.HandlerFunc {
	return s.handleLimit(func(w http.ResponseWriter, r *http.Request, state requestState) error {
		if capability != "" {
			if err := Require(state.principal, capability); err != nil {
				return err
			}
		}
		keys := []string{"ip:" + state.ip}
		if state.principal != nil {
			keys = append(keys, "user:"+state.principal.User.ID)
		}
		for _, key := range keys {
			allowed, err := s.Throttle(r.Context(), scope, key, limit, window)
			if err != nil {
				return err
			}
			if !allowed {
				return ErrLimited
			}
		}
		return next(w, r, state.principal)
	}, 256<<10)
}
