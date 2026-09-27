package identity

import (
	"context"
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authsession"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/user"
)

// UserQuery defines stable bounded staff directory filters.
type UserQuery struct {
	Search string
	Role   string
	State  string
	After  string
}

// UserPage contains only public-to-staff identity projections.
type UserPage struct {
	Users []UserView `json:"users"`
	Next  string     `json:"next"`
}

// Directory rechecks live staff authority and selects no authentication secrets.
func (s *Service) Directory(ctx context.Context, p *Principal, input UserQuery) (out UserPage, err error) {
	out.Users = []UserView{}
	if !utf8.ValidString(input.Search) || len(input.Search) > 254 || strings.ContainsRune(input.Search, 0) {
		return out, ErrInvalid
	}
	if input.After != "" {
		id, e := uuid.Parse(input.After)
		if e != nil || id.String() != input.After {
			return out, ErrInvalid
		}
	}
	err = s.AuthorizedTransaction(ctx, p, "users.read", false, func(tx *ent.Tx, current *Principal) error {
		q := tx.User.Query().Order(ent.Asc(user.FieldID)).Limit(51)
		if input.Search != "" {
			q.Where(user.Or(user.IDEQ(input.Search), user.EmailContains(input.Search), user.DisplayNameContains(input.Search)))
		}
		if input.Role != "" {
			if !slices.Contains([]string{RoleCustomer, RoleBooster, RoleAdmin, RoleOwner}, input.Role) {
				return ErrInvalid
			}
			q.Where(user.RoleEQ(input.Role))
		}
		switch input.State {
		case "":
		case "active":
			q.Where(user.SuspendedEQ(false))
		case "suspended":
			q.Where(user.SuspendedEQ(true), user.DeletedAtIsNil())
		case "deleted":
			q.Where(user.DeletedAtNotNil())
		default:
			return ErrInvalid
		}
		if input.After != "" {
			q.Where(user.IDGT(input.After))
		}
		rows, e := q.Select(user.FieldID, user.FieldEmailVerifiedAt, user.FieldDeletedAt, user.FieldEmail, user.FieldDisplayName, user.FieldRole, user.FieldStaffAlias, user.FieldSuspended, user.FieldMfaEnabled, user.FieldNotifyUpdates).All(ctx)
		if e != nil {
			return e
		}
		if len(rows) > 50 {
			out.Next = rows[49].ID
			rows = rows[:50]
		}
		for _, row := range rows {
			out.Users = append(out.Users, userView(row))
		}
		return audit(ctx, tx, s.now(), current.User.ID, "", "users.directory", "", map[string]string{"filter_digest": s.RequestDigest("directory", []byte(input.Search+"|"+input.State+"|"+input.Role+"|"+input.After))})
	})
	return out, err
}

// RevokeUserSessions is a separate audited action; role hierarchy matches suspension.
func (s *Service) RevokeUserSessions(ctx context.Context, p *Principal, id string) error {
	return s.AuthorizedTransaction(ctx, p, "admin", true, func(tx *ent.Tx, current *Principal) error {
		target, e := tx.User.Get(ctx, id)
		if e != nil {
			return e
		}
		if current.User.Role != RoleOwner && (target.Role == RoleOwner || target.Role == RoleAdmin) {
			return ErrForbidden
		}
		if _, e = tx.AuthSession.Update().Where(authsession.UserIDEQ(id), authsession.RevokedAtIsNil()).SetRevokedAt(s.now()).Save(ctx); e != nil {
			return e
		}
		return audit(ctx, tx, s.now(), current.User.ID, "", "sessions.revoked_by_staff", id, map[string]string{})
	})
}

// UserSessions exposes only bounded timing metadata, never bearer material or provider subjects.
func (s *Service) UserSessions(ctx context.Context, p *Principal, id string) (out []map[string]any, err error) {
	out = []map[string]any{}
	err = s.AuthorizedTransaction(ctx, p, "users.read", false, func(tx *ent.Tx, current *Principal) error {
		if _, e := tx.User.Get(ctx, id); e != nil {
			return e
		}
		rows, e := tx.AuthSession.Query().Where(authsession.UserIDEQ(id), authsession.RevokedAtIsNil(), authsession.ExpiresAtGT(s.now()), authsession.LastSeenAtGT(s.now().Add(-IdleTTL))).Order(ent.Desc(authsession.FieldCreatedAt)).Limit(100).Select(authsession.FieldID, authsession.FieldPortal, authsession.FieldCreatedAt, authsession.FieldLastSeenAt, authsession.FieldExpiresAt).All(ctx)
		if e != nil {
			return e
		}
		for _, row := range rows {
			out = append(out, map[string]any{"id": row.ID, "portal": row.Portal, "created_at": row.CreatedAt, "last_seen_at": row.LastSeenAt, "expires_at": row.ExpiresAt, "current": row.ID == current.Session.ID})
		}
		return audit(ctx, tx, s.now(), current.User.ID, "", "users.sessions_read", id, map[string]string{})
	})
	return out, err
}
