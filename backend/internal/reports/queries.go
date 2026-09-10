package reports

import (
	"context"
	"strconv"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authaudit"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/game"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/user"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func (s *Store) orders(ctx context.Context, tx *ent.Tx, q Query, b bounds, r *Report) error {
	r.Columns = []Column{{"id", "Order ID"}, {"created_at", "Created (UTC)"}, {"updated_at", "Updated (UTC)"}, {"version", "Version"}, {"kind", "Type"}, {"state", "Current state"}, {"game", "Game at purchase"}, {"slug", "Game slug"}, {"service", "Service"}, {"package", "Package"}, {"variant", "Variant"}}
	query := tx.Order.Query().Where(order.CreatedAtGTE(b.from), order.CreatedAtLT(b.to)).Order(ent.Asc(order.FieldCreatedAt), ent.Asc(order.FieldID)).Limit(101)
	if q.State != "" {
		if e := order.StateValidator(order.State(q.State)); e != nil {
			return ErrInvalid
		}
		query.Where(order.StateEQ(order.State(q.State)))
	}
	if q.Search != "" {
		query.Where(order.Or(order.IDEQ(q.Search), order.GameNameContains(q.Search), order.SlugContains(q.Search)))
	}
	if q.After != "" {
		query.Where(order.Or(order.CreatedAtGT(b.afterTime), order.And(order.CreatedAtEQ(b.afterTime), order.IDGT(b.afterID))))
	}
	rows, e := query.Select(order.FieldID, order.FieldCreatedAt, order.FieldUpdatedAt, order.FieldVersion, order.FieldKind, order.FieldState, order.FieldGameName, order.FieldSlug, order.FieldService, order.FieldPackageKey, order.FieldVariantKey).All(ctx)
	if e != nil {
		return e
	}
	if len(rows) > 100 {
		r.Next = s.cursor(q, rows[99].CreatedAt, rows[99].ID)
		rows = rows[:100]
	}
	for _, v := range rows {
		r.Rows = append(r.Rows, []string{v.ID, instant(v.CreatedAt), instant(v.UpdatedAt), strconv.Itoa(v.Version), string(v.Kind), string(v.State), v.GameName, v.Slug, v.Service, v.PackageKey, v.VariantKey})
	}
	return nil
}
func (s *Store) catalog(ctx context.Context, tx *ent.Tx, q Query, b bounds, r *Report) error {
	r.Columns = []Column{{"id", "Game ID"}, {"created_at", "Created (UTC)"}, {"slug", "Permanent slug"}, {"name", "Working name (staff draft)"}, {"version", "Draft version"}, {"state", "Current publication state"}, {"release_id", "Published release ID"}}
	query := tx.Game.Query().Where(game.CreatedAtGTE(b.from), game.CreatedAtLT(b.to)).Order(ent.Asc(game.FieldCreatedAt), ent.Asc(game.FieldID)).Limit(101)
	switch q.State {
	case "":
	case "archived":
		query.Where(game.ArchivedEQ(true))
	case "paused":
		query.Where(game.ArchivedEQ(false), game.PausedEQ(true))
	case "published":
		query.Where(game.ArchivedEQ(false), game.PausedEQ(false), game.PublishedEQ(true))
	case "draft":
		query.Where(game.ArchivedEQ(false), game.PausedEQ(false), game.PublishedEQ(false))
	default:
		return ErrInvalid
	}
	if q.Search != "" {
		query.Where(game.Or(game.IDEQ(q.Search), game.NameContains(q.Search), game.SlugContains(q.Search)))
	}
	if q.After != "" {
		query.Where(game.Or(game.CreatedAtGT(b.afterTime), game.And(game.CreatedAtEQ(b.afterTime), game.IDGT(b.afterID))))
	}
	rows, e := query.Select(game.FieldID, game.FieldCreatedAt, game.FieldSlug, game.FieldName, game.FieldVersion, game.FieldPublished, game.FieldPaused, game.FieldArchived, game.FieldCurrentRelease).All(ctx)
	if e != nil {
		return e
	}
	if len(rows) > 100 {
		r.Next = s.cursor(q, rows[99].CreatedAt, rows[99].ID)
		rows = rows[:100]
	}
	for _, v := range rows {
		state := "draft"
		switch {
		case v.Archived:
			state = "archived"
		case v.Paused:
			state = "paused"
		case v.Published:
			state = "published"
		}
		r.Rows = append(r.Rows, []string{v.ID, instant(v.CreatedAt), v.Slug, v.Name, strconv.Itoa(v.Version), state, v.CurrentRelease})
	}
	return nil
}
func (s *Store) staff(ctx context.Context, tx *ent.Tx, q Query, b bounds, r *Report) error {
	r.Columns = []Column{{"id", "Staff account ID"}, {"created_at", "Account created (UTC)"}, {"alias", "Staff alias"}, {"role", "Current role"}, {"status", "Account status"}, {"mfa_enabled", "Authenticator enrolled"}}
	query := tx.User.Query().Where(user.RoleIn(identity.RoleBooster, identity.RoleAdmin, identity.RoleOwner), user.CreatedAtGTE(b.from), user.CreatedAtLT(b.to)).Order(ent.Asc(user.FieldCreatedAt), ent.Asc(user.FieldID)).Limit(101)
	switch q.State {
	case "":
	case "active":
		query.Where(user.SuspendedEQ(false))
	case "suspended":
		query.Where(user.SuspendedEQ(true))
	default:
		return ErrInvalid
	}
	if q.Search != "" {
		query.Where(user.Or(user.IDEQ(q.Search), user.StaffAliasContains(q.Search)))
	}
	if q.After != "" {
		query.Where(user.Or(user.CreatedAtGT(b.afterTime), user.And(user.CreatedAtEQ(b.afterTime), user.IDGT(b.afterID))))
	}
	rows, e := query.Select(user.FieldID, user.FieldCreatedAt, user.FieldStaffAlias, user.FieldRole, user.FieldSuspended, user.FieldMfaEnabled).All(ctx)
	if e != nil {
		return e
	}
	if len(rows) > 100 {
		r.Next = s.cursor(q, rows[99].CreatedAt, rows[99].ID)
		rows = rows[:100]
	}
	for _, v := range rows {
		state := "active"
		if v.Suspended {
			state = "suspended"
		}
		r.Rows = append(r.Rows, []string{v.ID, instant(v.CreatedAt), v.StaffAlias, v.Role, state, strconv.FormatBool(v.MfaEnabled)})
	}
	return nil
}
func (s *Store) audits(ctx context.Context, tx *ent.Tx, q Query, b bounds, r *Report) error {
	if q.State != "" {
		return ErrInvalid
	}
	r.Basis = "Audit events that occurred in [from, to), UTC. Metadata and private notes are excluded."
	r.Columns = []Column{{"id", "Audit ID"}, {"created_at", "Occurred (UTC)"}, {"actor_id", "Actor account ID"}, {"actor_reference", "Actor reference"}, {"action", "Action"}, {"target_id", "Target ID"}}
	query := tx.AuthAudit.Query().Where(authaudit.CreatedAtGTE(b.from), authaudit.CreatedAtLT(b.to)).Order(ent.Asc(authaudit.FieldCreatedAt), ent.Asc(authaudit.FieldID)).Limit(101)
	if q.Search != "" {
		query.Where(authaudit.Or(authaudit.ActionContains(q.Search), authaudit.TargetIDEQ(q.Search), authaudit.ActorIDEQ(q.Search)))
	}
	if q.After != "" {
		query.Where(authaudit.Or(authaudit.CreatedAtGT(b.afterTime), authaudit.And(authaudit.CreatedAtEQ(b.afterTime), authaudit.IDGT(b.afterID))))
	}
	rows, e := query.Select(authaudit.FieldID, authaudit.FieldCreatedAt, authaudit.FieldActorID, authaudit.FieldActorReference, authaudit.FieldAction, authaudit.FieldTargetID).All(ctx)
	if e != nil {
		return e
	}
	if len(rows) > 100 {
		r.Next = s.cursor(q, rows[99].CreatedAt, rows[99].ID)
		rows = rows[:100]
	}
	for _, v := range rows {
		r.Rows = append(r.Rows, []string{v.ID, instant(v.CreatedAt), v.ActorID, v.ActorReference, v.Action, v.TargetID})
	}
	return nil
}
