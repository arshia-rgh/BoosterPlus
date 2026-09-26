package payments

import (
	"context"
	"errors"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// InvoicePaymentProvider creates a deposit for a persisted invoice. The production
// adapter implements it; legacy hosted invoices do not acquire another deposit.
type InvoicePaymentProvider interface {
	CreateInvoicePayment(context.Context, string, string) (string, error)
}

// Deposit is a verified, time-limited customer instruction, never a receipt.
type Deposit struct {
	PaymentID  string    `json:"payment_id"`
	Address    string    `json:"address"`
	Memo       string    `json:"memo"`
	Amount     string    `json:"amount"`
	Currency   string    `json:"currency"`
	Network    string    `json:"network"`
	ExpiresAt  time.Time `json:"expires_at"`
	CheckedAt  time.Time `json:"checked_at"`
	ValidUntil time.Time `json:"valid_until"`
	QR         string    `json:"qr"`
}

func (s *Store) prepareDeposit(ctx context.Context, id string) error {
	provider, ok := s.provider.(InvoicePaymentProvider)
	if !ok || !s.enabled {
		return nil
	}
	var claimed *ent.PaymentAttempt
	err := s.fenced(ctx, func(tx *ent.Tx) error {
		row, e := tx.PaymentAttempt.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Account != s.account {
			return ErrConflict
		}
		if row.NativeCheckout && row.DepositClaimed && row.DepositPaymentID == "" && row.State == "awaiting_payment" {
			_, e = tx.PaymentAttempt.UpdateOneID(id).SetState("uncertain").SetIssue("deposit_uncertain").SetUpdatedAt(s.instant()).Save(ctx)
			return e
		}
		if !row.NativeCheckout || row.DepositClaimed || row.InvoiceID == nil || row.ActiveContractID == nil || row.State != "awaiting_payment" || row.FundsDetectedAt != nil || !row.ExpiresAt.After(s.instant()) {
			return nil
		}
		claimed, e = tx.PaymentAttempt.UpdateOneID(id).SetDepositClaimed(true).SetUpdatedAt(s.instant()).Save(ctx)
		return e
	})
	if err != nil || claimed == nil {
		return err
	}
	route, err := decode[Route](claimed.Route)
	if err != nil {
		return err
	}
	paymentID, remoteErr := provider.CreateInvoicePayment(ctx, *claimed.InvoiceID, route.Code)
	if remoteErr == nil && !providerPattern.MatchString(paymentID) {
		remoteErr = nowpayments.ErrEvidence
	}
	saveErr := s.fenced(ctx, func(tx *ent.Tx) error {
		row, e := tx.PaymentAttempt.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Account != s.account || row.InvoiceID == nil || *row.InvoiceID != *claimed.InvoiceID {
			return ErrConflict
		}
		if remoteErr != nil {
			if row.State == "awaiting_payment" && row.DepositPaymentID == "" {
				_, e = tx.PaymentAttempt.UpdateOneID(id).SetState("uncertain").SetIssue("deposit_uncertain").SetUpdatedAt(s.instant()).Save(ctx)
			}
			return e
		}
		if row.DepositPaymentID != "" && row.DepositPaymentID != paymentID {
			return ErrConflict
		}
		record, e := s.record(ctx, tx, paymentID)
		if e != nil {
			return e
		}
		if record.AttemptID != "" && record.AttemptID != id {
			return ErrConflict
		}
		if _, e = tx.PaymentRecord.UpdateOneID(record.ID).SetAttemptID(id).Save(ctx); e != nil {
			return e
		}
		if _, e = tx.PaymentAttempt.UpdateOneID(id).SetDepositPaymentID(paymentID).SetUpdatedAt(s.instant()).Save(ctx); e != nil {
			return e
		}
		return s.queueRead(ctx, tx, record)
	})
	if saveErr != nil {
		return saveErr
	}
	if remoteErr != nil && !errors.Is(remoteErr, nowpayments.ErrAmbiguous) {
		return remoteErr
	}
	return nil
}
