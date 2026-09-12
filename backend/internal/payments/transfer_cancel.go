package payments

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// CancelRefund releases an unissued proposal only. A possibly issued outgoing
// transfer must retain its reserve and be reconciled, even when creation is paused.
func (s *Store) CancelRefund(ctx context.Context, p *identity.Principal, id string, input TransferChange) (TransferView, error) {
	if !validID(id) || input.Version < 1 || input.Version >= maxVersion || !validText(input.Reason, 10, 2000) || input.Code != "" {
		return TransferView{}, ErrInvalid
	}
	var result TransferView
	err := s.auth.AuthorizedTransaction(ctx, p, "owner", true, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.MoneyTransfer.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Kind != "refund" || row.Version != input.Version || row.Account != s.account {
			return ErrConflict
		}
		if row.State != "recipient_pending" && row.State != "verified" && row.State != "approved" {
			return ErrConflict
		}
		if row.CurrentAttempt != "" {
			attempt, readErr := tx.TransferAttempt.Get(ctx, row.CurrentAttempt)
			if readErr != nil {
				return readErr
			}
			if attempt.State != "approved" || attempt.ProviderID != nil {
				return ErrConflict
			}
			if _, e = tx.TransferAttempt.UpdateOneID(attempt.ID).ClearActiveTransferID().SetState("cancelled").SetUpdatedAt(s.instant()).Save(ctx); e != nil {
				return e
			}
		}
		row, e = tx.MoneyTransfer.UpdateOneID(id).AddVersion(1).SetState("cancelled").SetUpdatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		if e = s.transferEvent(ctx, tx, current, row, "cancelled"); e != nil {
			return e
		}
		if e = s.transferReason(ctx, tx, current, row, input.Reason); e != nil {
			return e
		}
		result, e = transferView(ctx, tx.Client(), row)
		return e
	})
	return result, err
}
