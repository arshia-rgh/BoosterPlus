package payments

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/transferrecord"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

func (s *Store) transferRecord(ctx context.Context, tx *ent.Tx, id string) (*ent.TransferRecord, error) {
	if !providerPattern.MatchString(id) {
		return nil, ErrInvalid
	}
	row, err := tx.TransferRecord.Query().Where(transferrecord.AccountEQ(s.account), transferrecord.ProviderIDEQ(id)).Only(ctx)
	if !ent.IsNotFound(err) {
		return row, err
	}
	return tx.TransferRecord.Create().SetAccount(s.account).SetProviderID(id).SetData(map[string]any{}).SetCheckedAt(s.instant().Add(-time.Hour)).SetCreatedAt(s.instant()).Save(ctx)
}
func (s *Store) queueTransfer(ctx context.Context, tx *ent.Tx, row *ent.TransferRecord) error {
	return enqueue(ctx, tx, "payments.outgoing_reconcile", transferReadKey(row, s.instant()), map[string]string{"record_id": row.ID})
}

// OutgoingHandler reads authenticated evidence independently of the initial POST or merchant code.
func (s *Store) OutgoingHandler() jobs.Handler {
	return func(ctx context.Context, job jobs.Job) error {
		var ref struct {
			RecordID string `json:"record_id"`
		}
		if err := json.Unmarshal(job.Payload, &ref); err != nil || !validID(ref.RecordID) {
			return ErrInvalid
		}
		return s.ReconcileTransfer(ctx, ref.RecordID)
	}
}

