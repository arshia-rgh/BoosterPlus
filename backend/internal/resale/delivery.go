package resale

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountdelivery"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationform"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/chataccess"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
)

// DeliveryView exposes accepted public terms and handoff lifecycle, never seller or staff identity.
type DeliveryView struct {
	OrderID        string        `json:"order_id"`
	FormID         string        `json:"form_id"`
	ConversationID string        `json:"conversation_id"`
	Product        PublicListing `json:"listing"`
	Version        int           `json:"version"`
	State          string        `json:"state"`
	Instructions   string        `json:"instructions"`
	Secret         SecretView    `json:"secret"`
	DeliveredAt    *time.Time    `json:"delivered_at"`
	AcknowledgedAt *time.Time    `json:"acknowledged_at"`
	DisputeUntil   *time.Time    `json:"dispute_until"`
	ActiveCase     bool          `json:"active_case"`
}

// DeliveryChange binds handoff/acknowledgement to the exact visible revision.
type DeliveryChange struct {
	Version       int    `json:"version"`
	SecretVersion int    `json:"secret_version"`
	Instructions  string `json:"instructions"`
	Accept        bool   `json:"accept"`
}

func deliveryView(ctx context.Context, client *ent.Client, row *ent.Order, now time.Time) (DeliveryView, error) {
	listing, err := decode[PublicListing](row.AccountSnapshot)
	if err != nil {
		return DeliveryView{}, err
	}
	result := DeliveryView{OrderID: row.ID, Product: listing, State: "pending", Secret: SecretView{State: "missing"}}
	result.ActiveCase, err = client.ServiceCase.Query().Where(servicecase.ActiveOrderIDEQ(row.ID)).Exist(ctx)
	if err != nil {
		return result, err
	}
	record, err := client.AccountDelivery.Query().Where(accountdelivery.OrderIDEQ(row.ID)).Only(ctx)
	if ent.IsNotFound(err) {
		return result, nil
	}
	if err != nil {
		return result, err
	}
	result.Version = record.Version
	result.State = record.State
	result.Instructions = record.Instructions
	result.DeliveredAt = record.DeliveredAt
	result.AcknowledgedAt = record.AcknowledgedAt
	result.DisputeUntil = record.DisputeUntil
	result.FormID = record.FormID
	if record.FormID != "" {
		form, e := client.ConversationForm.Get(ctx, record.FormID)
		if e != nil {
			return result, e
		}
		result.ConversationID = form.ConversationID
	}
	bundle, err := deliveryBundle(ctx, client, record, now)
	if ent.IsNotFound(err) {
		return result, nil
	}
	if err != nil {
		return result, err
	}
	result.Secret = SecretView{bundle.Version, string(bundle.State), &bundle.ExpiresAt}
	if bundle.State == secretbundle.StateActive && !bundle.ExpiresAt.After(now) {
		result.Secret.State = "expired"
	}
	return result, nil
}

// Delivery rereads the private order boundary and returns a safe buyer/staff projection.
func (s *Store) Delivery(ctx context.Context, p *identity.Principal, id string, admin bool) (DeliveryView, error) {
	var result DeliveryView
	if !validID(id) {
		return result, ErrInvalid
	}
	capability := "account"
	if admin {
		capability = "admin"
	}
	err := s.auth.AuthorizedTransaction(ctx, p, capability, false, func(tx *ent.Tx, current *identity.Principal) error {
		q := tx.Order.Query().Where(order.IDEQ(id), order.KindEQ(order.KindAccount))
		if !admin {
			q.Where(order.UserIDEQ(current.User.ID))
		}
		row, e := q.Only(ctx)
		if e != nil {
			return e
		}
		result, e = deliveryView(ctx, tx.Client(), row, s.instant())
		return e
	})
	return result, err
}

