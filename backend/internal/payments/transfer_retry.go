package payments

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/transferattempt"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/transferrecord"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// failedTransferEvidence requires a recent independent read before risking another transfer.
func (s *Store) failedTransferEvidence(ctx context.Context, tx *ent.Tx, row *ent.MoneyTransfer, attempt *ent.TransferAttempt) error {
	if attempt.State != "failed" || attempt.ProviderID == nil {
		return ErrConflict
	}
	proof, err := tx.TransferRecord.Query().Where(transferrecord.AccountEQ(s.account), transferrecord.ProviderIDEQ(*attempt.ProviderID)).Only(ctx)
	if err != nil {
		return err
	}
	if proof.AttemptID != attempt.ID || proof.State != "failed" || proof.Issue != "outgoing_failed" || proof.CheckedAt.Before(s.instant().Add(-time.Minute)) {
		return ErrConflict
	}
	observed, err := decode[nowpayments.Payout](proof.Data)
	if err != nil {
		return err
	}
	if !outgoingMatches(row, attempt, observed) || observed.BatchID != attempt.BatchID {
		return ErrConflict
	}
	return nil
}

// previousTransfersFailed fences retries against a changed result on any earlier attempt.
func (s *Store) previousTransfersFailed(ctx context.Context, tx *ent.Tx, row *ent.MoneyTransfer) error {
	previous, err := tx.TransferAttempt.Query().Where(transferattempt.TransferIDEQ(row.ID), transferattempt.IDNEQ(row.CurrentAttempt)).Limit(101).All(ctx)
	if err != nil {
		return err
	}
	if len(previous) > 100 {
		return ErrConflict
	}
	for _, attempt := range previous {
		if err = s.failedTransferEvidence(ctx, tx, row, attempt); err != nil {
			return err
		}
	}
	return nil
}
