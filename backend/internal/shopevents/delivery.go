package shopevents

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopdelivery"
)

// HoldDeliveryAfterCase invalidates pending review so a resolved case cannot
// silently complete delivery. The caller keeps the order held for staff resume.
func HoldDeliveryAfterCase(ctx context.Context, tx *ent.Tx, purchase *ent.Order, now time.Time) (bool, error) {
	if purchase.Kind != order.KindShop {
		return false, nil
	}
	reservation, err := reservation(ctx, tx, purchase)
	if err != nil {
		return false, err
	}
	if reservation.State != "paid" {
		return false, ErrConflict
	}
	work, err := tx.ShopDelivery.Query().Where(shopdelivery.OrderIDEQ(purchase.ID)).Only(ctx)
	if ent.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if work.Version < 1 || work.Version >= 2147483645 || work.State == "cancelled" {
		return false, ErrConflict
	}
	_, err = tx.ShopDelivery.UpdateOne(work).AddVersion(1).SetState("held").SetProofMessageID("").SetNote("Case resolved; staff must review delivery before resuming.").SetUpdatedAt(now).Save(ctx)
	return true, err
}
func cancelDelivery(ctx context.Context, tx *ent.Tx, purchase *ent.Order, now time.Time) error {
	work, err := tx.ShopDelivery.Query().Where(shopdelivery.OrderIDEQ(purchase.ID)).Only(ctx)
	if ent.IsNotFound(err) {
		return nil
	}
	if err != nil {
		return err
	}
	if work.State == "cancelled" {
		return nil
	}
	if work.Version < 1 || work.Version >= 2147483645 {
		return ErrConflict
	}
	_, err = tx.ShopDelivery.UpdateOne(work).AddVersion(1).SetState("cancelled").SetNote("Delivery cancelled after case review.").SetUpdatedAt(now).Save(ctx)
	return err
}
