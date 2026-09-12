package payments

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/transferrecord"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// RefundHandler makes one claimed financial POST; an ambiguous attempt cannot be sent twice.
func (s *Store) RefundHandler() jobs.Handler {
	return func(ctx context.Context, job jobs.Job) error {
		var ref struct {
			AttemptID string `json:"attempt_id"`
		}
		if err := json.Unmarshal(job.Payload, &ref); err != nil || !validID(ref.AttemptID) {
			return ErrInvalid
		}
		return s.issueRefund(ctx, ref.AttemptID)
	}
}
func (s *Store) issueRefund(ctx context.Context, id string) error {
	if s.outgoing == nil || !s.outgoingEnabled {
		return ErrUnavailable
	}
	attempt, err := s.client.TransferAttempt.Get(ctx, id)
	if err != nil {
		return err
	}
	transfer, err := s.client.MoneyTransfer.Get(ctx, attempt.TransferID)
	if err != nil {
		return err
	}
	if transfer.Account != s.account || attempt.Account != s.account {
		return ErrUnavailable
	}
	if attempt.State != "approved" {
		if attempt.State == "creating" {
			return s.fenced(ctx, func(tx *ent.Tx) error {
				current, e := tx.TransferAttempt.Get(ctx, id)
				if e != nil {
					return e
				}
				if current.State != "creating" {
					return nil
				}
				if _, e = tx.TransferAttempt.UpdateOneID(id).SetState("uncertain").SetIssue("outgoing_uncertain").SetUpdatedAt(s.instant()).Save(ctx); e != nil {
					return e
				}
				row, e := tx.MoneyTransfer.Get(ctx, current.TransferID)
				if e != nil {
					return e
				}
				if row.CurrentAttempt != id || row.State != "creating" {
					return ErrConflict
				}
				row, e = tx.MoneyTransfer.UpdateOneID(row.ID).SetState("uncertain").AddVersion(1).SetUpdatedAt(s.instant()).Save(ctx)
				if e != nil {
					return e
				}
				return s.transferEvent(ctx, tx, nil, row, "uncertain")
			})
		}
		return nil
	}
	recipient, err := decode[nowpayments.Recipient](attempt.Recipient)
	if err != nil {
		return err
	}
	// This request cannot move funds, so a failed address check leaves the POST unclaimed.
	if err = s.outgoing.CheckRecipient(ctx, transfer.Currency, recipient); err != nil {
		return err
	}
	claimed := false
	err = s.fenced(ctx, func(tx *ent.Tx) error {
		current, e := tx.TransferAttempt.Get(ctx, id)
		if e != nil {
			return e
		}
		row, e := tx.MoneyTransfer.Get(ctx, transfer.ID)
		if e != nil {
			return e
		}
		if current.State != "approved" || row.State != "approved" || row.CurrentAttempt != id {
			return nil
		}
		if e = s.transferEligible(ctx, tx, row); e != nil {
			return e
		}
		if e = s.previousTransfersFailed(ctx, tx, row); e != nil {
			return e
		}
		if _, e = tx.TransferAttempt.UpdateOneID(id).SetState("creating").SetUpdatedAt(s.instant()).Save(ctx); e != nil {
			return e
		}
		if _, e = tx.MoneyTransfer.UpdateOneID(row.ID).AddVersion(1).SetState("creating").SetUpdatedAt(s.instant()).Save(ctx); e != nil {
			return e
		}
		claimed = true
		return nil
	})
	if err != nil || !claimed {
		return err
	}
	payout, remoteErr := s.outgoing.CreatePayout(ctx, nowpayments.PayoutRequest{AttemptID: id, Currency: transfer.Currency, Amount: nowpayments.Decimal(transfer.Amount), Recipient: recipient})
	return s.fenced(ctx, func(tx *ent.Tx) error {
		current, e := tx.TransferAttempt.Get(ctx, id)
		if e != nil {
			return e
		}
		row, e := tx.MoneyTransfer.Get(ctx, transfer.ID)
		if e != nil {
			return e
		}
		if current.ProviderID != nil {
			return nil
		}
		if remoteErr != nil {
			if _, e = tx.TransferAttempt.UpdateOneID(id).SetState("uncertain").SetIssue("outgoing_uncertain").SetUpdatedAt(s.instant()).Save(ctx); e != nil {
				return e
			}
			row, e = tx.MoneyTransfer.UpdateOneID(row.ID).AddVersion(1).SetState("uncertain").SetUpdatedAt(s.instant()).Save(ctx)
			if e != nil {
				return e
			}
			return s.transferEvent(ctx, tx, nil, row, "uncertain")
		}
		if !providerPattern.MatchString(payout.ID) || !providerPattern.MatchString(payout.BatchID) || payout.AttemptID != id {
			return nowpayments.ErrEvidence
		}
		if _, e = tx.TransferAttempt.UpdateOneID(id).SetProviderID(payout.ID).SetBatchID(payout.BatchID).SetState("created").SetUpdatedAt(s.instant()).Save(ctx); e != nil {
			return e
		}
		row, e = tx.MoneyTransfer.UpdateOneID(row.ID).AddVersion(1).SetState("created").SetUpdatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		record, e := s.transferRecord(ctx, tx, payout.ID)
		if e != nil {
			return e
		}
		if e = s.queueTransfer(ctx, tx, record); e != nil {
			return e
		}
		return s.transferEvent(ctx, tx, nil, row, "created")
	})
}

