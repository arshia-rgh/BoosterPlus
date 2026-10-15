//go:build integration

package integration

import (
	"errors"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func TestCustomerLongSessionKeepsStaffAndSensitiveBoundaries(t *testing.T) {
	f := authDB(t, nil)
	ctx := t.Context()
	token, customer := f.login(t, "long-customer@example.test")
	originalExpiry := customer.Session.ExpiresAt
	if originalExpiry.Sub(customer.Session.CreatedAt) != 90*24*time.Hour {
		t.Fatal("customer absolute lifetime")
	}
	_, admin := f.staffLogin(t, "short-admin@example.test", identity.RoleAdmin)
	_, _, adminToken, admin := f.enrollToken(t, admin)
	_, booster := f.staffLogin(t, "short-booster@example.test", identity.RoleBooster)
	_, _, boosterToken, booster := f.enrollToken(t, booster)
	if admin.Session.ExpiresAt.Sub(admin.Session.CreatedAt) != 12*time.Hour || booster.Session.ExpiresAt.Sub(booster.Session.CreatedAt) != 12*time.Hour {
		t.Fatal("staff absolute lifetime changed")
	}
	f.clock.Add(1801)
	customer = f.principal(t, token)
	if _, err := f.service.Recheck(ctx, customer, "account"); err != nil {
		t.Fatal("customer transaction idle policy", err)
	}
	if err := f.service.RecentAccountTransaction(ctx, customer, func(*ent.Tx, *identity.Principal) error { return nil }); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("long session bypassed recent verification", err)
	}
	for portal, tok := range map[identity.Portal]string{identity.PortalAdmin: adminToken, identity.PortalBooster: boosterToken} {
		if _, err := f.service.Authenticate(ctx, tok, portal); !errors.Is(err, identity.ErrUnauthenticated) {
			t.Fatal("staff idle limit changed", portal, err)
		}
	}
	for range 4 {
		f.clock.Add(int64(20 * 24 * time.Hour / time.Second))
		customer = f.principal(t, token)
		if !customer.Session.ExpiresAt.Equal(originalExpiry) {
			t.Fatal("activity extended absolute expiry")
		}
		rows, err := f.service.Sessions(ctx, customer)
		if err != nil || len(rows) != 1 {
			t.Fatal("active customer missing from sessions", err)
		}
	}
	f.clock.Store(originalExpiry.Unix())
	if _, err := f.service.Authenticate(ctx, token, identity.PortalCustomer); !errors.Is(err, identity.ErrUnauthenticated) {
		t.Fatal("absolute expiry ignored", err)
	}
	idleToken, idle := f.login(t, "idle-customer@example.test")
	f.clock.Add(int64(30 * 24 * time.Hour / time.Second))
	if _, err := f.service.Authenticate(ctx, idleToken, identity.PortalCustomer); !errors.Is(err, identity.ErrUnauthenticated) {
		t.Fatal("idle expiry ignored", err)
	}
	if _, err := f.service.Recheck(ctx, idle, "account"); !errors.Is(err, identity.ErrUnauthenticated) {
		t.Fatal("expired transaction admitted", err)
	}
}
