package shop

import (
	"context"
	"strconv"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopdelivery"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// RecipientView is disclosed only after recent verification and committed access audit.
type RecipientView struct {
	OrderID string            `json:"order_id"`
	Version int               `json:"version"`
	Values  map[string]string `json:"values"`
}

// RevealRecipient permits the owner customer, or current assigned staff/owner
// during paid active delivery. Values never enter order events or audit payloads.
func (s *Store) RevealRecipient(ctx context.Context, p *identity.Principal, id string, admin bool) (out RecipientView, err error) {
	if !validID(id) {
		return out, ErrInvalid
	}
	read := func(tx *ent.Tx, current *identity.Principal) error {
		row, e := shopOrder(ctx, tx, current, id, admin)
		if e != nil {
			return e
		}
		purchase, e := purchaseSnapshot(row)
		if e != nil {
			return e
		}
		if admin {
			if e = paidShop(ctx, tx, row, purchase); e != nil {
				return e
			}
			work, workErr := tx.ShopDelivery.Query().Where(shopdelivery.OrderIDEQ(id), shopdelivery.StateIn("processing", "held", "submitted")).Only(ctx)
			if workErr != nil {
				return workErr
			}
			if work.AssignedID != current.User.ID && current.User.Role != identity.RoleOwner {
				return identity.ErrForbidden
			}
			if row.State != "in_progress" && row.State != "on_hold" {
				return ErrConflict
			}
		}
		values, e := recipient(ctx, tx, row)
		if e != nil {
			return e
		}
		if e = ValidateRecipient(purchase.Product.Recipient, values.RecipientValues); e != nil {
			return ErrConflict
		}
		out = RecipientView{OrderID: id, Version: values.Version, Values: map[string]string{}}
		for _, field := range purchase.Product.Recipient {
			if value, ok := values.RecipientValues[field.Key]; ok {
				out.Values[field.Key] = value
			}
		}
		return s.deliveryAudit(ctx, tx, current, "recipient_accessed", row.ID, values.Version)
	}
	if admin {
		err = s.auth.StaffTransaction(ctx, p, true, read)
	} else {
		err = s.auth.RecentAccountTransaction(ctx, p, func(tx *ent.Tx, current *identity.Principal) error {
			if current.User.Role != identity.RoleCustomer || current.Session.Portal != string(identity.PortalCustomer) {
				return identity.ErrForbidden
			}
			return read(tx, current)
		})
	}
	if err != nil {
		return RecipientView{}, err
	}
	return out, nil
}
func (s *Store) deliveryAudit(ctx context.Context, tx *ent.Tx, p *identity.Principal, action, id string, version int) error {
	_, err := tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(p.User.ID).SetActorReference(p.User.ID).SetAction("shop_delivery_" + action).SetTargetID(id).SetMetadata(map[string]string{"version": strconv.Itoa(version)}).SetCreatedAt(s.now()).Save(ctx)
	return err
}