// ReconcileTransfer records authenticated evidence with an expiring observation lease.
func (s *Store) ReconcileTransfer(ctx context.Context, id string) error {
	if s.outgoing == nil {
		return ErrUnavailable
	}
	owner := uuid.NewString()
	var claimed *ent.TransferRecord
	err := s.fenced(ctx, func(tx *ent.Tx) error {
		row, e := tx.TransferRecord.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Account != s.account {
			return ErrUnavailable
		}
		if row.Version >= maxVersion || row.LeaseUntil != nil && row.LeaseUntil.After(s.instant()) {
			return ErrConflict
		}
		claimed, e = tx.TransferRecord.UpdateOneID(id).AddVersion(1).SetLeaseOwner(owner).SetLeaseUntil(s.instant().Add(time.Minute)).Save(ctx)
		return e
	})
	if err != nil {
		return err
	}
	observed, remoteErr := s.outgoing.GetPayout(ctx, claimed.ProviderID)
	if remoteErr == nil && observed.ID != claimed.ProviderID {
		remoteErr = nowpayments.ErrEvidence
	}
	saveErr := s.fenced(ctx, func(tx *ent.Tx) error {
		row, e := tx.TransferRecord.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.LeaseOwner != owner || row.Version != claimed.Version || row.LeaseUntil == nil || !row.LeaseUntil.After(s.instant()) {
			return ErrConflict
		}
		update := tx.TransferRecord.UpdateOneID(id).SetLeaseOwner("").ClearLeaseUntil().SetCheckedAt(s.instant())
		if remoteErr != nil {
			_, e = update.SetIssue("provider_unavailable").Save(ctx)
			return e
		}
		data, e := document(observed)
		if e != nil {
			return e
		}
		state, issue, attemptID, e := s.observeTransfer(ctx, tx, row, observed)
		if e != nil {
			return e
		}
		if _, e = tx.TransferObservation.Create().SetRecordID(id).SetAttemptID(attemptID).SetVersion(row.Version).SetData(data).SetCreatedAt(s.instant()).Save(ctx); e != nil {
			return e
		}
		_, e = update.SetData(data).SetAttemptID(attemptID).SetState(state).SetIssue(issue).Save(ctx)
		return e
	})
	return errors.Join(remoteErr, saveErr)
}
func outgoingMatches(row *ent.MoneyTransfer, attempt *ent.TransferAttempt, p nowpayments.Payout) bool {
	expected, err := nowpayments.Decimal(row.Amount).Rational()
	amount, e := p.Amount.Rational()
	recipient, re := decode[nowpayments.Recipient](attempt.Recipient)
	return err == nil && e == nil && re == nil && expected.Cmp(amount) == 0 && p.Currency == row.Currency && p.Recipient == recipient && p.AttemptID == attempt.ID && providerPattern.MatchString(p.BatchID)
}
func (s *Store) observeTransfer(ctx context.Context, tx *ent.Tx, record *ent.TransferRecord, p nowpayments.Payout) (string, string, string, error) {
	if !validID(p.AttemptID) {
		return "exception", "unknown_outgoing", "", nil
	}
	attempt, err := tx.TransferAttempt.Get(ctx, p.AttemptID)
	if ent.IsNotFound(err) {
		return "exception", "unknown_outgoing", "", nil
	}
	if err != nil {
		return "", "", "", err
	}
	row, err := tx.MoneyTransfer.Get(ctx, attempt.TransferID)
	if err != nil {
		return "", "", "", err
	}
	if attempt.Account != record.Account || row.Account != record.Account || !outgoingMatches(row, attempt, p) {
		return "exception", "outgoing_mismatch", attempt.ID, nil
	}
	if attempt.ProviderID != nil && *attempt.ProviderID != p.ID || attempt.BatchID != "" && attempt.BatchID != p.BatchID {
		return "exception", "outgoing_reference_mismatch", attempt.ID, nil
	}
	if attempt.State == "approved" {
		return "exception", "unissued_outgoing", attempt.ID, nil
	}
	if attempt.ProviderID == nil {
		attempt, err = tx.TransferAttempt.UpdateOneID(attempt.ID).SetProviderID(p.ID).SetBatchID(p.BatchID).Save(ctx)
		if err != nil {
			return "", "", "", err
		}
	}
	state, issue := "processing", ""
	switch strings.ToLower(p.Status) {
	case "new", "creating", "waiting":
		state = "awaiting_verification"
	case "processing", "sending":
	case "finished":
		state = "confirmed"
	case "failed", "rejected", "rejected_not_checked", "cancelled", "canceled":
		state = "failed"
		issue = "outgoing_failed"
	default:
		return "exception", "invalid_outgoing", attempt.ID, nil
	}
	if attempt.State == "confirmed" && state != "confirmed" {
		state = "confirmed"
		issue = "outgoing_evidence_changed"
	}
	if row.CurrentAttempt != attempt.ID {
		if state == "failed" && attempt.State == "failed" {
			return state, issue, attempt.ID, nil
		}
		if state == "confirmed" {
			if err = s.holdOutgoing(ctx, tx, row, "An earlier outgoing attempt was reported paid after retry. Financial review is required."); err != nil {
				return "", "", "", err
			}
		}
		if _, err = tx.TransferAttempt.UpdateOneID(attempt.ID).SetState(state).SetIssue("superseded_outgoing").SetCheckedAt(s.instant()).SetUpdatedAt(s.instant()).Save(ctx); err != nil {
			return "", "", "", err
		}
		return "exception", "superseded_outgoing", attempt.ID, nil
	}
	if _, err = tx.TransferAttempt.UpdateOneID(attempt.ID).SetState(state).SetIssue(issue).SetCheckedAt(s.instant()).SetUpdatedAt(s.instant()).Save(ctx); err != nil {
		return "", "", "", err
	}
	if row.State != state {
		row, err = tx.MoneyTransfer.UpdateOneID(row.ID).AddVersion(1).SetState(state).SetUpdatedAt(s.instant()).Save(ctx)
		if err != nil {
			return "", "", "", err
		}
		if err = s.transferEvent(ctx, tx, nil, row, state); err != nil {
			return "", "", "", err
		}
	}
	if issue == "outgoing_evidence_changed" {
		err = s.holdOutgoing(ctx, tx, row, "Outgoing evidence changed after confirmation. Financial review is required.")
	}
	return state, issue, attempt.ID, err
}
func (s *Store) holdOutgoing(ctx context.Context, tx *ent.Tx, row *ent.MoneyTransfer, message string) error {
	if row.Kind == "seller_payout" {
		return s.audit(ctx, tx, nil, "seller_payout_exception", row.ID)
	}
	orderRow, err := tx.Order.Get(ctx, row.OrderID)
	if err != nil {
		return err
	}
	next := orderRow.State
	if next == order.StateQueued || next == order.StateInProgress {
		next = order.StateOnHold
	}
	return s.event(ctx, tx, orderRow, next, "outgoing_exception", message)
}
