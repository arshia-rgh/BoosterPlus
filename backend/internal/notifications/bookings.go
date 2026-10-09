package notifications

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/booking"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func (s *Store) bookingAllowed(ctx context.Context, n *ent.Notification, account *ent.User) (bool, error) {
	value, err := s.client.Booking.Get(ctx, n.MessageID)
	if ent.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if value.OrderID != n.ResourceID || value.State != booking.StateConfirmed || !value.StartsAt.After(time.Now()) {
		return false, nil
	}
	if n.Kind == "booking_customer" && value.UserID != account.ID {
		return false, nil
	}
	if n.Kind == "booking_staff" && (value.AssignedID != account.ID || !account.MfaEnabled || (account.Portal != string(identity.PortalBooster) || account.Role != identity.RoleBooster)) {
		return false, nil
	}
	customerOrder, err := s.client.Order.Query().Where(order.IDEQ(value.OrderID), order.UserIDEQ(value.UserID), order.StateIn(order.StateQueued, order.StateInProgress, order.StateOnHold)).Only(ctx)
	if ent.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	settled, err := s.client.OrderContract.Query().Where(ordercontract.IDEQ(customerOrder.CurrentContract), ordercontract.ActiveOrderIDEQ(customerOrder.ID), ordercontract.PaymentStateEQ(ordercontract.PaymentStateSettled)).Exist(ctx)
	if err != nil || !settled {
		return false, err
	}
	assigned, err := s.client.Fulfillment.Query().Where(fulfillment.OrderIDEQ(value.OrderID), fulfillment.AssignedIDEQ(value.AssignedID), fulfillment.ModeEQ(fulfillment.ModeTogether)).Exist(ctx)
	if err != nil || !assigned {
		return false, err
	}
	staff, err := s.client.User.Get(ctx, value.AssignedID)
	if ent.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return !staff.Suspended && staff.MfaEnabled && (staff.Portal == string(identity.PortalBooster) && staff.Role == identity.RoleBooster), nil
}

func (s *Store) staffOrderAllowed(ctx context.Context, n *ent.Notification, account *ent.User) (bool, error) {
	if !account.MfaEnabled || (account.Portal != string(identity.PortalBooster) || account.Role != identity.RoleBooster) {
		return false, nil
	}
	row, err := s.client.Order.Query().Where(order.IDEQ(n.ResourceID), order.StateIn(order.StateQueued, order.StateInProgress, order.StateOnHold)).Only(ctx)
	if ent.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	assigned, err := s.client.Fulfillment.Query().Where(fulfillment.OrderIDEQ(row.ID), fulfillment.AssignedIDEQ(account.ID)).Exist(ctx)
	if err != nil || !assigned {
		return false, err
	}
	return s.client.OrderContract.Query().Where(ordercontract.IDEQ(row.CurrentContract), ordercontract.ActiveOrderIDEQ(row.ID), ordercontract.PaymentStateEQ(ordercontract.PaymentStateSettled)).Exist(ctx)
}
