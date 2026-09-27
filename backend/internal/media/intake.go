package media

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/mediafile"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// fileMember keeps unsubmitted intake private to its customer. Binding grants
// administrators access to this order evidence, never to unrelated draft files.
func fileMember(ctx context.Context, client *ent.Client, p *identity.Principal, row *ent.MediaFile, admin bool) error {
	if row.IntakeKey == "" {
		return member(ctx, client, p, row.ConversationID, admin)
	}
	if err := identity.Require(p, capFor(admin)); err != nil {
		return err
	}
	if row.IntakeOrderID == nil {
		if admin || p.Session.Portal != "customer" || row.UserID != p.User.ID {
			return &ent.NotFoundError{}
		}
		return nil
	}
	q := client.Order.Query().Where(order.IDEQ(*row.IntakeOrderID), order.UserIDEQ(row.UserID))
	if !admin {
		if p.Session.Portal != "customer" {
			return &ent.NotFoundError{}
		}
		q.Where(order.UserIDEQ(p.User.ID))
	}
	_, err := q.Only(ctx)
	return err
}

func validIntakeScope(p *identity.Principal, admin bool, input Intent) error {
	if input.IntakeKey == "" {
		return nil
	}
	if err := identity.Require(p, capFor(admin)); err != nil {
		return err
	}
	key, err := uuid.Parse(input.IntakeKey)
	if err != nil || key.String() != input.IntakeKey || key.Version() != 4 || input.ConversationID != "" || input.Visibility != "public" {
		return ErrInvalid
	}
	if admin || p.Session.Portal != "customer" {
		return identity.ErrForbidden
	}
	return nil
}

// BindIntake is called inside the order's authorized transaction after its
// answers are validated. A failed order write also rolls back every file bind.
// Draft references are opaque request IDs; revisions use the owned order ID.
func BindIntake(ctx context.Context, tx *ent.Tx, p *identity.Principal, row *ent.Order, key string, ids []string, now time.Time) error {
	if err := identity.Require(p, "account"); err != nil {
		return err
	}
	if p.Session.Portal != "customer" || row.UserID != p.User.ID {
		return identity.ErrForbidden
	}
	if len(ids) > 4 {
		return ErrInvalid
	}
	seen := make(map[string]bool, len(ids))
	for _, id := range ids {
		if seen[id] {
			return ErrInvalid
		}
		seen[id] = true
		file, err := owned(ctx, tx.Client(), p, id)
		if err != nil {
			return err
		}
		if file.IntakeKey == "" || file.ConversationID != "" || file.MessageID != nil || file.State != mediafile.StateReady || file.Visibility != mediafile.VisibilityPublic {
			return ErrConflict
		}
		if file.IntakeOrderID != nil {
			if *file.IntakeOrderID != row.ID {
				return ErrConflict
			}
			continue
		}
		if file.IntakeKey != key || !file.ExpiresAt.After(now) {
			return ErrConflict
		}
		count, err := tx.MediaFile.Update().Where(mediafile.IDEQ(id), mediafile.IntakeOrderIDIsNil(), mediafile.StateEQ(mediafile.StateReady), mediafile.ExpiresAtGT(now)).SetIntakeOrderID(row.ID).SetUpdatedAt(now).Save(ctx)
		if err != nil {
			return err
		}
		if count != 1 {
			return ErrConflict
		}
	}
	return nil
}
