package payments

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopreservation"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/shopevents"
)

// expireShopReservations releases only proven-unfunded inventory under the same
// transaction fence used by checkout and authenticated provider observations.
func (s *Store) expireShopReservations(ctx context.Context) error {
	return s.fenced(ctx, func(tx *ent.Tx) error {
		rows, err := tx.ShopReservation.Query().Where(shopreservation.StateEQ("reserved"), shopreservation.ExpiresAtLTE(s.instant())).Order(ent.Asc(shopreservation.FieldUpdatedAt), ent.Asc(shopreservation.FieldID)).Limit(50).All(ctx)
		if err != nil {
			return err
		}
		for _, row := range rows {
			if err = s.expireShopReservation(ctx, tx, row); err != nil {
				return err
			}
		}
		return nil
	})
}
func (s *Store) expireShopReservation(ctx context.Context, tx *ent.Tx, reservation *ent.ShopReservation) error {
	// Rotate uncertain invoices so they cannot starve later eligible rows.
	if _, err := tx.ShopReservation.UpdateOne(reservation).SetUpdatedAt(s.instant()).Save(ctx); err != nil {
		return err
	}
	purchase, err := tx.Order.Get(ctx, reservation.OrderID)
	if err != nil {
		return err
	}
	if purchase.Kind != order.KindShop || purchase.UserID != reservation.UserID {
		return ErrConflict
	}
	contract, err := tx.OrderContract.Get(ctx, purchase.CurrentContract)
	if err != nil {
		return err
	}
	safe, err := s.inventoryReservationUnfunded(ctx, tx, purchase, contract)
	if err != nil || !safe {
		return err
	}
	if _, err = tx.OrderContract.UpdateOne(contract).SetPaymentState(ordercontract.PaymentStateRetired).ClearActiveOrderID().SetCapacityHeld(false).Save(ctx); err != nil {
		return err
	}
	if err = shopevents.ReleaseUnpaid(ctx, tx, purchase, s.instant()); err != nil {
		return err
	}
	if purchase.State == order.StateAwaitingPayment {
		if err = s.event(ctx, tx, purchase, order.StateExpired, "shop_reservation_expired", "The unpaid shop reservation expired. Any later funds require financial review."); err != nil {
			return err
		}
	}
	return s.audit(ctx, tx, nil, "shop_reservation_released", reservation.ID)
}
