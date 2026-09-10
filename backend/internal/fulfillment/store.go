package fulfillment

import (
	"context"
	"slices"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/user"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
)

func record(ctx context.Context, c *ent.Client, id string) (*ent.Fulfillment, error) {
	return c.Fulfillment.Query().Where(fulfillment.OrderIDEQ(id)).Only(ctx)
}
func authority(p *identity.Principal, row *ent.Order, work *ent.Fulfillment, audience string) error {
	switch audience {
	case "account":
		if p.User.ID == row.UserID {
			return nil
		}
	case "admin":
		return identity.Require(p, "admin")
	case "booster":
		if err := identity.Require(p, "booster"); err != nil {
			return err
		}
		if work != nil && work.AssignedID == p.User.ID {
			return nil
		}
	}
	return identity.ErrForbidden
}
func view(ctx context.Context, c *ent.Client, row *ent.Order, work *ent.Fulfillment, audience string) (View, error) {
	_, service, answers, err := definition(row)
	if err != nil {
		return View{}, err
	}
	later, err := decode[catalog.Answers](work.Answers)
	if err != nil {
		return View{}, err
	}
	for key, value := range later {
		answers[key] = value
	}
	target, err := c.User.Get(ctx, work.AssignedID)
	if err != nil {
		return View{}, err
	}
	alias := target.StaffAlias
	if alias == "" {
		alias = "Boosting team"
	}
	result := View{OrderID: row.ID, OrderVersion: row.Version, Version: work.Version, AccessVersion: work.AccessVersion, Game: row.GameName, Service: service.Name, State: string(row.State), Mode: string(work.Mode), SecretHours: service.Fulfillment.SecretHours, Alias: alias, Progress: work.Progress, CompletionPending: work.CompletionPending, Note: work.CurrentNote, EstimatedStart: work.EstimatedStart, EstimatedFinish: work.EstimatedFinish, Shared: []SharedField{}, UpdatedAt: work.UpdatedAt}
	if audience != "booster" {
		result.Handoff = later
	}
	if audience == "admin" {
		result.AssignedID = work.AssignedID
	}
	for _, field := range service.Fields {
		if slices.Contains(service.Fulfillment.ShareFields, field.Key) {
			if value, ok := answers[field.Key]; ok {
				result.Shared = append(result.Shared, SharedField{field.Key, field.Label, value})
			}
		}
	}
	return result, nil
}

// Get rechecks live session and assignment inside the same read transaction.
func (s *Store) Get(ctx context.Context, p *identity.Principal, id, audience string) (View, error) {
	var result View
	err := s.auth.AuthorizedTransaction(ctx, p, audience, false, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := paid(ctx, tx.Client(), id)
		if e != nil {
			return e
		}
		work, e := record(ctx, tx.Client(), id)
		if e != nil {
			return e
		}
		if e = authority(current, row, work, audience); e != nil {
			return e
		}
		result, e = view(ctx, tx.Client(), row, work, audience)
		return e
	})
	return result, err
}
func audit(ctx context.Context, tx *ent.Tx, p *identity.Principal, row *ent.Order, action, note string, now time.Time) error {
	_, err := tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(p.User.ID).SetTargetID(row.ID).SetAction("fulfillment_" + action).SetMetadata(map[string]string{}).SetCreatedAt(now).Save(ctx)
	if err != nil {
		return err
	}
	event, err := tx.OrderEvent.Create().SetOrderID(row.ID).SetVersion(row.Version).SetAction(action).SetMessage(note).SetActorID(p.User.ID).SetActorRole(p.User.Role).SetCreatedAt(now).Save(ctx)
	if err != nil {
		return err
	}
	if p.User.ID != row.UserID {
		return notifications.Enqueue(ctx, tx, row.UserID, row.ID, event.ID, "order_customer", now)
	}
	return nil
}

// Assign initializes only paid orders with an explicit mode and active MFA staff.
func (s *Store) Assign(ctx context.Context, p *identity.Principal, id string, input Assignment) (View, error) {
	if !bounded(input.Reason, 1, 2000) || input.Version < 0 || input.Version >= 2147483646 {
		return View{}, ErrInvalid
	}
	if parsed, err := uuid.Parse(input.AssignedID); err != nil || parsed.String() != input.AssignedID {
		return View{}, ErrInvalid
	}
	var result View
	err := s.auth.StaffTransaction(ctx, p, true, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := paid(ctx, tx.Client(), id)
		if e != nil {
			return e
		}
		if !active(row) || row.Version != input.OrderVersion || row.Version >= 2147483646 {
			return ErrConflict
		}
		target, e := tx.User.Query().Where(user.IDEQ(input.AssignedID), user.RoleIn("booster", "administrator", "owner"), user.SuspendedEQ(false), user.MfaEnabledEQ(true)).Only(ctx)
		if e != nil {
			return e
		}
		_, service, answers, e := definition(row)
		if e != nil {
			return e
		}
		mode, e := catalog.FulfillmentMode(service, answers)
		if e != nil {
			return e
		}
		work, e := record(ctx, tx.Client(), id)
		if e != nil && !ent.IsNotFound(e) {
			return e
		}
		now := s.now().UTC()
		if work == nil {
			if input.Version != 0 {
				return ErrConflict
			}
			work, e = tx.Fulfillment.Create().SetOrderID(id).SetAssignedID(target.ID).SetMode(fulfillment.Mode(mode)).SetCurrentNote(input.Reason).SetAnswers(map[string]any{}).SetCreatedAt(now).SetUpdatedAt(now).Save(ctx)
		} else {
			if work.Version != input.Version {
				return ErrConflict
			}
			accessVersion := work.AccessVersion
			if work.AssignedID != target.ID {
				accessVersion++
				if e = s.revokeInTx(ctx, tx, current, row, "reassigned"); e != nil {
					return e
				}
				row, e = tx.Order.UpdateOneID(row.ID).SetState(order.StateOnHold).Save(ctx)
				if e != nil {
					return e
				}
			}
			work, e = tx.Fulfillment.UpdateOneID(work.ID).AddVersion(1).SetAssignedID(target.ID).SetAccessVersion(accessVersion).SetCompletionPending(false).SetCurrentNote(input.Reason).SetUpdatedAt(now).Save(ctx)
		}
		if e != nil {
			return e
		}
		row, e = tx.Order.UpdateOneID(row.ID).AddVersion(1).SetUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		if e = audit(ctx, tx, current, row, "assigned", input.Reason, now); e != nil {
			return e
		}
		result, e = view(ctx, tx.Client(), row, work, "admin")
		return e
	})
	return result, err
}

// Staff lists only currently active MFA-enabled assignable identities.
type Staff struct {
	ID    string `json:"id"`
	Alias string `json:"alias"`
	Role  string `json:"role"`
}

// Directory exposes staff assignment identifiers to administrators only.
func (s *Store) Directory(ctx context.Context, p *identity.Principal) ([]Staff, error) {
	result := []Staff{}
	err := s.auth.AuthorizedTransaction(ctx, p, "admin", false, func(tx *ent.Tx, _ *identity.Principal) error {
		rows, e := tx.User.Query().Where(user.RoleIn("booster", "administrator", "owner"), user.SuspendedEQ(false), user.MfaEnabledEQ(true)).Order(ent.Asc(user.FieldID)).Limit(100).All(ctx)
		if e != nil {
			return e
		}
		result = []Staff{}
		for _, row := range rows {
			alias := row.StaffAlias
			if alias == "" {
				alias = "Boosting team"
			}
			result = append(result, Staff{row.ID, alias, row.Role})
		}
		return nil
	})
	return result, err
}
