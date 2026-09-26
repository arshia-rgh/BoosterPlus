package payments

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentattempt"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// InvoiceHandler claims the write exactly once. A claimed job is never retried at the provider.
func (s *Store) InvoiceHandler() jobs.Handler {
	return func(ctx context.Context, job jobs.Job) error {
		var ref struct {
			AttemptID string `json:"attempt_id"`
		}
		if err := json.Unmarshal(job.Payload, &ref); err != nil || !validID(ref.AttemptID) {
			return ErrInvalid
		}
		return s.issue(ctx, ref.AttemptID)
	}
}
func (s *Store) issue(ctx context.Context, id string) error {
	if s.provider == nil || !s.enabled {
		return ErrUnavailable
	}
	var claimed *ent.PaymentAttempt
	err := s.fenced(ctx, func(tx *ent.Tx) error {
		row, e := tx.PaymentAttempt.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Account != s.account {
			return ErrUnavailable
		}
		if row.State == "creating" {
			_, e = tx.PaymentAttempt.UpdateOneID(id).SetState("uncertain").SetIssue("invoice_uncertain").SetUpdatedAt(s.instant()).Save(ctx)
			return e
		}
		if row.State != "new" {
			return nil
		}
		if !row.ExpiresAt.After(s.instant()) {
			return s.retire(ctx, tx, row, "local_expiry")
		}
		claimed, e = tx.PaymentAttempt.UpdateOneID(id).SetState("creating").SetPostClaimed(true).SetUpdatedAt(s.instant()).Save(ctx)
		return e
	})
	if err != nil {
		return err
	}
	if claimed == nil {
		return s.prepareDeposit(ctx, id)
	}
	policy, err := decode[Policy](claimed.Policy)
	if err != nil {
		return err
	}
	route, err := decode[Route](claimed.Route)
	if err != nil {
		return err
	}
	invoice, remoteErr := s.provider.CreateInvoice(ctx, nowpayments.InvoiceRequest{OrderID: claimed.OrderID, AttemptID: id, AmountMinor: claimed.AmountMinor, Currency: claimed.Currency, PayCurrency: route.Code, FixedRate: policy.RateMode == "fixed", FeePaidByUser: policy.FeeMode == "customer"})
	// The attempt remains claimed if persistence fails. Reconciliation, not a second POST, repairs it.
	saveErr := s.fenced(ctx, func(tx *ent.Tx) error {
		row, e := tx.PaymentAttempt.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Account != s.account {
			return ErrConflict
		}
		if remoteErr != nil {
			if row.InvoiceID == nil && row.State == "creating" {
				_, e = tx.PaymentAttempt.UpdateOneID(id).SetState("uncertain").SetIssue("invoice_uncertain").SetUpdatedAt(s.instant()).Save(ctx)
			}
			return e
		}
		if row.InvoiceID != nil {
			if *row.InvoiceID != invoice.ID {
				return ErrConflict
			}
			return nil
		}
		if row.State != "creating" && row.State != "uncertain" {
			return nil
		}
		checkoutURL := invoice.URL
		if row.NativeCheckout {
			checkoutURL = ""
		}
		_, e = tx.PaymentAttempt.UpdateOneID(id).SetInvoiceID(invoice.ID).SetCheckoutURL(checkoutURL).SetState("awaiting_payment").SetIssue("").SetUpdatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		_, e = tx.OrderContract.Update().Where(ordercontract.IDEQ(row.ContractID), ordercontract.PaymentStateEQ(ordercontract.PaymentStateInvoicePending)).SetPaymentState(ordercontract.PaymentStateAwaitingPayment).Save(ctx)
		return e
	})
	if saveErr != nil {
		return saveErr
	}
	// Ambiguity is a durable finance exception. A queue retry cannot issue another invoice.
	if remoteErr != nil && !errors.Is(remoteErr, nowpayments.ErrAmbiguous) {
		return remoteErr
	}
	return s.prepareDeposit(ctx, id)
}
func (s *Store) expire(ctx context.Context) error {
	return s.fenced(ctx, func(tx *ent.Tx) error {
		rows, err := tx.PaymentAttempt.Query().Where(paymentattempt.AccountEQ(s.account), paymentattempt.ExpiresAtLTE(s.instant()), paymentattempt.ActiveContractIDNotNil(), paymentattempt.FundsDetectedAtIsNil(), paymentattempt.StateNEQ("settled")).Order(ent.Asc(paymentattempt.FieldExpiresAt)).Limit(50).All(ctx)
		if err != nil {
			return err
		}
		for _, row := range rows {
			if err = s.retire(ctx, tx, row, "local_expiry"); err != nil {
				return err
			}
		}
		return nil
	})
}
