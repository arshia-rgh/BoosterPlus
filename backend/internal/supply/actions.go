package supply

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierpurchase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

type pendingActionProvider interface {
	PendingAction(context.Context, string, string) (suppliers.PendingAction, error)
}

// PendingAction rechecks the customer's paid order before and after network I/O.
// Provider URLs are returned only to its owner, never staff previews or events.
func (s *Purchaser) PendingAction(ctx context.Context, auth *identity.Service, p *identity.Principal, orderID string) (suppliers.PendingAction, error) {
	if !validID(orderID) {
		return suppliers.PendingAction{}, ErrInvalid
	}
	var row *ent.SupplierPurchase
	check := func(tx *ent.Tx, current *identity.Principal) error {
		if current.User.Role != identity.RoleCustomer || current.Session.Portal != string(identity.PortalCustomer) {
			return identity.ErrForbidden
		}
		var err error
		row, err = tx.SupplierPurchase.Query().Where(supplierpurchase.OrderIDEQ(orderID), supplierpurchase.UserIDEQ(current.User.ID)).Only(ctx)
		if err != nil {
			return err
		}
		if !row.PostClaimed || row.ProviderID == nil || row.State != "pending" || row.Issue != "" || row.Product == nil {
			return ErrConflict
		}
		if err = paid(ctx, tx, row); err != nil {
			return err
		}
		return s.purchaseConnection(ctx, tx, row, false)
	}
	if err := auth.AuthorizedTransaction(ctx, p, "account", true, check); err != nil {
		return suppliers.PendingAction{}, err
	}
	provider := s.providers[suppliers.Connection(row.ConnectionID)]
	actions, ok := provider.(pendingActionProvider)
	if !ok {
		return suppliers.PendingAction{}, ErrUnavailable
	}
	orderIDAtRead, version := *row.ProviderID, row.Version
	observed, err := provider.GetOrder(ctx, orderIDAtRead)
	if err != nil {
		return suppliers.PendingAction{}, err
	}
	input, err := request(row)
	if err != nil || !suppliers.Matches(observed, input) || observed.ID != orderIDAtRead || observed.Status != "pending" {
		return suppliers.PendingAction{}, ErrConflict
	}
	action, err := actions.PendingAction(ctx, orderIDAtRead, row.Product.ID)
	if err != nil {
		return suppliers.PendingAction{}, ErrUnavailable
	}
	if err = auth.AuthorizedTransaction(ctx, p, "account", true, func(tx *ent.Tx, current *identity.Principal) error {
		if e := check(tx, current); e != nil {
			return e
		}
		if row.Version != version || *row.ProviderID != orderIDAtRead {
			return ErrConflict
		}
		return audit(ctx, tx, current.User.ID, row.ID, "action_viewed", row.Version, s.now())
	}); err != nil {
		return suppliers.PendingAction{}, err
	}
	return action, nil
}
