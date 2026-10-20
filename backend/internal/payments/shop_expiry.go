package payments

import (
	"context"
	"time"

	"entgo.io/ent/dialect/sql"
	"entgo.io/ent/dialect/sql/sqljson"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopreservation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierpurchase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
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
		return s.expireSupplierCheckouts(ctx, tx)
	})
}

// Supplier checkouts have no manual stock reservation. Only proven-unfunded,
// unsubmitted purchases may expire; a timer cannot resolve a claimed POST.
func (s *Store) expireSupplierCheckouts(ctx context.Context, tx *ent.Tx) error {
	rows, err := tx.SupplierPurchase.Query().
		Where(supplierpurchase.PostClaimedEQ(false), supplierpurchase.StateEQ("awaiting_payment")).
		Where(func(selector *sql.Selector) {
			purchase := sql.Table(order.Table).As("supplier_expiry_order")
			contract := sql.Table(ordercontract.Table).As("supplier_expiry_contract")
			selector.Join(purchase).On(selector.C(supplierpurchase.FieldOrderID), purchase.C(order.FieldID)).
				Join(contract).On(selector.C(supplierpurchase.FieldContractID), contract.C(ordercontract.FieldID)).
				Where(sql.And(
					sql.ColumnsEQ(purchase.C(order.FieldCurrentContract), contract.C(ordercontract.FieldID)),
					sql.EQ(purchase.C(order.FieldState), string(order.StateAwaitingPayment)),
					sql.In(contract.C(ordercontract.FieldPaymentState), string(ordercontract.PaymentStateUnissued), string(ordercontract.PaymentStateRetired)),
					// Accepted deadlines are canonical UTC strings. A seconds-only
					// bound may include the current fractional second; the parsed
					// timestamp is rechecked below before any retirement.
					sqljson.ValueLTE(contract.C(ordercontract.FieldData), s.instant().UTC().Format(time.RFC3339), sqljson.Path("expires_at")),
				))
		}).
		Order(ent.Asc(supplierpurchase.FieldUpdatedAt), ent.Asc(supplierpurchase.FieldID)).Limit(50).All(ctx)
	if err != nil {
		return err
	}
	for _, row := range rows {
		if err = s.expireSupplierCheckout(ctx, tx, row); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) expireSupplierCheckout(ctx context.Context, tx *ent.Tx, supplier *ent.SupplierPurchase) error {
	// Rotate any inconclusive historical invoice so later safe candidates run.
	if _, err := tx.SupplierPurchase.UpdateOne(supplier).SetUpdatedAt(s.instant()).Save(ctx); err != nil {
		return err
	}
	purchase, err := tx.Order.Get(ctx, supplier.OrderID)
	if err != nil {
		return err
	}
	if supplier.PostClaimed || supplier.State != "awaiting_payment" || supplier.Version < 1 || supplier.Version >= maxVersion-1 || purchase.Kind != order.KindShop || purchase.State != order.StateAwaitingPayment || purchase.UserID != supplier.UserID || purchase.CurrentContract != supplier.ContractID {
		return ErrConflict
	}
	contract, err := tx.OrderContract.Get(ctx, supplier.ContractID)
	if err != nil {
		return err
	}
	commercial, err := decode[orders.Commercial](contract.Data)
	if err != nil {
		return err
	}
	if commercial.ExpiresAt.IsZero() || commercial.ExpiresAt.After(s.instant()) {
		return nil
	}
	safe, err := s.inventoryReservationUnfunded(ctx, tx, purchase, contract)
	if err != nil || !safe {
		return err
	}
	if _, err = tx.OrderContract.UpdateOne(contract).SetPaymentState(ordercontract.PaymentStateRetired).ClearActiveOrderID().SetCapacityHeld(false).Save(ctx); err != nil {
		return err
	}
	if _, err = tx.SupplierPurchase.UpdateOne(supplier).SetState("cancelled").SetIssue("checkout_expired").AddVersion(1).SetUpdatedAt(s.instant()).Save(ctx); err != nil {
		return err
	}
	if err = s.event(ctx, tx, purchase, order.StateExpired, "supplier_checkout_expired", "The unpaid shop checkout expired. Start a new order for a current price. Any later funds require financial review."); err != nil {
		return err
	}
	return s.audit(ctx, tx, nil, "supplier_checkout_expired", supplier.ID)
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
