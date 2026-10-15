package conversations

import (
	"context"
	"encoding/json"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationform"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/selleroffer"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/communication"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func threadOrder(row *ent.Conversation) string {
	for _, id := range []*string{row.OrderID, row.FulfillmentOrderID, row.LinkedOrderID} {
		if id != nil {
			return *id
		}
	}
	return ""
}
func assignedBooster(ctx context.Context, c *ent.Client, thread *ent.Conversation) (string, error) {
	if thread.Kind != conversation.KindFulfillment || !thread.BoosterShared || thread.FulfillmentOrderID == nil {
		return "", identity.ErrForbidden
	}
	work, err := c.Fulfillment.Query().Where(fulfillment.OrderIDEQ(*thread.FulfillmentOrderID)).Only(ctx)
	if err != nil {
		return "", err
	}
	staff, err := c.User.Get(ctx, work.AssignedID)
	if err != nil {
		return "", err
	}
	if err = communication.AssignedUser(ctx, c, staff, *thread.FulfillmentOrderID, thread.UserID); err != nil {
		return "", err
	}
	return staff.ID, nil
}
func formRecipient(ctx context.Context, c *ent.Client, thread *ent.Conversation, in FormCreate) (string, string, error) {
	recipient := thread.UserID
	booster := ""
	if in.Recipient == "booster" || in.ShareWithBooster {
		id, err := assignedBooster(ctx, c, thread)
		if err != nil {
			return "", "", err
		}
		if in.Recipient == "booster" {
			recipient = id
		} else {
			booster = id
		}
	}
	return recipient, booster, nil
}

// Access forms bind to a server-selected paid order or accepted sale agreement.
// A generic information request never satisfies an operational credential guard.
func formResource(ctx context.Context, c *ent.Client, thread *ent.Conversation, in FormCreate, now time.Time) (string, error) {
	switch in.Purpose {
	case "information":
		return "", nil
	case "seller_access":
		if thread.SubmissionID == nil || in.Mode != "request" || in.Recipient != "customer" || in.ShareWithBooster {
			return "", identity.ErrForbidden
		}
		offer, err := c.SellerOffer.Query().Where(selleroffer.SubmissionIDEQ(*thread.SubmissionID), selleroffer.StateEQ("accepted")).Only(ctx)
		if err != nil {
			return "", err
		}
		if offer.SellerID != thread.UserID {
			return "", identity.ErrForbidden
		}
		return offer.ID, nil
	case "game_access", "buyer_access":
		id := threadOrder(thread)
		if id == "" {
			return "", identity.ErrForbidden
		}
		row, err := formPaidOrder(ctx, c, id, thread.UserID)
		if err != nil {
			return "", err
		}
		if in.Purpose == "buyer_access" {
			if row.Kind != "account" || in.Mode != "share" || in.Recipient != "customer" || in.ShareWithBooster {
				return "", identity.ErrForbidden
			}
			if !in.ExpiresAt.After(now.Add(24 * time.Hour)) {
				return "", invalid("expires_at", "Buyer access must remain available for more than 24 hours.")
			}
		} else {
			if row.Kind != "custom" && row.Kind != "package" {
				return "", identity.ErrForbidden
			}
			work, err := c.Fulfillment.Query().Where(fulfillment.OrderIDEQ(id)).Only(ctx)
			if err != nil {
				return "", err
			}
			if work.Mode != "account" {
				return "", identity.ErrForbidden
			}
			// Honor the accepted service's maximum credential lifetime.
			hours, err := formSecretHours(row)
			if err != nil {
				return "", err
			}
			if hours < 1 || hours > 720 || in.ExpiresAt.After(now.Add(time.Duration(hours)*time.Hour)) {
				return "", invalid("expires_at", "Use an expiry within this order's credential-retention limit.")
			}
		}
		return id, nil
	}
	return "", identity.ErrForbidden
}
func formPaidOrder(ctx context.Context, c *ent.Client, id, customer string) (*ent.Order, error) {
	row, err := c.Order.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	eligible := row.State == "queued" || row.State == "in_progress" || row.State == "completed" || (row.State == "on_hold" && (row.Kind == "custom" || row.Kind == "package"))
	if row.UserID != customer || !eligible {
		return nil, identity.ErrForbidden
	}
	ok, err := c.OrderContract.Query().Where(ordercontract.IDEQ(row.CurrentContract), ordercontract.ActiveOrderIDEQ(row.ID), ordercontract.PaymentStateEQ(ordercontract.PaymentStateSettled)).Exist(ctx)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, identity.ErrForbidden
	}
	held, err := c.ServiceCase.Query().Where(servicecase.ActiveOrderIDEQ(id)).Exist(ctx)
	if err != nil {
		return nil, err
	}
	if held {
		return nil, identity.ErrForbidden
	}
	return row, nil
}
func (s *Store) formOwned(ctx context.Context, c *ent.Client, p *identity.Principal, conversationID, id string, admin bool) (*ent.Conversation, *ent.ConversationForm, error) {
	if !canonicalID(id) || !canonicalID(conversationID) {
		return nil, nil, identity.ErrForbidden
	}
	thread, err := owned(ctx, c, p, conversationID, admin)
	if err != nil {
		return nil, nil, err
	}
	row, err := c.ConversationForm.Query().Where(conversationform.IDEQ(id), conversationform.ConversationIDEQ(conversationID)).Only(ctx)
	if err != nil {
		return nil, nil, err
	}
	if !admin && p.User.ID != row.RecipientID && p.User.ID != row.BoosterID {
		return nil, nil, &ent.NotFoundError{}
	}
	// A new assignment never inherits another booster's private form.
	if !admin && p.Session.Portal == string(identity.PortalBooster) {
		id, err := assignedBooster(ctx, c, thread)
		if err != nil {
			return nil, nil, err
		}
		if id != p.User.ID {
			return nil, nil, identity.ErrForbidden
		}
	}
	return thread, row, nil
}
func formOperationalAccess(ctx context.Context, c *ent.Client, thread *ent.Conversation, row *ent.ConversationForm) error {
	switch row.Purpose {
	case conversationform.PurposeInformation:
		return nil
	case conversationform.PurposeGameAccess, conversationform.PurposeBuyerAccess:
		_, err := formPaidOrder(ctx, c, row.ResourceID, thread.UserID)
		return err
	case conversationform.PurposeSellerAccess:
		offer, err := c.SellerOffer.Get(ctx, row.ResourceID)
		if err != nil {
			return err
		}
		if offer.State != "accepted" || offer.SellerID != thread.UserID {
			return identity.ErrForbidden
		}
	}
	return nil
}

func formSecretHours(row *ent.Order) (int, error) {
	var snap struct {
		Configuration struct {
			Services []struct {
				Key         string `json:"key"`
				Fulfillment *struct {
					SecretHours int `json:"secret_hours"`
				} `json:"fulfillment"`
			} `json:"services"`
		} `json:"configuration"`
	}
	raw, err := json.Marshal(row.Snapshot)
	if err != nil {
		return 0, err
	}
	if err = json.Unmarshal(raw, &snap); err != nil {
		return 0, err
	}
	for _, service := range snap.Configuration.Services {
		if service.Key == row.Service && service.Fulfillment != nil {
			return service.Fulfillment.SecretHours, nil
		}
	}
	return 0, nil
}
