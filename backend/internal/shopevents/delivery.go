package shopevents

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopdelivery"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierpurchase"
)

// HoldDeliveryAfterCase invalidates pending review so a resolved case cannot
// silently complete delivery. The caller keeps the order held for staff resume.
func HoldDeliveryAfterCase(ctx context.Context, tx *ent.Tx, purchase *ent.Order, now time.Time, outcome string) (bool, error) {
	if purchase.Kind != order.KindShop {
		return false, nil
	}
	if supplier, err := supplierOrder(ctx, tx, purchase); err != nil {
		return false, err
	} else if supplier {
		return resumeSupplierAfterCase(ctx, tx, purchase, now, outcome)
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

// Resuming a resolved case never clears the durable create fence or fabricates
// supplier success. Existing obligations get a fresh GET; unsent paid work may
// wake normally. Partial, cancelled and evidence/cost-review states stay held.
func resumeSupplierAfterCase(ctx context.Context, tx *ent.Tx, purchase *ent.Order, now time.Time, outcome string) (bool, error) {
	work, err := tx.SupplierPurchase.Query().Where(supplierpurchase.OrderIDEQ(purchase.ID)).Only(ctx)
	if err != nil {
		return false, err
	}
	if work.Version < 1 || work.Version >= 2147483645 {
		return false, ErrConflict
	}
	safe := work.State == "awaiting_payment" || work.State == "checking" || work.State == "sending" || work.State == "unresolved" || work.State == "pending" || work.State == "completed" || work.State == "held" && work.Issue == "payment_or_case_review"
	if !safe || work.Issue != "" && work.Issue != "payment_or_case_review" && work.Issue != "create_uncertain" && work.Issue != "not_visible_yet" && work.Issue != "status_unavailable" && work.Issue != "search_unavailable" || outcome == "rework" && work.ProviderStatus == "completed" {
		return true, nil
	}
	update := tx.SupplierPurchase.UpdateOne(work).SetNextCheck(now).AddVersion(1).SetUpdatedAt(now)
	if work.PostClaimed && work.State == "completed" {
		update.SetState("held").SetIssue("payment_or_case_review")
	}
	_, err = update.Save(ctx)
	return false, err
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
