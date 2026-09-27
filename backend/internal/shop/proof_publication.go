package shop

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopdelivery"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// AuthorizeProofPublication validates an order-conversation proof within the
// caller's recent-factor staff transaction. Publishing evidence does not submit
// or complete delivery; those remain explicit versioned actions.
func AuthorizeProofPublication(ctx context.Context, tx *ent.Tx, current *identity.Principal, thread *ent.Conversation) error {
	if err := identity.Require(current, "admin"); err != nil {
		return err
	}
	if thread.Kind != conversation.KindOrder || thread.OrderID == nil {
		return ErrConflict
	}
	row, err := shopOrder(ctx, tx, current, *thread.OrderID, true)
	if err != nil {
		return err
	}
	if row.UserID != thread.UserID || row.State != order.StateInProgress {
		return ErrConflict
	}
	purchase, err := purchaseSnapshot(row)
	if err != nil {
		return err
	}
	if err = paidShop(ctx, tx, row, purchase); err != nil {
		return err
	}
	work, err := tx.ShopDelivery.Query().Where(shopdelivery.OrderIDEQ(row.ID), shopdelivery.AssignedIDEQ(current.User.ID), shopdelivery.StateEQ("processing")).Only(ctx)
	if err != nil {
		return err
	}
	if !validVersion(work.Version) {
		return ErrConflict
	}
	blocked, err := tx.ServiceCase.Query().Where(servicecase.ActiveOrderIDEQ(row.ID)).Exist(ctx)
	if err != nil {
		return err
	}
	if blocked {
		return ErrConflict
	}
	return deliveryRecipientReady(ctx, tx, row, purchase)
}
