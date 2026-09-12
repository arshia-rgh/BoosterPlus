// Package resaleevents enforces unique inventory within order and payment transactions.
package resaleevents

import (
	"context"
	"errors"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountreservation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
)

// ErrConflict prevents a retired or different reservation from allocating the same stock.
var ErrConflict = errors.New("account reservation changed")

// Allocate binds verified settlement to the one still-current unique reservation.
func Allocate(ctx context.Context, tx *ent.Tx, purchase *ent.Order, now time.Time) error {
	if purchase.Kind != order.KindAccount {
		return nil
	}
	reservation, err := tx.AccountReservation.Query().Where(accountreservation.OrderIDEQ(purchase.ID), accountreservation.ActiveListingIDEQ(purchase.ListingID), accountreservation.StateEQ("reserved")).Only(ctx)
	if err != nil {
		return err
	}
	listing, err := tx.AccountListing.Get(ctx, purchase.ListingID)
	if err != nil {
		return err
	}
	if listing.State != "reserved" {
		return ErrConflict
	}
	if _, err = tx.AccountReservation.UpdateOneID(reservation.ID).SetState("paid").AddVersion(1).SetUpdatedAt(now).Save(ctx); err != nil {
		return err
	}
	_, err = tx.AccountListing.UpdateOneID(listing.ID).SetState("sold").AddVersion(1).SetUpdatedAt(now).Save(ctx)
	return err
}

// ReleaseUnpaid requires transaction-fenced proof of no invoice or a terminal unfunded provider read.
func ReleaseUnpaid(ctx context.Context, tx *ent.Tx, purchase *ent.Order, now time.Time) error {
	if purchase.Kind != order.KindAccount {
		return nil
	}
	reservation, err := tx.AccountReservation.Query().Where(accountreservation.OrderIDEQ(purchase.ID)).Only(ctx)
	if err != nil {
		return err
	}
	if reservation.ActiveListingID == nil {
		return nil
	}
	if reservation.State != "reserved" {
		return ErrConflict
	}
	if _, err = tx.AccountReservation.UpdateOneID(reservation.ID).SetState("released").ClearActiveListingID().AddVersion(1).SetUpdatedAt(now).Save(ctx); err != nil {
		return err
	}
	_, err = tx.AccountListing.UpdateOneID(reservation.ListingID).SetState("published").AddVersion(1).SetUpdatedAt(now).Save(ctx)
	return err
}

// CancelPaid removes inventory from publication; refund never automatically relists transferred access.
func CancelPaid(ctx context.Context, tx *ent.Tx, purchase *ent.Order, now time.Time) error {
	if purchase.Kind != order.KindAccount {
		return nil
	}
	reservation, err := tx.AccountReservation.Query().Where(accountreservation.OrderIDEQ(purchase.ID)).Only(ctx)
	if err != nil {
		return err
	}
	// A late payment case must never change another buyer's current inventory.
	if reservation.ActiveListingID == nil {
		return nil
	}
	if _, err = tx.AccountReservation.UpdateOneID(reservation.ID).SetState("cancelled").ClearActiveListingID().AddVersion(1).SetUpdatedAt(now).Save(ctx); err != nil {
		return err
	}
	listing, err := tx.AccountListing.UpdateOneID(reservation.ListingID).SetState("withdrawn").AddVersion(1).SetUpdatedAt(now).Save(ctx)
	if err != nil {
		return err
	}
	_, err = tx.SellerOffer.UpdateOneID(listing.OfferID).ClearControlVerifiedAt().SetControlVerifiedBy("").SetControlEvidence("").AddVersion(1).SetUpdatedAt(now).Save(ctx)
	return err
}

// Checkout extends only the still-current reservation to its exact invoice deadline.
func Checkout(ctx context.Context, tx *ent.Tx, purchase *ent.Order, deadline, now time.Time) error {
	if purchase.Kind != order.KindAccount {
		return nil
	}
	reservation, err := tx.AccountReservation.Query().Where(accountreservation.OrderIDEQ(purchase.ID), accountreservation.ActiveListingIDEQ(purchase.ListingID), accountreservation.StateEQ("reserved")).Only(ctx)
	if err != nil {
		return err
	}
	if !reservation.ExpiresAt.After(now) {
		return ErrConflict
	}
	_, err = tx.AccountReservation.UpdateOneID(reservation.ID).SetExpiresAt(deadline).AddVersion(1).SetUpdatedAt(now).Save(ctx)
	return err
}
