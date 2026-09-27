package fulfillment

import (
	"context"
	"errors"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// StartReadiness explains only the current assigned work's next prerequisite.
// It is advisory: mutations always recheck the same guards in their own transaction.
type StartReadiness struct {
	Ready       bool      `json:"ready"`
	Requirement string    `json:"requirement"`
	CheckedAt   time.Time `json:"checked_at"`
}

// Readiness reuses execution checks without exposing submitted answers or secrets.
func (s *Store) Readiness(ctx context.Context, p *identity.Principal, id, audience string) (StartReadiness, error) {
	result := StartReadiness{}
	if audience != "admin" && audience != "booster" {
		return result, identity.ErrForbidden
	}
	err := s.auth.AuthorizedTransaction(ctx, p, audience, false, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := paid(ctx, tx.Client(), id)
		if e != nil {
			return e
		}
		work, e := record(ctx, tx.Client(), id)
		if e != nil {
			return e
		}
		if e = authority(current, row, work, audience); e != nil {
			return e
		}
		result = StartReadiness{Requirement: "not_active", CheckedAt: s.now()}
		if !active(row) {
			return nil
		}
		requirement, e := s.startPrerequisites(ctx, tx, row, work)
		var invalid *catalog.Invalid
		if e != nil && !errors.Is(e, ErrConflict) && !errors.As(e, &invalid) {
			return e
		}
		result.Ready = e == nil
		result.Requirement = requirement
		return nil
	})
	return result, err
}
