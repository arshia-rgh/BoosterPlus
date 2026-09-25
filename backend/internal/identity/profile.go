package identity

import (
	"context"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authidentity"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authrecovery"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/user"
)

// UpdateProfile allows only self-owned display and notification fields.
func (s *Service) UpdateProfile(ctx context.Context, p *Principal, name, alias string, notify bool) error {
	if err := Require(p, "self"); err != nil {
		return err
	}
	name = strings.TrimSpace(name)
	alias = strings.TrimSpace(alias)
	if len(name) > 100 || len(alias) > 80 || strings.IndexFunc(name+alias, unicode.IsControl) >= 0 {
		return ErrInvalid
	}
	return s.AuthorizedTransaction(ctx, p, "self", false, func(tx *ent.Tx, current *Principal) error {
		// A staff member using the customer portal cannot edit their staff identity.
		if (current.User.Role == RoleCustomer || current.Session.Portal == string(PortalCustomer)) && alias != current.User.StaffAlias {
			return ErrForbidden
		}
		_, err := tx.User.UpdateOneID(current.User.ID).SetDisplayName(name).SetStaffAlias(alias).SetNotifyUpdates(notify).Save(ctx)
		return err
	})
}

// Users is deliberately unavailable to customers/boosters, even for direct API calls.
func (s *Service) Users(ctx context.Context, p *Principal) ([]*ent.User, error) {
	if err := Require(p, "users.read"); err != nil {
		return nil, err
	}
	return s.client.User.Query().Order(ent.Desc(user.FieldCreatedAt)).Limit(100).All(ctx)
}

// User allows staff lookup; self-service uses the authenticated /me endpoint instead.
func (s *Service) User(ctx context.Context, p *Principal, id string) (*ent.User, error) {
	if err := Require(p, "users.read"); err != nil {
		return nil, err
	}
	return s.client.User.Get(ctx, id)
}

// GrantRole serializes privilege changes and preserves at least one owner.
func (s *Service) GrantRole(ctx context.Context, p *Principal, id, role string) error {
	if err := validateRole(role); err != nil {
		return err
	}
	return s.transaction(ctx, func(tx *ent.Tx) error {
		if err := lockSecurity(ctx, tx); err != nil {
			return err
		}
		actor, actorErr := s.fresh(ctx, tx, p)
		if actorErr != nil {
			return actorErr
		}
		if err := Require(actor, "staff.manage"); err != nil {
			return err
		}
		if err := s.sensitive(actor); err != nil {
			return err
		}
		target, targetErr := tx.User.Get(ctx, id)
		if targetErr != nil {
			return targetErr
		}
		if target.EmailVerifiedAt == nil || target.DeletedAt != nil {
			return ErrInvalid
		}
		if target.Role == RoleOwner && role != RoleOwner {
			count, countErr := tx.User.Query().Where(user.RoleEQ(RoleOwner), user.SuspendedEQ(false)).Count(ctx)
			if countErr != nil {
				return countErr
			}
			if count <= 1 {
				return ErrConflict
			}
		}
		if target.Role == role {
			return nil
		}
		if _, updateErr := tx.User.UpdateOne(target).SetRole(role).AddAuthVersion(1).Save(ctx); updateErr != nil {
			return updateErr
		}
		if err := revokeAll(ctx, tx, id, s.now()); err != nil {
			return err
		}
		return audit(ctx, tx, s.now(), actor.User.ID, "", "role.changed", id, map[string]string{"from": target.Role, "to": role})
	})
}

// Suspend prevents admins acting on administrators/owners, and prevents self-suspension.
func (s *Service) Suspend(ctx context.Context, p *Principal, id string, suspended bool) error {
	return s.transaction(ctx, func(tx *ent.Tx) error {
		if err := lockSecurity(ctx, tx); err != nil {
			return err
		}
		actor, actorErr := s.fresh(ctx, tx, p)
		if actorErr != nil {
			return actorErr
		}
		if err := Require(actor, "admin"); err != nil {
			return err
		}
		if err := s.sensitive(actor); err != nil {
			return err
		}
		target, targetErr := tx.User.Get(ctx, id)
		if targetErr != nil {
			return targetErr
		}
		if target.DeletedAt != nil {
			return ErrConflict
		}
		if id == actor.User.ID {
			return ErrForbidden
		}
		if actor.User.Role != RoleOwner && (target.Role == RoleAdmin || target.Role == RoleOwner) {
			return ErrForbidden
		}
		if suspended && target.Role == RoleOwner {
			count, countErr := tx.User.Query().Where(user.RoleEQ(RoleOwner), user.SuspendedEQ(false)).Count(ctx)
			if countErr != nil {
				return countErr
			}
			if count <= 1 {
				return ErrConflict
			}
		}
		if target.Suspended == suspended {
			return nil
		}
		if _, updateErr := tx.User.UpdateOne(target).SetSuspended(suspended).AddAuthVersion(1).Save(ctx); updateErr != nil {
			return updateErr
		}
		if err := revokeAll(ctx, tx, id, s.now()); err != nil {
			return err
		}
		action := "user.unsuspended"
		if suspended {
			action = "user.suspended"
		}
		return audit(ctx, tx, s.now(), actor.User.ID, "", action, id, map[string]string{})
	})
}

