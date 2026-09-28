package shop

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopdelivery"
)

// CompletedReviewAllowed requires accepted product consent and reviewed delivery.
// The review service separately rechecks the current confirmed financial evidence.
func CompletedReviewAllowed(ctx context.Context, c *ent.Client, row *ent.Order) (bool, error) {
	purchase, err := purchaseSnapshot(row)
	if err != nil {
		return false, err
	}
	if !purchase.Product.Policy.ReviewEnabled {
		return false, nil
	}
	return c.ShopDelivery.Query().Where(shopdelivery.OrderIDEQ(row.ID), shopdelivery.StateEQ("completed"), shopdelivery.ProofMessageIDNEQ("")).Exist(ctx)
}
