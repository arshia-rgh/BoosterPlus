package identity

import (
	"errors"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
)

func TestActionVerificationRequiresCompletedSignInAndEitherFreshFactor(t *testing.T) {
	now := time.Date(2026, time.October, 9, 0, 0, 0, 0, time.UTC)
	stale := now.Add(-RecentTTL)
	s := &Service{now: func() time.Time { return now }}
	for _, tc := range []struct {
		name, role string
		portal     Portal
		enrolled   bool
		primary    time.Time
		mfa        *time.Time
		want       error
	}{
		{"admin primary only after MFA", RoleAdmin, PortalAdmin, true, now, &stale, nil},
		{"admin authenticator only", RoleAdmin, PortalAdmin, true, stale, &now, nil},
		{"admin both stale", RoleAdmin, PortalAdmin, true, stale, &stale, ErrRecent},
		{"admin email cannot finish sign-in", RoleAdmin, PortalAdmin, true, now, nil, ErrMFA},
		{"owner must finish sign-in", RoleOwner, PortalAdmin, true, now, nil, ErrMFA},
		{"booster authenticator only", RoleBooster, PortalBooster, true, stale, &now, nil},
		{"booster email only after MFA", RoleBooster, PortalBooster, true, now, &stale, nil},
		{"customer email only", RoleCustomer, PortalCustomer, false, now, nil, nil},
		{"customer stale email", RoleCustomer, PortalCustomer, false, stale, nil, ErrRecent},
		{"enrolled customer pending", RoleCustomer, PortalCustomer, true, now, nil, ErrMFA},
		{"enrolled customer email renewal", RoleCustomer, PortalCustomer, true, now, &stale, nil},
		{"enrolled customer authenticator renewal", RoleCustomer, PortalCustomer, true, stale, &now, nil},
		{"wrong realm", RoleAdmin, PortalCustomer, true, now, &now, ErrForbidden},
	} {
		t.Run(tc.name, func(t *testing.T) {
			p := &Principal{User: &ent.User{Role: tc.role, Portal: string(tc.portal), MfaEnabled: tc.enrolled},
				Session: &ent.AuthSession{Portal: string(tc.portal), AuthenticatedAt: tc.primary, MfaVerifiedAt: tc.mfa}}
			if err := s.sensitive(p); !errors.Is(err, tc.want) {
				t.Fatalf("action verification: got %v, want %v", err, tc.want)
			}
		})
	}
	for _, p := range []*Principal{nil, {}, {User: &ent.User{}}, {Session: &ent.AuthSession{}}} {
		if !errors.Is(s.sensitive(p), ErrUnauthenticated) {
			t.Fatal("incomplete principal must not verify an action")
		}
	}
}