// BootstrapOwner can only initialize an owner once, from an already verified and MFA-enrolled identity.
func (s *Service) BootstrapOwner(ctx context.Context, id, operator string) error {
	if !regexp.MustCompile(`^[A-Za-z0-9_.@-]{3,64}$`).MatchString(operator) {
		return ErrInvalid
	}
	return s.transaction(ctx, func(tx *ent.Tx) error {
		if err := lockSecurity(ctx, tx); err != nil {
			return err
		}
		count, countErr := tx.User.Query().Where(user.RoleEQ(RoleOwner)).Count(ctx)
		if countErr != nil {
			return countErr
		}
		if count != 0 {
			return ErrConflict
		}
		account, accountErr := activeUser(ctx, tx, id)
		if accountErr != nil {
			return accountErr
		}
		if account.EmailVerifiedAt == nil || !account.MfaEnabled {
			return ErrMFA
		}
		if _, updateErr := tx.User.UpdateOne(account).SetRole(RoleOwner).AddAuthVersion(1).Save(ctx); updateErr != nil {
			return updateErr
		}
		if err := revokeAll(ctx, tx, id, s.now()); err != nil {
			return err
		}
		return audit(ctx, tx, s.now(), "", "cli:"+operator, "owner.bootstrapped", id, map[string]string{})
	})
}

func (s *Service) changeEmail(ctx context.Context, tx *ent.Tx, id, email, actor, action string, disconnectGoogle bool) error {
	account, accountErr := tx.User.Get(ctx, id)
	if accountErr != nil {
		return accountErr
	}
	conflict, conflictErr := tx.User.Query().Where(user.EmailEQ(email), user.IDNEQ(id)).Exist(ctx)
	if conflictErr != nil {
		return conflictErr
	}
	if conflict {
		return ErrConflict
	}
	if _, updateErr := tx.User.UpdateOne(account).SetEmail(email).SetEmailVerifiedAt(s.now()).AddAuthVersion(1).Save(ctx); updateErr != nil {
		if ent.IsConstraintError(updateErr) {
			return ErrConflict
		}
		return updateErr
	}
	if disconnectGoogle {
		if _, deleteErr := tx.AuthIdentity.Delete().Where(authidentity.UserIDEQ(id)).Exec(ctx); deleteErr != nil {
			return deleteErr
		}
	}
	if err := revokeAll(ctx, tx, id, s.now()); err != nil {
		return err
	}
	for _, destination := range []string{account.Email, email} {
		if messageErr := s.queueMessage(ctx, tx, "", destination, "PLAYORA account email changed", "Your account email was changed. If you did not request this, contact support through the PLAYORA website. No passwords or verification codes will be requested by support.", 24*time.Hour); messageErr != nil {
			return messageErr
		}
	}
	return audit(ctx, tx, s.now(), actor, "", action, id, map[string]string{})
}

// Recoveries exposes verified-destination requests only to owners.
func (s *Service) Recoveries(ctx context.Context, p *Principal) ([]*ent.AuthRecovery, error) {
	if err := Require(p, "recovery"); err != nil {
		return nil, err
	}
	return s.client.AuthRecovery.Query().Where(authrecovery.StateEQ("pending"), authrecovery.ExpiresAtGT(s.now())).Order(ent.Desc(authrecovery.FieldCreatedAt)).Limit(100).All(ctx)
}

// ResolveRecovery requires explicit independent ownership review; mailbox access alone is not approval.
func (s *Service) ResolveRecovery(ctx context.Context, p *Principal, id, reference string, approve bool) error {
	if !regexp.MustCompile(`^[A-Za-z0-9_-]{3,64}$`).MatchString(reference) {
		return ErrInvalid
	}
	return s.transaction(ctx, func(tx *ent.Tx) error {
		if err := lockSecurity(ctx, tx); err != nil {
			return err
		}
		actor, actorErr := s.fresh(ctx, tx, p)
		if actorErr != nil {
			return actorErr
		}
		if err := Require(actor, "recovery"); err != nil {
			return err
		}
		if err := s.sensitive(actor); err != nil {
			return err
		}
		request, requestErr := tx.AuthRecovery.Query().Where(authrecovery.IDEQ(id), authrecovery.StateEQ("pending"), authrecovery.ExpiresAtGT(s.now())).Only(ctx)
		if requestErr != nil {
			if ent.IsNotFound(requestErr) {
				return ErrInvalid
			}
			return requestErr
		}
		if request.UserID == actor.User.ID {
			return ErrForbidden
		}
		state := "rejected"
		if approve {
			if changeErr := s.changeEmail(ctx, tx, request.UserID, request.NewEmail, actor.User.ID, "recovery.approved", true); changeErr != nil {
				return changeErr
			}
			state = "approved"
		}
		if _, updateErr := tx.AuthRecovery.UpdateOne(request).SetState(state).SetCaseReference(reference).Save(ctx); updateErr != nil {
			return updateErr
		}
		return audit(ctx, tx, s.now(), actor.User.ID, "", "recovery.resolved", request.UserID, map[string]string{"case_reference": reference, "outcome": state})
	})
}
