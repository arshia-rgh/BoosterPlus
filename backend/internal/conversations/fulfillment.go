package conversations

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/communication"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
)

// OpenCoordination explicitly creates one shared scope without sharing private support history.
func (s *Store) OpenCoordination(ctx context.Context, p *identity.Principal, id string, version int) (View, error) {
	if version < 1 || version >= 2147483646 {
		return View{}, ErrConflict
	}
	var result View
	err := s.auth.StaffTransaction(ctx, p, true, func(tx *ent.Tx, current *identity.Principal) error {
		order, err := tx.Order.Get(ctx, id)
		if err != nil {
			return err
		}
		if order.State != "queued" && order.State != "in_progress" && order.State != "on_hold" {
			return ErrConflict
		}
		paid, err := tx.OrderContract.Query().Where(ordercontract.IDEQ(order.CurrentContract), ordercontract.ActiveOrderIDEQ(id), ordercontract.UserIDEQ(order.UserID), ordercontract.PaymentStateEQ(ordercontract.PaymentStateSettled)).Exist(ctx)
		if err != nil {
			return err
		}
		if !paid {
			return ErrConflict
		}
		work, err := tx.Fulfillment.Query().Where(fulfillment.OrderIDEQ(id)).Only(ctx)
		if err != nil {
			return err
		}
		staff, err := tx.User.Get(ctx, work.AssignedID)
		if err != nil {
			return err
		}
		if err = communication.AssignedUser(ctx, tx.Client(), staff, id, order.UserID); err != nil {
			return err
		}
		existing, err := tx.Conversation.Query().Where(conversation.FulfillmentOrderIDEQ(id)).Only(ctx)
		if err == nil {
			result, err = visible(ctx, tx.Client(), current, existing, true)
			return err
		}
		if !ent.IsNotFound(err) {
			return err
		}
		if version != work.Version || version >= 2147483646 {
			return ErrConflict
		}
		key, err := uuid.NewV7()
		if err != nil {
			return err
		}
		now := s.now().UTC()
		row, err := tx.Conversation.Create().SetID(key.String()).SetUserID(order.UserID).SetKind(conversation.KindFulfillment).SetFulfillmentOrderID(id).SetBoosterShared(true).SetSubject("Boosting coordination and proof").SetSlug(order.Slug).SetRequestKey(uuid.NewString()).SetRequestHash(s.auth.RequestDigest("coordination", []byte(id))).SetCreatedBy(current.User.ID).SetCreatedAt(now).SetUpdatedAt(now).SetPublicUpdatedAt(now).Save(ctx)
		if err != nil {
			return err
		}
		if _, err = tx.Fulfillment.UpdateOneID(work.ID).AddVersion(1).SetUpdatedAt(now).Save(ctx); err != nil {
			return err
		}
		if err = audit(ctx, tx, current, row.ID, "fulfillment_sharing_created", now); err != nil {
			return err
		}
		if order.UserID != current.User.ID {
			if err = notifications.Enqueue(ctx, tx, order.UserID, id, row.ID, "order_customer", now); err != nil {
				return err
			}
		}
		if work.AssignedID != current.User.ID && work.AssignedID != order.UserID {
			if err = notifications.Enqueue(ctx, tx, work.AssignedID, id, row.ID, "order_staff", now); err != nil {
				return err
			}
		}
		result, err = visible(ctx, tx.Client(), current, row, true)
		return err
	})
	return result, err
}

func (s *Store) notifyMessage(ctx context.Context, tx *ent.Tx, p *identity.Principal, row *ent.Conversation, message *ent.ConversationMessage, admin bool) error {
	if message.Visibility != "public" {
		return nil
	}
	if row.Kind != conversation.KindFulfillment {
		target, kind := row.AssignedTo, "conversation_staff"
		if admin {
			target, kind = row.UserID, "conversation_customer"
		}
		if target != "" && target != p.User.ID {
			return notifications.Enqueue(ctx, tx, target, row.ID, message.ID, kind, s.now())
		}
		return nil
	}
	if row.FulfillmentOrderID == nil {
		return ErrConflict
	}
	if row.UserID != p.User.ID {
		if err := notifications.Enqueue(ctx, tx, row.UserID, row.ID, message.ID, "conversation_customer", s.now()); err != nil {
			return err
		}
	}
	if row.AssignedTo != "" && row.AssignedTo != p.User.ID && row.AssignedTo != row.UserID {
		if err := notifications.Enqueue(ctx, tx, row.AssignedTo, row.ID, message.ID, "conversation_staff", s.now()); err != nil {
			return err
		}
	}
	if !row.BoosterShared {
		return nil
	}
	work, err := tx.Fulfillment.Query().Where(fulfillment.OrderIDEQ(*row.FulfillmentOrderID)).Only(ctx)
	if err != nil {
		return err
	}
	if work.AssignedID == p.User.ID || work.AssignedID == row.UserID || work.AssignedID == row.AssignedTo {
		return nil
	}
	staff, err := tx.User.Get(ctx, work.AssignedID)
	if err != nil {
		return err
	}
	if err = communication.AssignedUser(ctx, tx.Client(), staff, *row.FulfillmentOrderID, row.UserID); err != nil {
		if errors.Is(err, identity.ErrForbidden) || ent.IsNotFound(err) {
			return nil
		}
		return err
	}
	return notifications.Enqueue(ctx, tx, work.AssignedID, row.ID, message.ID, "coordination_booster", s.now())
}

func (s *Store) recordProof(ctx context.Context, tx *ent.Tx, p *identity.Principal, thread *ent.Conversation) error {
	if thread.FulfillmentOrderID == nil {
		return ErrConflict
	}
	row, err := tx.Order.Get(ctx, *thread.FulfillmentOrderID)
	if err != nil {
		return err
	}
	work, err := tx.Fulfillment.Query().Where(fulfillment.OrderIDEQ(row.ID)).Only(ctx)
	if err != nil {
		return err
	}
	if row.Version >= 2147483646 || work.Version >= 2147483646 {
		return ErrConflict
	}
	if _, err = tx.Fulfillment.UpdateOneID(work.ID).AddVersion(1).SetUpdatedAt(s.now()).Save(ctx); err != nil {
		return err
	}
	row, err = tx.Order.UpdateOneID(row.ID).AddVersion(1).SetUpdatedAt(s.now()).Save(ctx)
	if err != nil {
		return err
	}
	_, err = tx.OrderEvent.Create().SetOrderID(row.ID).SetVersion(row.Version).SetAction("proof_published").SetMessage("New proof published in the coordination conversation.").SetActorID(p.User.ID).SetActorRole(p.User.Role).SetCreatedAt(s.now()).Save(ctx)
	return err
}
