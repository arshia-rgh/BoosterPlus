//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func TestAdminQueueContextRemainsStaffOnly(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	request := f.create(t, "custom")
	purchase := f.create(t, "package")
	staff, err := f.store.List(ctx, f.admin, true, "", "", "")
	if err != nil || len(staff.Orders) != 2 {
		t.Fatal("staff queue", err)
	}
	for _, item := range staff.Orders {
		if item.Staff == nil || item.Staff.CustomerID != f.buyer.User.ID || item.Staff.AssignedID != "" {
			t.Fatal("incorrect internal queue references")
		}
		if item.ID == request.Order.ID && item.Staff.PaymentState != "no_agreement" {
			t.Fatal("request invented a payment")
		}
		if item.ID == purchase.Order.ID && item.Staff.PaymentState != purchase.Contract.PaymentState {
			t.Fatal("queue payment must match current agreement")
		}
	}
	customer, err := f.store.List(ctx, f.buyer, false, "", "", "")
	if err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(customer)
	if err != nil {
		t.Fatal(err)
	}
	for _, field := range []string{"customer_id", "assigned_id", "payment_state", "\"staff\""} {
		if strings.Contains(string(raw), field) {
			t.Fatal("staff queue data exposed to customer", field)
		}
	}
	if _, err = f.auth.client.User.UpdateOneID(f.admin.User.ID).SetSuspended(true).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.store.List(ctx, f.admin, true, "", "", ""); err == nil {
		t.Fatal("stale staff authority retained queue")
	}
}

func TestDirectoryRoleFiltersAndPortalProjection(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	for _, role := range []string{"customer", "booster", "administrator", "owner"} {
		page, err := f.auth.service.Directory(ctx, f.admin, identity.UserQuery{Role: role})
		if err != nil {
			t.Fatal(err)
		}
		for _, person := range page.Users {
			if person.Role != role {
				t.Fatal("role filter mismatch")
			}
		}
	}
	page, err := f.auth.service.Directory(ctx, f.admin, identity.UserQuery{Role: "customer", Search: f.buyer.User.Email, State: "active"})
	if err != nil || len(page.Users) != 1 || page.Users[0].ID != f.buyer.User.ID {
		t.Fatal("role/search/state intersection", err)
	}
	if _, err = f.auth.service.Directory(ctx, f.admin, identity.UserQuery{Role: "invalid"}); !errors.Is(err, identity.ErrInvalid) {
		t.Fatal("unknown role allowed", err)
	}
	if _, err = f.auth.service.Directory(ctx, f.buyer, identity.UserQuery{Role: "owner"}); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer inspected owner directory", err)
	}
	sessions, err := f.auth.service.UserSessions(ctx, f.admin, f.buyer.User.ID)
	if err != nil || len(sessions) != 1 || sessions[0]["portal"] != "customer" {
		t.Fatal("session portal metadata", err)
	}
}
