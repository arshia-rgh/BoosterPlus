//go:build integration && browsertest

package integration

import (
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

// Presentation-only published catalogs live solely in the browser test database.
// They are never deployed, and their synthetic prices are not business defaults.
func seedBrowserDiscovery(t *testing.T, f *authFixture, fixtures map[string]string) {
	t.Helper()
	profiles := []struct {
		key, name, ext, side string
		x, mobile            int
	}{
		{"mlbb", "Mobile Legends", "jpg", "left", 75, 85},
		{"wow", "World of Warcraft", "jpg", "right", 18, 5},
		{"lol", "League of Legends", "jpg", "left", 65, 65},
		{"valorant", "VALORANT", "png", "left", 57, 57},
		{"dota", "Dota 2", "jpg", "left", 53, 53},
		{"wildrift", "Wild Rift", "jpg", "left", 67, 67},
	}
	for _, project := range []string{"desktop", "mobile"} {
		for _, profile := range profiles {
			c := catalogConfig()
			c.Name = profile.name
			c.Description = "A new chapter in your game. Explore the services available for your next goal."
			c.Asset = "/catalog-assets/game-" + profile.key + "-1536." + profile.ext
			c.AssetAlt = profile.name + " game artwork"
			c.HeroLayout = &catalog.HeroLayout{CopySide: profile.side, DesktopX: profile.x, DesktopY: 20, MobileX: profile.mobile, MobileY: 20}
			c.FAQs = []catalog.FAQ{{Question: "How do I choose a service?", Answer: "Choose a service below the game introduction. Review its exact scope and terms before continuing."}}
			c.Discovery = &catalog.Discovery{Capabilities: catalog.Capabilities(c, false), Promotions: []catalog.Promotion{{Key: "featured", Title: "Featured package", Description: "Synthetic limited-time package for browser qualification.", Enabled: true, Target: "package", Package: "pack", Variant: "basic", StartsAt: time.Now().Add(-time.Hour), EndsAt: time.Now().Add(time.Hour)}}}
			row, err := f.client.Game.Create().SetSlug("discovery-" + profile.key + "-" + project + "-" + uuid.NewString()).SetName(c.Name).SetConfiguration(fixtureDocument(t, c)).Save(t.Context())
			if err != nil {
				t.Fatal(err)
			}
			release, err := f.client.CatalogRelease.Create().SetGameID(row.ID).SetVersion(1).SetConfiguration(fixtureDocument(t, c)).SetCreatedBy(fixtures[project+"_workadmin_id"]).Save(t.Context())
			if err != nil {
				t.Fatal(err)
			}
			if _, err = f.client.Game.UpdateOneID(row.ID).SetCurrentRelease(release.ID).SetPublished(true).SetPaused(profile.key == "wildrift").Save(t.Context()); err != nil {
				t.Fatal(err)
			}
			fixtures[project+"_discovery_"+profile.key] = row.Slug
		}
	}
}
