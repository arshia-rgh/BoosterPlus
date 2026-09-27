package payments

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountreservation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentattempt"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentreceipt"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentrecord"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resaleevents"
)

// expireAccountReservations shares the authentication/payment write fence with
// invoice claims, inventory reservations and authenticated provider observations.
// Local expiry alone never establishes that an issued invoice received no funds.
func (s *Store) expireAccountReservations(ctx context.Context) error {
	return s.fenced(ctx, func(tx *ent.Tx) error {
		rows, err := tx.AccountReservation.Query().Where(accountreservation.StateEQ("reserved"), accountreservation.ExpiresAtLTE(s.instant())).Order(ent.Asc(accountreservation.FieldUpdatedAt), ent.Asc(accountreservation.FieldID)).Limit(50).All(ctx)
		if err != nil {
			return err
		}
		for _, reservation := range rows {
			if err = s.expireAccountReservation(ctx, tx, reservation); err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *Store) expireAccountReservation(ctx context.Context, tx *ent.Tx, reservation *ent.AccountReservation) error {
	// Rotate held rows to keep one unresolved invoice from starving later pages.
	if _, err := tx.AccountReservation.UpdateOneID(reservation.ID).SetUpdatedAt(s.instant()).Save(ctx); err != nil {
		return err
	}
	purchase, err := tx.Order.Get(ctx, reservation.OrderID)
	if err != nil {
		return err
	}
	contract, err := tx.OrderContract.Get(ctx, purchase.CurrentContract)
	if err != nil {
		return err
	}
	safe, err := s.inventoryReservationUnfunded(ctx, tx, purchase, contract)
	if err != nil || !safe {
		return err
	}
	if _, err = tx.OrderContract.UpdateOneID(contract.ID).SetPaymentState(ordercontract.PaymentStateRetired).ClearActiveOrderID().SetCapacityHeld(false).Save(ctx); err != nil {
		return err
	}
	if err = resaleevents.ReleaseUnpaid(ctx, tx, purchase, s.instant()); err != nil {
		return err
	}
	if purchase.State == order.StateAwaitingPayment {
		if err = s.event(ctx, tx, purchase, order.StateExpired, "account_reservation_expired", "The unpaid account reservation expired. Any later funds require financial review."); err != nil {
			return err
		}
	}
	return s.audit(ctx, tx, nil, "account_reservation_released", reservation.ID)
}

func (s *Store) inventoryAttemptUnfunded(ctx context.Context, tx *ent.Tx, attempt *ent.PaymentAttempt) (bool, error) {
	if attempt.ActiveContractID != nil || attempt.FundsDetectedAt != nil {
		return false, nil
	}
	if !attempt.PostClaimed && attempt.InvoiceID == nil {
		return true, nil
	}
	if attempt.Account != s.account || attempt.InvoiceID == nil {
		return false, nil
	}
	rows, err := tx.PaymentRecord.Query().Where(paymentrecord.AccountEQ(attempt.Account), paymentrecord.AttemptIDEQ(attempt.ID)).Limit(101).All(ctx)
	if err != nil {
		return false, err
	}
	if len(rows) == 0 || len(rows) > 100 {
		return false, nil
	}
	for _, row := range rows {
		if row.LeaseOwner != "" || row.LeaseUntil != nil || row.Issue != "provider_closed" || (row.State != "closed" && row.State != "exception") || row.CheckedAt.Before(s.instant().Add(-2*time.Minute)) {
			return false, nil
		}
		observed, e := decode[nowpayments.Payment](row.Data)
		if e != nil {
			return false, e
		}
		if observed.ID != row.PaymentID || matching(attempt, observed) != "" {
			return false, nil
		}
		switch observed.Status {
		case "expired", "failed", "cancelled", "canceled":
		default:
			return false, nil
		}
		paid, e := observed.ActuallyPaid.Rational()
		if e != nil || paid.Sign() != 0 {
			return false, e
		}
	}
	return true, nil
}

// inventoryReservationUnfunded uses persisted verified evidence, never a local timer alone.
func (s *Store) inventoryReservationUnfunded(ctx context.Context, tx *ent.Tx, purchase *ent.Order, contract *ent.OrderContract) (bool, error) {
	if contract.OrderID != purchase.ID || contract.UserID != purchase.UserID {
		return false, ErrConflict
	}
	if contract.PaymentState != ordercontract.PaymentStateUnissued && contract.PaymentState != ordercontract.PaymentStateRetired {
		return false, nil
	}
	received, err := tx.PaymentReceipt.Query().Where(paymentreceipt.OrderIDEQ(purchase.ID)).Exist(ctx)
	if err != nil || received {
		return false, err
	}
	attempts, err := tx.PaymentAttempt.Query().Where(paymentattempt.OrderIDEQ(purchase.ID)).Limit(101).All(ctx)
	if err != nil {
		return false, err
	}
	if len(attempts) > 100 {
		return false, nil
	}
	for _, attempt := range attempts {
		safe, e := s.inventoryAttemptUnfunded(ctx, tx, attempt)
		if e != nil || !safe {
			return false, e
		}
	}
	return true, nil
}
