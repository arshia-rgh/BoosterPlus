package identity

import (
	"context"
	"crypto/sha256"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/user"
)

// LegacyCustomerID binds a migrated customer to exactly one historical staff
// identity. SQL migration 41 uses the same derivation; this is never a login or
// an authorization alias. Vault compatibility additionally authenticates the
// original resource, purpose and envelope with its historical owner ID.
func LegacyCustomerID(original string) (string, error) {
	id, err := uuid.Parse(original)
	if err != nil || id.String() != original {
		return "", ErrInvalid
	}
	digest := fmt.Sprintf("%x", sha256.Sum256([]byte("playora:identity:customer:"+original)))
	return digest[:8] + "-" + digest[8:12] + "-5" + digest[13:16] + "-a" + digest[17:20] + "-" + digest[20:32], nil
}

// StaffInvitation explicitly provisions one independent staff account. It never
// changes a customer account or links factors from another namespace.
type StaffInvitation struct {
	Email       string `json:"email"`
	Portal      Portal `json:"portal"`
	Role        string `json:"role"`
	DisplayName string `json:"display_name"`
}

// InviteStaff requires an owner with fresh factors. Provisioning does not send
// mail: the invitee requests their own first-factor challenge on the staff host.
func (s *Service) InviteStaff(ctx context.Context, p *Principal, input StaffInvitation) (result *ent.User, err error) {
	email, err := NormalizeEmail(input.Email)
	if err != nil || (input.Portal != PortalAdmin && input.Portal != PortalBooster) || !input.Portal.permitsRole(input.Role) || input.Role == RoleOwner {
		return nil, ErrInvalid
	}
	name := strings.TrimSpace(input.DisplayName)
	if !utf8.ValidString(name) || len(name) > 100 || strings.IndexFunc(name, unicode.IsControl) >= 0 {
		return nil, ErrInvalid
	}
	err = s.AuthorizedTransaction(ctx, p, "staff.manage", true, func(tx *ent.Tx, current *Principal) error {
		var createErr error
		result, createErr = tx.User.Create().SetPortal(string(input.Portal)).SetEmail(email).SetRole(input.Role).SetDisplayName(name).Save(ctx)
		if ent.IsConstraintError(createErr) {
			return ErrConflict
		}
		if createErr != nil {
			return createErr
		}
		return audit(ctx, tx, s.now(), current.User.ID, "", "staff.invited", result.ID, map[string]string{"portal": string(input.Portal), "role": input.Role})
	})
	return result, err
}

// PrepareOwner creates the single initial admin identity through the trusted CLI.
// Email verification and mandatory MFA still happen on the admin portal before
// BootstrapOwner can grant the owner role. No customer signup or factor copying
// is involved and no email is sent by this operation.
func (s *Service) PrepareOwner(ctx context.Context, email, operator string) (result *ent.User, err error) {
	email, err = NormalizeEmail(email)
	if err != nil || !regexp.MustCompile(`^[A-Za-z0-9_.@-]{3,64}$`).MatchString(operator) {
		return nil, ErrInvalid
	}
	err = s.transaction(ctx, func(tx *ent.Tx) error {
		if e := lockSecurity(ctx, tx); e != nil {
			return e
		}
		accounts, e := tx.User.Query().Where(user.PortalEQ(string(PortalAdmin))).Limit(2).All(ctx)
		if e != nil {
			return e
		}
		if len(accounts) > 0 {
			if len(accounts) == 1 && accounts[0].Email == email && accounts[0].Role == RoleAdmin && !accounts[0].Suspended && accounts[0].DeletedAt == nil {
				result = accounts[0]
				return nil
			}
			return ErrConflict
		}
		result, e = tx.User.Create().SetPortal(string(PortalAdmin)).SetEmail(email).SetRole(RoleAdmin).Save(ctx)
		if e != nil {
			return e
		}
		return audit(ctx, tx, s.now(), "", "cli:"+operator, "owner.prepared", result.ID, map[string]string{"portal": string(PortalAdmin)})
	})
	return result, err
}

// pendingMigratedCustomer permits first verification only for an untouched,
// deterministic customer clone from migration 41. It never aliases a staff
// account, accepts email equality alone, or transfers a Google/MFA factor.
func pendingMigratedCustomer(ctx context.Context, tx *ent.Tx, account *ent.User) (bool, error) {
	if !PortalCustomer.permitsUser(account) || account.Suspended || account.DeletedAt != nil || account.EmailVerifiedAt != nil || account.MfaEnabled || len(account.MfaSecret) != 0 || len(account.MfaPending) != 0 || len(account.MfaRecoveryHashes) != 0 {
		return false, ErrConflict
	}
	original, err := legacyCustomerOriginal(ctx, tx, account.ID)
	return original != "", err
}

// IndependentReviewConflict preserves denial-only separation of duties across
// account namespaces. It must never be used as a sign-in or permission alias.
// Verified mailbox equality and exact migration ancestry stay private.
func IndependentReviewConflict(ctx context.Context, tx *ent.Tx, actor, counterpart *ent.User) (bool, error) {
	if actor.ID == counterpart.ID {
		return true, nil
	}
	if actor.EmailVerifiedAt != nil && counterpart.EmailVerifiedAt != nil {
		actorEmail, err := NormalizeEmail(actor.Email)
		if err != nil {
			return false, err
		}
		counterpartEmail, err := NormalizeEmail(counterpart.Email)
		if err != nil {
			return false, err
		}
		if actorEmail == counterpartEmail {
			return true, nil
		}
	}
	if counterpart.Portal != string(PortalCustomer) {
		return false, nil
	}
	original, err := legacyCustomerOriginal(ctx, tx, counterpart.ID)
	return original != "" && original == actor.ID, err
}

func legacyCustomerOriginal(ctx context.Context, tx *ent.Tx, customerID string) (_ string, result error) {
	rows, err := tx.QueryContext(ctx, "SELECT original_id FROM identity_namespace_splits WHERE customer_id=?", customerID)
	if err != nil {
		return "", err
	}
	defer func() { result = errors.Join(result, rows.Close()) }()
	original := ""
	if rows.Next() {
		if err = rows.Scan(&original); err != nil {
			return "", err
		}
		expected, deriveErr := LegacyCustomerID(original)
		if deriveErr != nil || expected != customerID {
			return "", ErrInvalid
		}
	}
	return original, rows.Err()
}
