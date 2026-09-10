package notifications

import (
	"context"
	"errors"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/communication"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func (s *Store) coordinationAllowed(ctx context.Context, n *ent.Notification, account *ent.User) (bool, error) {
	row, err := s.client.Conversation.Get(ctx, n.ResourceID)
	if ent.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if row.Kind != "fulfillment" || row.FulfillmentOrderID == nil || !row.BoosterShared {
		return false, nil
	}
	err = communication.AssignedUser(ctx, s.client, account, *row.FulfillmentOrderID, row.UserID)
	if errors.Is(err, identity.ErrForbidden) || ent.IsNotFound(err) {
		return false, nil
	}
	return err == nil, err
}
