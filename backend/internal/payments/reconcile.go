package payments

import (
	"context"
	"errors"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentallocation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentattempt"
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
	var metadataErr error
	if remoteErr == nil {
		metadataErr = s.resolveNetwork(ctx, &observed)
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
			if row.AttemptID != "" {
				if _, e = tx.PaymentAttempt.Update().Where(paymentattempt.IDEQ(row.AttemptID), paymentattempt.NativeCheckoutEQ(true), paymentattempt.StateEQ("awaiting_payment")).SetIssue("provider_unavailable").ClearDepositData().Save(ctx); e != nil {
					return e
				}
			}
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
		if issue != "" && row.AttemptID != "" {
			if _, e = tx.PaymentAttempt.Update().Where(paymentattempt.IDEQ(row.AttemptID), paymentattempt.NativeCheckoutEQ(true), paymentattempt.StateEQ("awaiting_payment")).SetIssue(issue).ClearDepositData().Save(ctx); e != nil {
				return e
			}
			if attemptID == "" {
				attemptID = row.AttemptID
			}
		}
		_, e = update.SetData(data).SetState(state).SetIssue(issue).SetAttemptID(attemptID).Save(ctx)
		return e
	})
	return errors.Join(remoteErr, metadataErr, saveErr)
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
	network := strings.ToLower(p.Network)
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
	// Even a reversal must match the immutable received asset and network.
	// Preserve historical network casing while comparing the same chain.
	if existing != nil && (existing.Currency != p.PayCurrency || !strings.EqualFold(existing.Network, network)) {
		return nil, nowpayments.ErrEvidence
	}
	if existing != nil && p.Status == "refunded" {
		// Preserve the historical received amount; reversal is a separate state.
		return tx.PaymentReceipt.UpdateOneID(existing.ID).SetState("reversed").SetObservationID(observation.ID).SetUpdatedAt(s.instant()).Save(ctx)
	}
	if existing == nil {
		return tx.PaymentReceipt.Create().SetRecordID(record.ID).SetAttemptID(attempt.ID).SetOrderID(attempt.OrderID).SetUserID(attempt.UserID).SetCurrency(p.PayCurrency).SetNetwork(network).SetAmount(string(p.ActuallyPaid)).SetState(state).SetObservationID(observation.ID).SetCreatedAt(s.instant()).SetUpdatedAt(s.instant()).Save(ctx)
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
	route, routeErr := decode[Route](attempt.Route)
	if routeErr != nil {
		return "", "", "", routeErr
	}
	if route.Selection != "" && !providerSelection(attempt) {
		return "exception", "wrong_route", attempt.ID, nil
	}
	// Hosted evidence must identify this invoice and exact USD agreement before
	// binding an invoice or storing immutable asset/network receipt fields.
	if providerSelection(attempt) {
		if issue := commercialMatching(attempt, p); issue != "" {
			return "exception", issue, attempt.ID, nil
		}
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
	if providerSelection(attempt) && matching(attempt, p) != "" {
		// Preserve authenticated GET evidence and a funds hold while network
		// metadata is unavailable. Never issue a second pay link or create an
		// immutable receipt with guessed/empty network information.
		if attempt.FundsDetectedAt != nil && attempt.State != "settled" {
			if _, err = tx.PaymentAttempt.UpdateOneID(attempt.ID).SetState("exception").SetIssue("network_review").SetCheckoutURL("").Save(ctx); err != nil {
				return "", "", "", err
			}
		}
		return "exception", "network_review", attempt.ID, nil
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
	if issue != "" && state != "settled" && state != "closed" {
		state = "exception"
	}
	// A later pending observation cannot erase a settled/reversed decision.
	if attempt.State == "settled" && state != "settled" && p.Status != "refunded" {
		state = "settled"
		if issue == "" {
			issue = attempt.Issue
		}
	}
	update := tx.PaymentAttempt.UpdateOneID(attempt.ID).SetState(state).SetIssue(issue).SetUpdatedAt(s.instant()).ClearDepositData()
	if !attempt.NativeCheckout && issue == "" && state == "awaiting_payment" {
		// Recover a lost invoice response from matched authenticated evidence.
		// This is a read recovery, never another create-invoice request.
		ready := *attempt
		ready.State, ready.Issue = state, issue
		if href := hostedLink(&ready, p.InvoiceID, s.instant()); href != "" {
			update.SetCheckoutURL(href)
			if _, err = tx.OrderContract.Update().Where(ordercontract.IDEQ(attempt.ContractID), ordercontract.PaymentStateEQ(ordercontract.PaymentStateInvoicePending)).SetPaymentState(ordercontract.PaymentStateAwaitingPayment).Save(ctx); err != nil {
				return "", "", "", err
			}
		}
	}
	if attempt.NativeCheckout && issue == "" {
		deposit, e := depositView(attempt, p, s.instant())
		if e != nil {
			return "", "", "", e
		}
		if deposit == nil && state == "awaiting_payment" && attempt.FundsDetectedAt == nil {
			issue = "instructions_unavailable"
			update.SetIssue(issue)
		}
		if deposit != nil && state == "awaiting_payment" {
			data, e := document(deposit)
			if e != nil {
				return "", "", "", e
			}
			update.SetDepositData(data).SetDepositPaymentID(p.ID).SetDepositClaimed(true)
		}
	}
	_, err = update.Save(ctx)
	return state, issue, attempt.ID, err
}
func (s *Store) decision(ctx context.Context, tx *ent.Tx, attempt *ent.PaymentAttempt, receipt *ent.PaymentReceipt, p nowpayments.Payment, paid *big.Rat) (string, string, error) {
	if receipt != nil && receipt.State == "reversed" {
		allocated, err := tx.PaymentAllocation.Query().Where(paymentallocation.ReceiptIDEQ(receipt.ID)).Exist(ctx)
		if err != nil {
			return "", "", err
		}
		if !allocated && attempt.State == "settled" {
			return "settled", "", nil
		}
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
		if providerSelection(attempt) {
			// One abandoned coin choice is not the whole hosted invoice. Preserve
			// an existing funds hold or reservation until PLAYORA's local expiry.
			if attempt.FundsDetectedAt != nil {
				return attempt.State, attempt.Issue, nil
			}
			if attempt.ActiveContractID == nil {
				return "closed", attempt.Issue, nil
			}
			if attempt.ExpiresAt.After(s.instant()) {
				return "awaiting_payment", "", nil
			}
			return "closed", "local_expiry", s.retire(ctx, tx, attempt, "local_expiry")
		}
		return "closed", "provider_closed", s.retire(ctx, tx, attempt, "provider_closed")
	case "confirming", "confirmed", "sending":
		_, err := tx.OrderContract.Update().Where(ordercontract.IDEQ(attempt.ContractID), ordercontract.PaymentStateNEQ(ordercontract.PaymentStateSettled), ordercontract.PaymentStateNEQ(ordercontract.PaymentStateRetired)).SetPaymentState(ordercontract.PaymentStateFundsDetected).Save(ctx)
		return "confirming", "", err
	case "waiting":
		if attempt.FundsDetectedAt != nil {
			if providerSelection(attempt) {
				return attempt.State, attempt.Issue, nil
			}
			return "confirming", "", nil
		}
		if attempt.ActiveContractID == nil {
			return "closed", attempt.Issue, nil
		}
		if !attempt.ExpiresAt.After(s.instant()) {
			return "closed", "local_expiry", s.retire(ctx, tx, attempt, "local_expiry")
		}
		return "awaiting_payment", "", nil
	default:
		return "exception", "invalid_evidence", nil
	}
}
