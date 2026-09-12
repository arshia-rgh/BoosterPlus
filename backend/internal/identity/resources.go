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
	return s.AuthorizedTransaction(ctx, p, "admin", sensitive, fn)
}

// AuthorizedTransaction fences short business mutations against concurrent role,
// suspension and session changes. All effects must remain inside the transaction.
func (s *Service) AuthorizedTransaction(ctx context.Context, p *Principal, capability string, sensitive bool, fn func(*ent.Tx, *Principal) error) error {
	if err := Require(p, capability); err != nil {
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
		if err = Require(current, capability); err != nil {
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

// RequestDigest hashes canonical request data with domain separation for private
// idempotency comparison. Neither raw request data nor the digest belongs in logs.
func (s *Service) RequestDigest(scope string, data []byte) string {
	return s.digest("business-request", scope, string(data))
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

// Recheck refreshes a read-only long-lived operation's session/role without
// retaining a database transaction or a stale authority snapshot across waits.
func (s *Service) Recheck(ctx context.Context, p *Principal, capability string) (*Principal, error) {
	if err := Require(p, capability); err != nil {
		return nil, err
	}
	var current *Principal
	err := s.transaction(ctx, func(tx *ent.Tx) error {
		var err error
		current, err = s.fresh(ctx, tx, p)
		if err != nil {
			return err
		}
		return Require(current, capability)
	})
	return current, err
}

// ProtectUpload keeps a larger binary-body allowance limited to authenticated
// upload routes; all session, proxy, Origin, CSRF and shared rate checks still run.
func (s *Service) ProtectUpload(capability string, next func(http.ResponseWriter, *http.Request, *Principal) error) http.HandlerFunc {
	return s.handleLimit(func(w http.ResponseWriter, r *http.Request, state requestState) error {
		if err := Require(state.principal, capability); err != nil {
			return err
		}
		for _, key := range []string{"ip:" + state.ip, "user:" + state.principal.User.ID} {
			allowed, err := s.Throttle(r.Context(), "media-bytes", key, 40, time.Hour)
			if err != nil {
				return err
			}
			if !allowed {
				return ErrLimited
			}
		}
		return next(w, r, state.principal)
	}, 4<<20)
}

// RecentAccountTransaction requires a recent primary factor and, when enrolled, a recent second factor for personal-data operations.
func (s *Service) RecentAccountTransaction(ctx context.Context, p *Principal, fn func(*ent.Tx, *Principal) error) error {
	return s.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *Principal) error {
		if e := s.recent(current); e != nil {
			return e
		}
		if current.User.MfaEnabled {
			if e := s.sensitive(current); e != nil {
				return e
			}
		}
		return fn(tx, current)
	})
}
