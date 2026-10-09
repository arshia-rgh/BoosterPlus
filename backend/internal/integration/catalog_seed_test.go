//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"os"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func TestInstallationCatalogDraftsArePrivateAndUseExistingArtwork(t *testing.T) {
	f := authDB(t, nil)
	ctx := t.Context()
	staff := catalogAdmin(t, f)
	store := catalog.New(f.client, f.service)
	listing, err := store.StaffList(ctx, staff, catalog.StaffFilters{State: "draft"})
	if err != nil || len(listing.Games) != 6 {
		t.Fatal("six installation drafts", listing, err)
	}
	expected := map[string]string{
		"mobile-legends": "mlbb-1536.jpg", "world-of-warcraft": "wow-1536.jpg",
		"league-of-legends": "lol-1536.jpg", "valorant": "valorant-1536.png",
		"dota-2": "dota-1536.jpg", "wild-rift": "wildrift-1536.jpg",
	}
	for _, row := range listing.Games {
		draft, draftErr := store.Draft(ctx, staff, row.ID)
		if draftErr != nil {
			t.Fatal(draftErr)
		}
		suffix, exists := expected[draft.Slug]
		c := draft.Configuration
		if !exists || c.Asset != "/catalog-assets/game-"+suffix || c.AssetAlt == "" || c.HeroLayout == nil || c.Reviewed || draft.Published || draft.Archived {
			t.Fatalf("unsafe or incomplete installation draft: %+v", draft)
		}
		if _, assetErr := os.Stat("../../../frontend/public" + c.Asset); assetErr != nil {
			t.Fatal("missing public artwork", assetErr)
		}
		if issues := catalog.ValidateConfiguration(c, false); len(issues) != 0 {
			t.Fatal("invalid editable draft", issues)
		}
		if issues := catalog.ValidateConfiguration(c, true); len(issues) == 0 {
			t.Fatal("unreviewed starter passed publication")
		}
		if _, publishErr := store.Mutate(ctx, staff, draft.ID, "publish", catalog.Change{Revision: draft.Revision}); publishErr == nil {
			t.Fatal("starter published")
		}
		if _, publicErr := store.Published(ctx, draft.Slug); publicErr == nil {
			t.Fatal("private draft leaked")
		}
		if draft.Slug != "mobile-legends" {
			if len(c.Services)+len(c.References)+len(c.Packages)+len(c.FAQs) != 0 {
				t.Fatal("invented game configuration")
			}
			for _, service := range catalog.Capabilities(c, false) {
				if service.State != "off" {
					t.Fatal("starter offers a service")
				}
			}
		}
	}
	public, err := store.List(ctx, nil, false, "")
	if err != nil || len(public.Games) != 0 {
		t.Fatal("starter visibility", err)
	}
	_, customer := f.login(t, "seed-customer@example.test")
	if _, err = store.StaffList(ctx, customer, catalog.StaffFilters{}); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer accessed drafts", err)
	}
	if err = runner(t, f.db).Apply(ctx, 0); err != nil {
		t.Fatal("repeat seed migration", err)
	}
}

func TestCatalogDraftUpgradePreservesOperatorWorkAndRollback(t *testing.T) {
	for _, published := range []bool{false, true} {
		name := "edited draft"
		if published {
			name = "published catalog"
		}
		t.Run(name, func(t *testing.T) {
			db := testDB(t)
			r := runner(t, db)
			ctx := t.Context()
			if err := r.Apply(ctx, 38); err != nil {
				t.Fatal(err)
			}
			executeSQL(t, db, `UPDATE games SET version=7,published=?,configuration=JSON_SET(configuration,'$.description','Owner-edited terms') WHERE slug='mobile-legends'`, published)
			executeSQL(t, db, `INSERT INTO games(id,slug,name,configuration,version,published,archived,current_release,created_at) VALUES ('existing-wow','world-of-warcraft','Owner catalog','{"owner":"data"}',9,?,TRUE,'existing-release',UTC_TIMESTAMP(6))`, published)
			query := "SELECT id,slug,name,configuration,version,published,paused,archived,current_release FROM games WHERE slug IN ('mobile-legends','world-of-warcraft') ORDER BY id"
			before := upgradeDigest(t, db, query)
			// Qualify the seed's own reversible boundary before migration 41.
			if err := r.Apply(ctx, 39); err != nil {
				t.Fatal(err)
			}
			if after := upgradeDigest(t, db, query); after != before {
				t.Fatal("migration overwrote operator work")
			}
			executeSQL(t, db, `UPDATE games SET version=2,configuration=JSON_SET(configuration,'$.description','Edited after seed') WHERE slug='valorant'`)
			all := "SELECT id,slug,name,configuration,version,published,paused,archived,current_release FROM games ORDER BY id"
			saved := upgradeDigest(t, db, all)
			if err := r.Down(ctx, 1); err != nil {
				t.Fatal(err)
			}
			if after := upgradeDigest(t, db, all); after != saved {
				t.Fatal("rollback removed or rewrote catalogs")
			}
			if err := r.Apply(ctx, 0); err != nil {
				t.Fatal(err)
			}
			if after := upgradeDigest(t, db, all); after != saved {
				t.Fatal("reapply rewrote retained drafts")
			}
			if err := database.Ready(ctx, db); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestCatalogSeedOnlyChangesUntouchedMLBBArtwork(t *testing.T) {
	db := testDB(t)
	r := runner(t, db)
	ctx := t.Context()
	if err := r.Apply(ctx, 38); err != nil {
		t.Fatal(err)
	}
	var original []byte
	if err := db.QueryRowContext(ctx, "SELECT configuration FROM games WHERE slug='mobile-legends'").Scan(&original); err != nil {
		t.Fatal(err)
	}
	var before catalog.Configuration
	if err := json.Unmarshal(original, &before); err != nil {
		t.Fatal(err)
	}
	if err := r.Apply(ctx, 0); err != nil {
		t.Fatal(err)
	}
	var updated []byte
	var revision int
	if err := db.QueryRowContext(ctx, "SELECT configuration,version FROM games WHERE slug='mobile-legends'").Scan(&updated, &revision); err != nil {
		t.Fatal(err)
	}
	var after catalog.Configuration
	if err := json.Unmarshal(updated, &after); err != nil {
		t.Fatal(err)
	}
	after.Asset, after.AssetAlt, after.HeroLayout = before.Asset, before.AssetAlt, before.HeroLayout
	beforeJSON, err := json.Marshal(before)
	if err != nil {
		t.Fatal(err)
	}
	afterJSON, err := json.Marshal(after)
	if err != nil {
		t.Fatal(err)
	}
	if string(beforeJSON) != string(afterJSON) || revision != 2 {
		t.Fatal("existing MLBB form changed or revision not advanced")
	}
}
