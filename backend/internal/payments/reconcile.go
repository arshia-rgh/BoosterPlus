package payments

import (
	"context"
	"errors"
	"math/big"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentreceipt"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// Reconcile reads the authenticated provider outside the SQL transaction, then
// applies that observation only if its unique lease still owns the record.
func (s *Store) Reconcile(ctx context.Context, id string) error {
	if s.provider == nil {
		return ErrUnavailable
	}
	owner := uuid.NewString()
	var claimed *ent.PaymentRecord
	err := s.fenced(ctx, func(tx *ent.Tx) error {
		row, e := tx.PaymentRecord.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Account != s.account {
			return ErrUnavailable
		}
		if row.LeaseUntil != nil && row.LeaseUntil.After(s.instant()) {
			return ErrConflict
		}
		if row.Version >= maxVersion {
			return ErrConflict
		}
		claimed, e = tx.PaymentRecord.UpdateOneID(id).AddVersion(1).SetLeaseOwner(owner).SetLeaseUntil(s.instant().Add(time.Minute)).Save(ctx)
		return e
	})
	if err != nil {
		return err
	}
	observed, remoteErr := s.provider.GetPayment(ctx, claimed.PaymentID)
	if remoteErr == nil && observed.ID != claimed.PaymentID {
		remoteErr = nowpayments.ErrEvidence
	}
	saveErr := s.fenced(ctx, func(tx *ent.Tx) error {
		row, e := tx.PaymentRecord.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.LeaseOwner != owner || row.Version != claimed.Version || row.LeaseUntil == nil || !row.LeaseUntil.After(s.instant()) {
			return ErrConflict
		}
		update := tx.PaymentRecord.UpdateOneID(id).SetLeaseOwner("").ClearLeaseUntil().SetCheckedAt(s.instant())
		if remoteErr != nil {
			_, e = update.SetIssue("provider_unavailable").Save(ctx)
			return e
		}
		data, e := document(observed)
		if e != nil {
			return e
		}
		observation, e := tx.PaymentObservation.Create().SetRecordID(id).SetVersion(row.Version).SetData(data).SetCreatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		state, issue, attemptID, e := s.observe(ctx, tx, row, observation, observed)
		if e != nil {
			return e
		}
		_, e = update.SetData(data).SetState(state).SetIssue(issue).SetAttemptID(attemptID).Save(ctx)
		return e
	})
	return errors.Join(remoteErr, saveErr)
}
func (s *Store) receipt(ctx context.Context, tx *ent.Tx, record *ent.PaymentRecord, observation *ent.PaymentObservation, attempt *ent.PaymentAttempt, p nowpayments.Payment) (*ent.PaymentReceipt, error) {
	amount, err := p.ActuallyPaid.Rational()
	if err != nil {
		return nil, err
	}

	state := "detected"
	if p.Status == "finished" || p.Status == "partially_paid" {
		state = "confirmed"
	}
	if p.Status == "refunded" {
		state = "reversed"
	}
	network := p.Network
	route, err := decode[Route](attempt.Route)
	if err != nil {
		return nil, err
	}
	if network == "" && p.PayCurrency == route.Code {
		network = route.Network
	}
	existing, err := tx.PaymentReceipt.Query().Where(paymentreceipt.RecordIDEQ(record.ID)).Only(ctx)
	if err != nil && !ent.IsNotFound(err) {
		return nil, err
	}
	if existing == nil && amount.Sign() == 0 {
		return nil, nil
	}
	if existing != nil && p.Status == "refunded" {
		// Preserve the historical received amount; reversal is a separate state.
		return tx.PaymentReceipt.UpdateOneID(existing.ID).SetState("reversed").SetObservationID(observation.ID).SetUpdatedAt(s.instant()).Save(ctx)
	}
	if existing == nil {
		return tx.PaymentReceipt.Create().SetRecordID(record.ID).SetAttemptID(attempt.ID).SetOrderID(attempt.OrderID).SetUserID(attempt.UserID).SetCurrency(p.PayCurrency).SetNetwork(network).SetAmount(string(p.ActuallyPaid)).SetState(state).SetObservationID(observation.ID).SetCreatedAt(s.instant()).SetUpdatedAt(s.instant()).Save(ctx)
	}
	if existing.Currency != p.PayCurrency || existing.Network != network {
		return nil, nowpayments.ErrEvidence
	}
	previous, err := nowpayments.Decimal(existing.Amount).Rational()
	if err != nil {
		return nil, err
	}
	if amount.Cmp(previous) < 0 && p.Status != "refunded" {
		return nil, nowpayments.ErrEvidence
	}
	// Reordered pre-confirmation responses cannot downgrade a confirmed receipt.
	if existing.State == "reversed" {
		state = "reversed"
	} else if existing.State == "confirmed" && state == "detected" {
		state = "confirmed"
	}
	return tx.PaymentReceipt.UpdateOneID(existing.ID).SetAmount(string(p.ActuallyPaid)).SetState(state).SetObservationID(observation.ID).SetUpdatedAt(s.instant()).Save(ctx)
}
func (s *Store) observe(ctx context.Context, tx *ent.Tx, record *ent.PaymentRecord, observation *ent.PaymentObservation, p nowpayments.Payment) (string, string, string, error) {
	if !validID(p.AttemptID) {
		return "exception", "unknown_attempt", "", nil
	}
	attempt, err := tx.PaymentAttempt.Get(ctx, p.AttemptID)
	if ent.IsNotFound(err) {
		return "exception", "unknown_attempt", "", nil
	}
	if err != nil {
		return "", "", "", err
	}
	if attempt.Account != record.Account {
		return "exception", "account_mismatch", "", nil
	}
	if attempt.InvoiceID != nil && *attempt.InvoiceID != p.InvoiceID {
		return "exception", "invoice_mismatch", "", nil
	}
	if attempt.InvoiceID == nil {
		attempt, err = tx.PaymentAttempt.UpdateOneID(attempt.ID).SetPostClaimed(true).SetInvoiceID(p.InvoiceID).Save(ctx)
		if err != nil {
			return "", "", "", err
		}
	}
	paid, err := p.ActuallyPaid.Rational()
	if err != nil {
		return "", "", "", err
	}
	if attempt.FundsDetectedAt == nil && (paid.Sign() > 0 || p.Status == "confirming" || p.Status == "confirmed" || p.Status == "sending") {
		attempt, err = tx.PaymentAttempt.UpdateOneID(attempt.ID).SetFundsDetectedAt(s.instant()).Save(ctx)
		if err != nil {
			return "", "", "", err
		}
	}
	receipt, err := s.receipt(ctx, tx, record, observation, attempt, p)
	if errors.Is(err, nowpayments.ErrEvidence) {
		return "exception", "evidence_conflict", attempt.ID, nil
	}
	if err != nil {
		return "", "", "", err
	}
	state, issue := p.Status, matching(attempt, p)
	if issue == "" {
		state, issue, err = s.decision(ctx, tx, attempt, receipt, p, paid)
		if err != nil {
			return "", "", "", err
		}
	}
	if issue != "" && state != "settled" {
		state = "exception"
	}
	// A later pending observation cannot erase a settled/reversed decision.
	if attempt.State == "settled" && state != "settled" && p.Status != "refunded" {
		state = "settled"
		if issue == "" {
			issue = attempt.Issue
		}
	}
	_, err = tx.PaymentAttempt.UpdateOneID(attempt.ID).SetState(state).SetIssue(issue).SetUpdatedAt(s.instant()).Save(ctx)
	return state, issue, attempt.ID, err
}
func (s *Store) decision(ctx context.Context, tx *ent.Tx, attempt *ent.PaymentAttempt, receipt *ent.PaymentReceipt, p nowpayments.Payment, paid *big.Rat) (string, string, error) {
	if receipt != nil && receipt.State == "reversed" {
		return "exception", "payment_reversed", s.reverse(ctx, tx, attempt, receipt)
	}
	switch p.Status {
	case "finished":
		expected, err := p.PayAmount.Rational()
		if err != nil {
			return "", "", err
		}
		if receipt == nil || paid.Cmp(expected) < 0 {
			return "exception", "underpaid", nil
		}
		issue, err := s.allocate(ctx, tx, attempt, receipt, p)
		if err != nil || issue != "" {
			return "exception", issue, err
		}
		if paid.Cmp(expected) > 0 {
			return "settled", "overpaid", nil
		}
		return "settled", "", nil
	case "partially_paid":
		return "exception", "underpaid", nil
	case "refunded":
		return "exception", "payment_reversed", nil
	case "expired", "failed", "cancelled", "canceled":
		if paid.Sign() > 0 {
			return "exception", "funds_review", nil
		}
		return "closed", "provider_closed", s.retire(ctx, tx, attempt, "provider_closed")
	case "confirming", "confirmed", "sending":
		_, err := tx.OrderContract.Update().Where(ordercontract.IDEQ(attempt.ContractID), ordercontract.PaymentStateNEQ(ordercontract.PaymentStateSettled), ordercontract.PaymentStateNEQ(ordercontract.PaymentStateRetired)).SetPaymentState(ordercontract.PaymentStateFundsDetected).Save(ctx)
		return "confirming", "", err
	case "waiting":
		return "awaiting_payment", "", nil
	default:
		return "exception", "invalid_evidence", nil
	}
}
