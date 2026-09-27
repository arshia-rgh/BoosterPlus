// Package shopevents maintains quantity commitments inside order/payment transactions.
package shopevents

import (
	"context"
	"errors"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopreservation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopstock"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/availabilityevents"
)

// ErrConflict leaves paid exceptions for explicit financial review instead of overselling.
var ErrConflict = errors.New("shop inventory commitment changed")

func reservation(ctx context.Context, tx *ent.Tx, purchase *ent.Order) (*ent.ShopReservation, error) {
	row, err := tx.ShopReservation.Query().Where(shopreservation.OrderIDEQ(purchase.ID)).Only(ctx)
	if ent.IsNotFound(err) {
		return nil, ErrConflict
	}
	if err != nil {
		return nil, err
	}
	if row.ProductID != purchase.ShopProductID || row.UserID != purchase.UserID || row.VariantKey != purchase.VariantKey || row.Quantity < 1 || row.Quantity > 100 || row.Version < 1 || row.Version >= 2147483645 {
		return nil, ErrConflict
	}
	return row, nil
}
func stock(ctx context.Context, tx *ent.Tx, row *ent.ShopReservation) (*ent.ShopStock, error) {
	value, err := tx.ShopStock.Query().Where(shopstock.ProductIDEQ(row.ProductID), shopstock.VariantKeyEQ(row.VariantKey)).Only(ctx)
	if ent.IsNotFound(err) {
		return nil, ErrConflict
	}
	if err != nil {
		return nil, err
	}
	if value.Version < 1 || value.Version >= 2147483645 || value.Total < 0 || value.Total > 1000000000 || value.Reserved < 0 || value.Committed < 0 || value.Reserved > value.Total || value.Committed > value.Total-value.Reserved {
		return nil, ErrConflict
	}
	return value, nil
}

// Allocate moves existing reserved units into paid commitments exactly once.
// Call only after authenticated provider evidence and contract ownership checks.
// Publication changes do not rewrite a previously accepted reservation.
func Allocate(ctx context.Context, tx *ent.Tx, purchase *ent.Order, now time.Time) error {
	if purchase.Kind != order.KindShop {
		return nil
	}
	row, err := reservation(ctx, tx, purchase)
	if err != nil {
		return err
	}
	if row.State == "paid" {
		return nil
	}
	if row.State != "reserved" {
		return ErrConflict
	}
	current, err := stock(ctx, tx, row)
	if err != nil {
		return err
	}
	if current.Reserved < row.Quantity {
		return ErrConflict
	}
	if _, err = tx.ShopStock.UpdateOne(current).AddVersion(1).AddReserved(-row.Quantity).AddCommitted(row.Quantity).SetUpdatedAt(now).Save(ctx); err != nil {
		return err
	}
	if _, err = tx.ShopReservation.UpdateOne(row).SetState("paid").AddVersion(1).SetUpdatedAt(now).Save(ctx); err != nil {
		return err
	}
	return availabilityevents.Changed(ctx, tx, purchase.GameID)
}

// ReleaseUnpaid requires the caller's proof that no invoice exists or all issued
// attempts are terminal and unfunded. A local timer alone is insufficient proof.
func ReleaseUnpaid(ctx context.Context, tx *ent.Tx, purchase *ent.Order, now time.Time) error {
	if purchase.Kind != order.KindShop {
		return nil
	}
	row, err := reservation(ctx, tx, purchase)
	if err != nil {
		return err
	}
	if row.State == "released" {
		return nil
	}
	if row.State != "reserved" {
		return ErrConflict
	}
	current, err := stock(ctx, tx, row)
	if err != nil {
		return err
	}
	if current.Reserved < row.Quantity {
		return ErrConflict
	}
	if _, err = tx.ShopStock.UpdateOne(current).AddVersion(1).AddReserved(-row.Quantity).SetUpdatedAt(now).Save(ctx); err != nil {
		return err
	}
	if _, err = tx.ShopReservation.UpdateOne(row).SetState("released").AddVersion(1).SetUpdatedAt(now).Save(ctx); err != nil {
		return err
	}
	return availabilityevents.Changed(ctx, tx, purchase.GameID)
}

// Checkout extends only a current, unexpired reservation to the accepted invoice deadline.
func Checkout(ctx context.Context, tx *ent.Tx, purchase *ent.Order, deadline, now time.Time) error {
	if purchase.Kind != order.KindShop {
		return nil
	}
	row, err := reservation(ctx, tx, purchase)
	if err != nil {
		return err
	}
	if row.State != "reserved" || !row.ExpiresAt.After(now) || !deadline.After(now) {
		return ErrConflict
	}
	if _, err = tx.ShopReservation.UpdateOne(row).SetExpiresAt(deadline).AddVersion(1).SetUpdatedAt(now).Save(ctx); err != nil {
		return err
	}
	return nil
}

// CancelPaid retires a paid obligation without automatically returning its units
// to availability. Any real restock requires a separate reviewed capacity change.
func CancelPaid(ctx context.Context, tx *ent.Tx, purchase *ent.Order, now time.Time) error {
	if purchase.Kind != order.KindShop {
		return nil
	}
	row, err := reservation(ctx, tx, purchase)
	if err != nil {
		return err
	}
	if row.State == "cancelled" || row.State == "released" {
		return cancelDelivery(ctx, tx, purchase, now)
	}
	if row.State != "paid" {
		return ErrConflict
	}
	_, err = tx.ShopReservation.UpdateOne(row).SetState("cancelled").AddVersion(1).SetUpdatedAt(now).Save(ctx)
	if err != nil {
		return err
	}
	return cancelDelivery(ctx, tx, purchase, now)
}