// ChangeDelivery separates staff-provided access from the buyer's explicit acknowledgement.
func (s *Store) ChangeDelivery(ctx context.Context, p *identity.Principal, id, action string, admin bool, input DeliveryChange) (DeliveryView, error) {
	if !validID(id) || !version(input.Version) || !input.Accept || !text(input.Instructions, 10, 4000) {
		return DeliveryView{}, ErrInvalid
	}
	capability := "account"
	if admin {
		capability = "admin"
	}
	var result DeliveryView
	err := s.auth.AuthorizedTransaction(ctx, p, capability, admin, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := paidAccount(ctx, tx.Client(), id)
		if e != nil {
			return e
		}
		if !admin && row.UserID != current.User.ID {
			return &ent.NotFoundError{}
		}
		record, e := tx.AccountDelivery.Query().Where(accountdelivery.OrderIDEQ(id)).Only(ctx)
		if e != nil {
			return e
		}
		if record.Version != input.Version {
			return ErrConflict
		}
		next := order.StateInProgress
		update := tx.AccountDelivery.UpdateOneID(record.ID).AddVersion(1).SetUpdatedAt(s.instant())
		switch action {
		case "takeover":
			if !admin {
				return identity.ErrForbidden
			}
			if e = identity.Require(current, "owner"); e != nil {
				return e
			}
			if record.State != "pending" {
				return ErrConflict
			}
			if _, e = tx.SecretBundle.Update().Where(secretbundle.PurposeEQ(secretbundle.PurposeAccountTransfer), secretbundle.ResourceIDEQ(id), secretbundle.OwnerIDEQ(record.SecretOwnerID), secretbundle.StateEQ(secretbundle.StateActive)).AddVersion(1).SetState(secretbundle.StateDeleted).ClearEncryptedPayload().ClearWrappedKey().SetKeyVersion("").SetUpdatedAt(s.instant()).Save(ctx); e != nil {
				return e
			}
			if record.FormID != "" {
				if _, e = tx.ConversationForm.UpdateOneID(record.FormID).SetState(conversationform.StateCancelled).ClearAnswers().AddVersion(1).SetUpdatedAt(s.instant()).Save(ctx); e != nil {
					return e
				}
				if _, e = tx.SecretBundle.Update().Where(secretbundle.PurposeEQ(secretbundle.PurposeChatForm), secretbundle.ResourceIDEQ(record.FormID)).SetState(secretbundle.StateDeleted).ClearEncryptedPayload().ClearWrappedKey().SetKeyVersion("").AddVersion(1).SetUpdatedAt(s.instant()).Save(ctx); e != nil {
					return e
				}
			}
			update.SetSecretOwnerID(current.User.ID).SetSecretVersion(0).SetFormID("")
			next = row.State
		case "deliver":
			if !admin {
				return identity.ErrForbidden
			}
			if record.State != "pending" {
				return ErrConflict
			}
			bundle, bundleErr := deliveryBundle(ctx, tx.Client(), record, s.instant())
			if bundleErr != nil {
				return bundleErr
			}
			if bundle.State != secretbundle.StateActive || bundle.Version != input.SecretVersion || !bundle.ExpiresAt.After(s.instant().Add(24*time.Hour)) {
				return ErrConflict
			}
			snapshot, decodeErr := decode[PublicListing](row.AccountSnapshot)
			if decodeErr != nil {
				return decodeErr
			}
			update.SetState("delivered").SetSecretVersion(bundle.Version).SetInstructions(input.Instructions).SetDeliveredAt(s.instant()).SetDisputeUntil(s.instant().Add(time.Duration(snapshot.Product.DisputeHours) * time.Hour))
		case "acknowledge":
			if admin {
				return identity.ErrForbidden
			}
			if record.State != "delivered" {
				return ErrConflict
			}
			if !current.Session.AuthenticatedAt.Add(identity.RecentTTL).After(s.instant()) {
				return identity.ErrRecent
			}
			update.SetState("acknowledged").SetAcknowledgedAt(s.instant())
			next = order.StateCompleted
		default:
			return ErrInvalid
		}
		if _, e = update.Save(ctx); e != nil {
			return e
		}
		row, e = tx.Order.UpdateOneID(id).AddVersion(1).SetState(next).SetUpdatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		event, e := tx.OrderEvent.Create().SetOrderID(id).SetVersion(row.Version).SetAction("account_" + action).SetActorID(current.User.ID).SetActorRole(current.User.Role).SetMessage(input.Instructions).SetCreatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		if e = s.audit(ctx, tx, current, "account_"+action, id); e != nil {
			return e
		}
		if admin {
			if e = notifications.Enqueue(ctx, tx, row.UserID, id, event.ID, "order_customer", s.instant()); e != nil {
				return e
			}
		}
		result, e = deliveryView(ctx, tx.Client(), row, s.instant())
		return e
	})
	return result, err
}

func deliveryBundle(ctx context.Context, c *ent.Client, row *ent.AccountDelivery, now time.Time) (*ent.SecretBundle, error) {
	if row.FormID == "" {
		return c.SecretBundle.Query().Where(secretbundle.PurposeEQ(secretbundle.PurposeAccountTransfer), secretbundle.ResourceIDEQ(row.OrderID), secretbundle.OwnerIDEQ(row.SecretOwnerID)).Only(ctx)
	}
	form, err := c.ConversationForm.Get(ctx, row.FormID)
	if err != nil {
		return nil, err
	}
	if form.Purpose != conversationform.PurposeBuyerAccess || form.ResourceID != row.OrderID || form.RecipientID != row.BuyerID || form.AnsweredBy != row.SecretOwnerID {
		return nil, identity.ErrForbidden
	}
	return chataccess.Bundle(ctx, c, row.FormID, now)
}
