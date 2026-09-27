package shop

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopdelivery"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
)

// DeliveryChange binds explicit staff work to both observed record revisions.
type DeliveryChange struct {
	Version        int    `json:"version"`
	OrderVersion   int    `json:"order_version"`
	Note           string `json:"note"`
	ProofMessageID string `json:"proof_message_id"`
}

// ChangeDelivery performs manual work only against verified allocated funds.
// Completion is an explicit reviewed transition; there is no timed acceptance.
func (s *Store) ChangeDelivery(ctx context.Context, p *identity.Principal, id, action string, input DeliveryChange) (out DeliveryView, err error) {
	if !validID(id) || !validVersion(input.OrderVersion) || input.Version < 0 || input.Version >= 2147483645 || !text(input.Note, 10, 2000) || (action == "submit" && !validID(input.ProofMessageID)) || (action != "submit" && input.ProofMessageID != "") {
		return out, ErrInvalid
	}
	switch action {
	case "claim", "take_over", "hold", "resume", "submit", "approve", "return":
	default:
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, true, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := shopOrder(ctx, tx, current, id, true)
		if e != nil {
			return e
		}
		if row.Version != input.OrderVersion || !validVersion(row.Version) || (row.State != order.StateQueued && row.State != order.StateInProgress && row.State != order.StateOnHold) {
			return ErrConflict
		}
		purchase, e := purchaseSnapshot(row)
		if e != nil {
			return e
		}
		if e = paidShop(ctx, tx, row, purchase); e != nil {
			return e
		}
		blocked, e := tx.ServiceCase.Query().Where(servicecase.ActiveOrderIDEQ(id)).Exist(ctx)
		if e != nil {
			return e
		}
		if blocked {
			return ErrConflict
		}
		work, e := tx.ShopDelivery.Query().Where(shopdelivery.OrderIDEQ(id)).Only(ctx)
		if e != nil && !ent.IsNotFound(e) {
			return e
		}
		next := row.State
		if action == "claim" {
			if work != nil || input.Version != 0 || row.State != order.StateQueued {
				return ErrConflict
			}
			if e = deliveryRecipientReady(ctx, tx, row, purchase); e != nil {
				return e
			}
			work, e = tx.ShopDelivery.Create().SetOrderID(id).SetAssignedID(current.User.ID).SetNote(input.Note).SetCreatedAt(s.now()).SetUpdatedAt(s.now()).Save(ctx)
			if e != nil {
				return e
			}
			next = order.StateInProgress
		} else {
			if work == nil || work.Version != input.Version || !validVersion(work.Version) {
				return ErrConflict
			}
			if action != "approve" && action != "return" && work.AssignedID != current.User.ID && current.User.Role != identity.RoleOwner {
				return identity.ErrForbidden
			}
			update := tx.ShopDelivery.UpdateOne(work).AddVersion(1).SetNote(input.Note).SetUpdatedAt(s.now())
			switch action {
			case "take_over":
				if current.User.Role != identity.RoleOwner {
					return identity.ErrForbidden
				}
				if work.State != "processing" && work.State != "held" {
					return ErrConflict
				}
				update.SetAssignedID(current.User.ID)
			case "hold":
				if work.State != "processing" || row.State != order.StateInProgress {
					return ErrConflict
				}
				update.SetState("held")
				next = order.StateOnHold
			case "resume":
				if work.State != "held" || row.State != order.StateOnHold {
					return ErrConflict
				}
				if e = deliveryRecipientReady(ctx, tx, row, purchase); e != nil {
					return e
				}
				update.SetState("processing")
				next = order.StateInProgress
			case "submit":
				if work.State != "processing" || row.State != order.StateInProgress || work.AssignedID != current.User.ID {
					return ErrConflict
				}
				if e = deliveryRecipientReady(ctx, tx, row, purchase); e != nil {
					return e
				}
				if e = deliveryProof(ctx, tx, row, work, input.ProofMessageID); e != nil {
					return e
				}
				update.SetState("submitted").SetProofMessageID(input.ProofMessageID)
			case "approve":
				if work.State != "submitted" || row.State != order.StateInProgress {
					return ErrConflict
				}
				if e = deliveryProof(ctx, tx, row, work, work.ProofMessageID); e != nil {
					return e
				}
				update.SetState("completed")
				next = order.StateCompleted
			case "return":
				if work.State != "submitted" || row.State != order.StateInProgress {
					return ErrConflict
				}
				update.SetState("processing").SetProofMessageID("")
			}
			work, e = update.Save(ctx)
			if e != nil {
				return e
			}
		}
		row, e = tx.Order.UpdateOne(row).SetState(next).AddVersion(1).SetUpdatedAt(s.now()).Save(ctx)
		if e != nil {
			return e
		}
		eventAction := "shop_delivery_" + action
		// Existing case eligibility uses this authoritative completion event.
		if action == "approve" {
			eventAction = "approve_completion"
		}
		entry, e := tx.OrderEvent.Create().SetOrderID(id).SetVersion(row.Version).SetAction(eventAction).SetActorID(current.User.ID).SetActorRole(current.User.Role).SetMessage(input.Note).SetCreatedAt(s.now()).Save(ctx)
		if e != nil {
			return e
		}
		if e = notifications.Enqueue(ctx, tx, row.UserID, id, entry.ID, "order_customer", s.now()); e != nil {
			return e
		}
		if work.AssignedID != current.User.ID {
			if e = notifications.Enqueue(ctx, tx, work.AssignedID, id, entry.ID, "order_staff", s.now()); e != nil {
				return e
			}
		}
		if e = s.deliveryAudit(ctx, tx, current, action, id, work.Version); e != nil {
			return e
		}
		out, e = deliveryView(ctx, tx, row, true)
		return e
	})
	if err != nil {
		return DeliveryView{}, err
	}
	return out, nil
}
func deliveryRecipientReady(ctx context.Context, tx *ent.Tx, row *ent.Order, purchase Purchase) error {
	values, err := recipient(ctx, tx, row)
	if ent.IsNotFound(err) {
		return ErrConflict
	}
	if err != nil {
		return err
	}
	if ValidateRecipient(purchase.Product.Recipient, values.RecipientValues) != nil {
		return ErrConflict
	}
	return nil
}
