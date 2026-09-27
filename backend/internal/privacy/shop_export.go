package privacy

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shoprecipient"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopreservation"
)

// exportShopOrders enriches the existing recent-authenticated order export with
// the customer's delivery data. Both parent and child ownership are checked.
// Two bounded batch queries avoid a recipient lookup per exported order.
func exportShopOrders(ctx context.Context, tx *ent.Tx, userID string, rows []*ent.Order, records []map[string]any) error {
	ids := make([]string, 0, len(rows))
	byID := map[string]map[string]any{}
	for i, row := range rows {
		if row.Kind == order.KindShop {
			ids = append(ids, row.ID)
			byID[row.ID] = records[i]
		}
	}
	if len(ids) == 0 {
		return nil
	}
	recipients, err := tx.ShopRecipient.Query().Where(shoprecipient.UserIDEQ(userID), shoprecipient.OrderIDIn(ids...)).Limit(101).All(ctx)
	if err != nil {
		return err
	}
	for _, row := range recipients {
		values := row.RecipientValues
		// An erased row must never disclose residual values from inconsistent legacy data.
		if row.ErasedAt != nil {
			values = map[string]string{}
		}
		byID[row.OrderID]["shop_recipient"] = map[string]any{"values": values, "version": row.Version, "erased_at": row.ErasedAt, "created_at": row.CreatedAt}
	}
	reservations, err := tx.ShopReservation.Query().Where(shopreservation.UserIDEQ(userID), shopreservation.OrderIDIn(ids...)).Limit(101).All(ctx)
	if err != nil {
		return err
	}
	for _, row := range reservations {
		byID[row.OrderID]["shop_reservation"] = map[string]any{"product_id": row.ProductID, "release_id": row.ReleaseID, "variant_key": row.VariantKey, "quantity": row.Quantity, "state": row.State, "expires_at": row.ExpiresAt, "created_at": row.CreatedAt, "updated_at": row.UpdatedAt}
	}
	return nil
}