// VerifyRefund forwards an ephemeral merchant code for one already-created batch.
func (s *Store) VerifyRefund(ctx context.Context, p *identity.Principal, id string, input TransferChange) error {
	return s.verifyTransfer(ctx, p, id, "refund", input)
}

// VerifySellerPayout forwards one ephemeral code only after independently matched payout evidence and eligibility.
func (s *Store) VerifySellerPayout(ctx context.Context, p *identity.Principal, id string, input TransferChange) error {
	return s.verifyTransfer(ctx, p, id, "seller_payout", input)
}
func (s *Store) verifyTransfer(ctx context.Context, p *identity.Principal, id, kind string, input TransferChange) error {
	if !validID(id) || input.Version < 1 || input.Version >= maxVersion || !validText(input.Reason, 10, 2000) {
		return ErrInvalid
	}
	if len(input.Code) != 6 || strings.Trim(input.Code, "0123456789") != "" {
		return ErrInvalid
	}
	if s.outgoing == nil || !s.outgoingEnabled {
		return ErrUnavailable
	}
	claim := uuid.NewString()
	var batch, attemptID string
	err := s.auth.AuthorizedTransaction(ctx, p, "owner", true, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.MoneyTransfer.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Kind != kind || row.Version != input.Version || row.State != "awaiting_verification" || row.Account != s.account {
			return ErrConflict
		}
		attempt, e := tx.TransferAttempt.Get(ctx, row.CurrentAttempt)
		if e != nil {
			return e
		}
		if attempt.ProviderID == nil || attempt.BatchID == "" {
			return ErrConflict
		}
		// A creation response is not sufficient authority to release a transfer.
		// Require a recent independent GET matching the approved immutable data.
		evidence, e := tx.TransferRecord.Query().Where(transferrecord.AccountEQ(s.account), transferrecord.ProviderIDEQ(*attempt.ProviderID)).Only(ctx)
		if e != nil {
			return e
		}
		if evidence.AttemptID != attempt.ID || evidence.State != "awaiting_verification" || evidence.Issue != "" || evidence.CheckedAt.Before(s.instant().Add(-time.Minute)) {
			return ErrConflict
		}
		observed, e := decode[nowpayments.Payout](evidence.Data)
		if e != nil {
			return e
		}
		if !outgoingMatches(row, attempt, observed) || observed.BatchID != attempt.BatchID {
			return ErrConflict
		}
		if e = s.transferEligible(ctx, tx, row); e != nil {
			return e
		}
		if e = s.previousTransfersFailed(ctx, tx, row); e != nil {
			return e
		}
		if _, e = tx.TransferAttempt.UpdateOneID(attempt.ID).SetLeaseOwner(claim).Save(ctx); e != nil {
			return e
		}
		if _, e = tx.MoneyTransfer.UpdateOneID(id).AddVersion(1).SetState("verifying").SetUpdatedAt(s.instant()).Save(ctx); e != nil {
			return e
		}
		if e = s.transferReason(ctx, tx, current, row, input.Reason); e != nil {
			return e
		}
		batch, attemptID = attempt.BatchID, attempt.ID
		return nil
	})
	if err != nil {
		return err
	}
	remoteErr := s.outgoing.VerifyPayout(ctx, batch, input.Code)
	return s.fenced(ctx, func(tx *ent.Tx) error {
		attempt, e := tx.TransferAttempt.Get(ctx, attemptID)
		if e != nil {
			return e
		}
		if attempt.LeaseOwner != claim {
			return ErrConflict
		}
		issue := ""
		if remoteErr != nil {
			issue = "verification_uncertain"
		}
		if _, e = tx.TransferAttempt.UpdateOneID(attemptID).SetIssue(issue).SetLeaseOwner("").Save(ctx); e != nil {
			return e
		}
		record, e := s.transferRecord(ctx, tx, *attempt.ProviderID)
		if e != nil {
			return e
		}
		return s.queueTransfer(ctx, tx, record)
	})
}
