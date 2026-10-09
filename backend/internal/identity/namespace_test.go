package identity

import (
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
)

func TestIndependentNamespaceCannotBorrowRoleOrSession(t *testing.T) {
	now := time.Now()
	for _, account := range []Portal{PortalCustomer, PortalAdmin, PortalBooster} {
		role := map[Portal]string{PortalCustomer: RoleCustomer, PortalAdmin: RoleOwner, PortalBooster: RoleBooster}[account]
		for _, session := range []Portal{PortalCustomer, PortalAdmin, PortalBooster} {
			p := &Principal{User: &ent.User{Portal: string(account), Role: role}, Session: &ent.AuthSession{Portal: string(session), MfaVerifiedAt: &now}}
			err := Require(p, "self")
			if account != session && !errors.Is(err, ErrForbidden) || account == session && err != nil {
				t.Fatalf("account=%s session=%s: %v", account, session, err)
			}
		}
	}
}

func TestLegacyCustomerDerivationIsCanonicalAndStable(t *testing.T) {
	original := "b457d178-3944-4cbe-8c08-5ad9e275e823"
	first, err := LegacyCustomerID(original)
	if err != nil {
		t.Fatal(err)
	}
	second, err := LegacyCustomerID(original)
	if err != nil || first != second || first == original {
		t.Fatal("unstable or nonseparate migration mapping", err)
	}
	if parsed, parseErr := uuid.Parse(first); parseErr != nil || parsed.String() != first {
		t.Fatal("invalid migrated UUID", parseErr)
	}
	for _, invalid := range []string{"", "legacy", "urn:uuid:" + original, "B457D178-3944-4CBE-8C08-5AD9E275E823", " " + original} {
		if _, err := LegacyCustomerID(invalid); !errors.Is(err, ErrInvalid) {
			t.Fatal("noncanonical migration identity accepted", invalid, err)
		}
	}
}
