// Package communication defines resource membership shared by chat and private media.
package communication

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Member preserves owner/admin access and limits shared coordination to its current assignee.
// Callers must obtain a current principal through the identity service before invoking it.
func Member(ctx context.Context, client *ent.Client, p *identity.Principal, row *ent.Conversation, admin bool) error {
	if admin {
		return identity.Require(p, "admin")
	}
	if err := identity.Require(p, "account"); err != nil {
		return err
	}
	if row.UserID == p.User.ID {
		return nil
	}
	if row.Kind != "fulfillment" || row.FulfillmentOrderID == nil || !row.BoosterShared {
		return identity.ErrForbidden
	}
	return Assigned(ctx, client, p, *row.FulfillmentOrderID, row.UserID)
}

// Assigned never treats a support-inbox assignment or a role alone as order authority.
func Assigned(ctx context.Context, client *ent.Client, p *identity.Principal, id, customerID string) error {
	if err := identity.Require(p, "booster"); err != nil {
		return err
	}
	return AssignedUser(ctx, client, p.User, id, customerID)
}

// AssignedUser rechecks reference-only notifications without inventing a signed-in session.
func AssignedUser(ctx context.Context, client *ent.Client, account *ent.User, id, customerID string) error {
	if account == nil || account.Suspended || !account.MfaEnabled || (account.Role != identity.RoleBooster && account.Role != identity.RoleAdmin && account.Role != identity.RoleOwner) {
		return identity.ErrForbidden
	}
	order, err := client.Order.Get(ctx, id)
	if err != nil {
		return err
	}
	if order.UserID != customerID {
		return identity.ErrForbidden
	}
	if order.State != "queued" && order.State != "in_progress" && order.State != "on_hold" {
		return identity.ErrForbidden
	}
	paid, err := client.OrderContract.Query().Where(ordercontract.IDEQ(order.CurrentContract), ordercontract.ActiveOrderIDEQ(id), ordercontract.UserIDEQ(customerID), ordercontract.PaymentStateEQ(ordercontract.PaymentStateSettled)).Exist(ctx)
	if err != nil {
		return err
	}
	if !paid {
		return identity.ErrForbidden
	}
	assigned, err := client.Fulfillment.Query().Where(fulfillment.OrderIDEQ(id), fulfillment.AssignedIDEQ(account.ID)).Exist(ctx)
	if err != nil {
		return err
	}
	if !assigned {
		return identity.ErrForbidden
	}
	return nil
}
