//go:build integration

package integration

import (
	"errors"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func TestReviewedPlaceholderGamesPublishWithoutServices(t *testing.T) {
	f := authDB(t, nil)
	ctx := t.Context()
	staff := catalogAdmin(t, f)
	_, customer := f.login(t, "placeholder-customer@example.test")
	store := catalog.New(f.client, f.service)
	list, err := store.StaffList(ctx, staff, catalog.StaffFilters{State: "draft"})
	if err != nil {
		t.Fatal(err)
	}
	published := 0
	for _, row := range list.Games {
		if row.Slug == "mobile-legends" {
			continue
		}
		draft, draftErr := store.Draft(ctx, staff, row.ID)
		if draftErr != nil {
			t.Fatal(draftErr)
		}
		if _, denied := store.Mutate(ctx, customer, draft.ID, "publish", catalog.Change{Revision: draft.Revision}); !errors.Is(denied, identity.ErrForbidden) {
			t.Fatal("customer publication", denied)
		}
		config := draft.Configuration
		config.Reviewed = true
		config.Description = "Services are not available yet."
		saved, saveErr := store.Mutate(ctx, staff, draft.ID, "save", catalog.Change{Revision: draft.Revision, Configuration: config})
		if saveErr != nil {
			t.Fatal(saveErr)
		}
		if _, publishErr := store.Mutate(ctx, staff, saved.ID, "publish", catalog.Change{Revision: saved.Revision}); publishErr != nil {
			t.Fatal(publishErr)
		}
		release, readErr := store.Published(ctx, draft.Slug)
		if readErr != nil || release.Configuration.Asset != config.Asset || release.Configuration.Intake != nil || len(release.Configuration.Services)+len(release.Configuration.Packages) != 0 {
			t.Fatal("placeholder release", readErr)
		}
		view, viewErr := store.DiscoveryProjection(ctx, draft.Slug, time.Now())
		if viewErr != nil || len(view.Capabilities) != 4 || len(view.Promotions) != 0 {
			t.Fatal("placeholder discovery", viewErr)
		}
		for _, capability := range view.Capabilities {
			if capability.State != "off" || catalog.Available(release.Configuration, false, capability.Service) {
				t.Fatal("placeholder enabled service")
			}
		}
		published++
	}
	public, err := store.List(ctx, nil, false, "")
	if err != nil || published != 5 || len(public.Games) != 5 {
		t.Fatal("visible placeholder games", published, err)
	}
	for _, game := range public.Games {
		if game.IntakeEnabled || len(game.Capabilities) != 4 {
			t.Fatal("placeholder intake enabled")
		}
		for _, capability := range game.Capabilities {
			if capability.State != "off" {
				t.Fatal("listing activated a service")
			}
		}
	}
	if _, err = store.Published(ctx, "mobile-legends"); err == nil {
		t.Fatal("unreviewed MLBB draft published")
	}
}
