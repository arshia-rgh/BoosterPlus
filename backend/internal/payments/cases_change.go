package payments

import (
	"context"
	"slices"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/moneytransfer"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// ChangeCase separates review, appeal and final disposition from money movement.
func (s *Store) ChangeCase(ctx context.Context, p *identity.Principal, id, action string, admin bool, input CaseChange) (CaseView, error) {
	if !validID(id) || input.Version < 1 || input.Version >= maxVersion || !validText(input.Note, 10, 2000) {
		return CaseView{}, ErrInvalid
	}
	if input.InternalRationale != "" {
		if !admin {
			return CaseView{}, identity.ErrForbidden
		}
		if !validText(input.InternalRationale, 10, 2000) {
			return CaseView{}, ErrInvalid
		}
	}
	capability := "account"
	if admin {
		capability = "admin"
	}
	var result CaseView
	err := s.auth.AuthorizedTransaction(ctx, p, capability, admin, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.ServiceCase.Get(ctx, id)
		if e != nil {
			return e
		}
		if _, e = owned(ctx, tx.Client(), current, row.OrderID, admin); e != nil {
			return e
		}
		if row.Version != input.Version || row.ActiveOrderID == nil || row.State == "closed" {
			return ErrConflict
		}
		if action != "decide" && input.Outcome != "" {
			return ErrInvalid
		}
		policy, e := decode[Policy](row.Policy)
		if e != nil {
			return e
		}
		update := tx.ServiceCase.UpdateOneID(id).AddVersion(1).SetUpdatedAt(s.instant())
		switch action {
		case "reply":
		case "decide":
			if !admin {
				return identity.ErrForbidden
			}
			if row.State != "open" && row.State != "appealed" {
				return ErrConflict
			}
			if !slices.Contains([]string{"retain", "continue", "rework", "cancel"}, input.Outcome) {
				return ErrInvalid
			}
			update.SetState("decided").SetOutcome(input.Outcome).ClearAppealUntil()
			if policy.Remedies != nil && row.AppealCount < policy.Remedies.MaxAppeals {
				update.SetAppealUntil(s.instant().Add(time.Duration(policy.Remedies.AppealHours) * time.Hour))
			}
		case "appeal":
			if admin {
				return identity.ErrForbidden
			}
			if row.State != "decided" || policy.Remedies == nil || row.AppealCount >= policy.Remedies.MaxAppeals || row.AppealUntil == nil || !row.AppealUntil.After(s.instant()) {
				return ErrConflict
			}
			update.SetState("appealed").AddAppealCount(1).SetOutcome("").ClearAppealUntil()
		case "accept", "finalize":
			if row.State != "decided" {
				return ErrConflict
			}
			if action == "accept" && admin || action == "finalize" && !admin {
				return identity.ErrForbidden
			}
			if action == "finalize" && (policy.Remedies == nil || row.AppealUntil != nil && row.AppealUntil.After(s.instant())) {
				return ErrConflict
			}
			pending, pendingErr := tx.MoneyTransfer.Query().Where(moneytransfer.CaseIDEQ(id), moneytransfer.StateNotIn("confirmed", "cancelled")).Exist(ctx)
			if pendingErr != nil {
				return pendingErr
			}
			if pending {
				return ErrConflict
			}
			if e = s.applyCaseOutcome(ctx, tx, current, row); e != nil {
				return e
			}
			update.SetState("closed").ClearActiveOrderID()
		default:
			return ErrInvalid
		}
		row, e = update.Save(ctx)
		if e != nil {
			return e
		}
		if e = s.caseEvent(ctx, tx, current, row, action, input.Note, input.MessageID, input.InternalRationale); e != nil {
			return e
		}
		if action != "accept" && action != "finalize" {
			orderRow, readErr := tx.Order.Get(ctx, row.OrderID)
			if readErr != nil {
				return readErr
			}
			if e = s.event(ctx, tx, orderRow, orderRow.State, "case_updated", "The service case has an update. Review the private case conversation and decision."); e != nil {
				return e
			}
		}
		result, e = caseView(row)
		return e
	})
	return result, err
}
