package identity

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authsession"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/user"
)

// Authenticate checks revocation, suspension, role-version changes, idle and absolute expiry on every request.
func (s *Service) Authenticate(ctx context.Context, token string) (*Principal, error) {
	if len(token) < 40 || len(token) > 128 {
		return nil, ErrUnauthenticated
	}
	now := s.now()
	session, err := s.client.AuthSession.Query().Where(authsession.TokenHashEQ(s.digest("session", token)), authsession.RevokedAtIsNil(), authsession.ExpiresAtGT(now), authsession.LastSeenAtGT(now.Add(-IdleTTL))).Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrUnauthenticated
		}
		return nil, err
	}
	account, accountErr := s.client.User.Query().Where(user.IDEQ(session.UserID), user.SuspendedEQ(false), user.AuthVersionEQ(session.AuthVersion)).Only(ctx)
	if accountErr != nil {
		if ent.IsNotFound(accountErr) {
			return nil, ErrUnauthenticated
		}
		return nil, accountErr
	}
	// Avoid treating a MySQL no-op update (same clock tick) as a revoked session.
	if !session.LastSeenAt.Before(now) {
		return &Principal{User: account, Session: session}, nil
	}
	count, touchErr := s.client.AuthSession.Update().Where(authsession.IDEQ(session.ID), authsession.RevokedAtIsNil(), authsession.LastSeenAtGT(now.Add(-IdleTTL)), authsession.ExpiresAtGT(now)).SetLastSeenAt(now).Save(ctx)
	if touchErr != nil {
		return nil, touchErr
	}
	if count != 1 {
		return nil, ErrUnauthenticated
	}
	return &Principal{User: account, Session: session}, nil
}

func (s *Service) issueSession(ctx context.Context, tx *ent.Tx, account *ent.User, oldSession string) (string, error) {
	now := s.now()
	if account.Suspended {
		return "", ErrUnauthenticated
	}
	if oldSession != "" {
		if _, err := tx.AuthSession.Update().Where(authsession.IDEQ(oldSession), authsession.RevokedAtIsNil()).SetRevokedAt(now).Save(ctx); err != nil {
			return "", err
		}
	}
	token := randomToken()
	lifetime := 7 * 24 * time.Hour
	if account.Role != RoleCustomer {
		lifetime = 12 * time.Hour
	}
	_, err := tx.AuthSession.Create().SetID(randomToken()).SetUserID(account.ID).SetTokenHash(s.digest("session", token)).SetAuthVersion(account.AuthVersion).SetAuthenticatedAt(now).SetCreatedAt(now).SetLastSeenAt(now).SetExpiresAt(now.Add(lifetime)).Save(ctx)
	return token, err
}

func (s *Service) rotate(ctx context.Context, tx *ent.Tx, p *Principal, firstFactor, secondFactor bool) (string, error) {
	token := randomToken()
	update := tx.AuthSession.Update().Where(authsession.IDEQ(p.Session.ID), authsession.UserIDEQ(p.User.ID), authsession.RevokedAtIsNil(), authsession.ExpiresAtGT(s.now())).SetTokenHash(s.digest("session", token)).SetLastSeenAt(s.now())
	if firstFactor {
		update.SetAuthenticatedAt(s.now()).ClearMfaVerifiedAt()
	}
	if secondFactor {
		update.SetMfaVerifiedAt(s.now())
	}
	count, err := update.Save(ctx)
	if err != nil {
		return "", err
	}
	if count != 1 {
		return "", ErrUnauthenticated
	}
	return token, nil
}

// Sessions lists active sessions belonging only to the authenticated user.
func (s *Service) Sessions(ctx context.Context, p *Principal) ([]*ent.AuthSession, error) {
	if err := Require(p, "account"); err != nil {
		return nil, err
	}
	return s.client.AuthSession.Query().Where(authsession.UserIDEQ(p.User.ID), authsession.RevokedAtIsNil(), authsession.ExpiresAtGT(s.now()), authsession.LastSeenAtGT(s.now().Add(-IdleTTL))).Order(ent.Desc(authsession.FieldCreatedAt)).Limit(100).All(ctx)
}

// Revoke deliberately returns the same result for another user's/nonexistent session ID.
func (s *Service) Revoke(ctx context.Context, p *Principal, id string, all bool) error {
	if p == nil {
		return ErrUnauthenticated
	}
	if all || id != p.Session.ID {
		if err := Require(p, "account"); err != nil {
			return err
		}
	}
	return s.transaction(ctx, func(tx *ent.Tx) error {
		query := tx.AuthSession.Update().Where(authsession.UserIDEQ(p.User.ID), authsession.RevokedAtIsNil())
		if !all {
			query.Where(authsession.IDEQ(id))
		}
		if _, err := query.SetRevokedAt(s.now()).Save(ctx); err != nil {
			return err
		}
		return audit(ctx, tx, s.now(), p.User.ID, "", "session.revoked", p.User.ID, map[string]string{"scope": map[bool]string{true: "all", false: "one"}[all]})
	})
}

func (s *Service) fresh(ctx context.Context, tx *ent.Tx, p *Principal) (*Principal, error) {
	if p == nil {
		return nil, ErrUnauthenticated
	}
	account, accountErr := activeUser(ctx, tx, p.User.ID)
	if accountErr != nil {
		return nil, accountErr
	}
	session, sessionErr := tx.AuthSession.Query().Where(authsession.IDEQ(p.Session.ID), authsession.TokenHashEQ(p.Session.TokenHash), authsession.UserIDEQ(account.ID), authsession.AuthVersionEQ(account.AuthVersion), authsession.RevokedAtIsNil(), authsession.ExpiresAtGT(s.now()), authsession.LastSeenAtGT(s.now().Add(-IdleTTL))).Only(ctx)
	if sessionErr != nil {
		if ent.IsNotFound(sessionErr) {
			return nil, ErrUnauthenticated
		}
		return nil, sessionErr
	}
	return &Principal{User: account, Session: session}, nil
}
