//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"fmt"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func TestCatalogStaffDiscoveryBeforePaginationAndAuthority(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	for i := range 54 {
		c := catalogConfig()
		c.Name = fmt.Sprintf("Discovery fixture %03d", i)
		if i == 53 {
			c.Name = "Literal%needle"
		}
		raw, err := json.Marshal(c)
		if err != nil {
			t.Fatal(err)
		}
		var data map[string]any
		if err = json.Unmarshal(raw, &data); err != nil {
			t.Fatal(err)
		}
		if _, err = f.auth.client.Game.Create().SetSlug(fmt.Sprintf("zz-discovery-%03d", i)).SetName(c.Name).SetConfiguration(data).Save(ctx); err != nil {
			t.Fatal(err)
		}
	}
	first, err := f.catalog.StaffList(ctx, f.admin, catalog.StaffFilters{Search: "Discovery", State: "draft"})
	if err != nil || len(first.Games) != 50 || first.Next == "" {
		t.Fatal("first catalog page", err)
	}
	second, err := f.catalog.StaffList(ctx, f.admin, catalog.StaffFilters{Search: "Discovery", State: "draft", After: first.Next})
	if err != nil || len(second.Games) != 4 || second.Next != "" {
		t.Fatal("remaining catalog page", err)
	}
	literal, err := f.catalog.StaffList(ctx, f.admin, catalog.StaffFilters{Search: "%"})
	if err != nil || len(literal.Games) != 1 || literal.Games[0].Name != "Literal%needle" {
		t.Fatal("literal discovery", err)
	}
	if _, err = f.catalog.StaffList(ctx, f.buyer, catalog.StaffFilters{}); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer draft discovery", err)
	}
	if _, err = f.catalog.StaffList(ctx, f.admin, catalog.StaffFilters{State: "missing"}); err == nil {
		t.Fatal("invalid state")
	}
	owner := privacyOwner(t, f)
	if err = f.auth.service.RevokeUserSessions(ctx, owner, owner.User.ID); err != nil {
		t.Fatal(err)
	}
	if _, err = f.catalog.StaffList(ctx, owner, catalog.StaffFilters{}); err == nil {
		t.Fatal("revoked staff draft discovery")
	}
}
