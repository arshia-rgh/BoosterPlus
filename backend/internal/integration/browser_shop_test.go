//go:build integration && browsertest

package integration

import (
	"testing"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

// Shop fixtures are isolated commercial examples, never installed by runtime seeds.
func seedBrowserShop(t *testing.T, f *authFixture, fixtures map[string]string) {
	t.Helper()
	for _, project := range []string{"desktop", "mobile"} {
		c := catalogConfig()
		c.Name = "Shop fixture game"
		c.Discovery = &catalog.Discovery{Capabilities: catalog.Capabilities(c, false)}
		for i := range c.Discovery.Capabilities {
			if c.Discovery.Capabilities[i].Service == "shop" {
				c.Discovery.Capabilities[i].State = "active"
			}
		}
		game, err := f.client.Game.Create().SetSlug("shop-" + project + "-" + uuid.NewString()).SetName(c.Name).SetConfiguration(fixtureDocument(t, c)).Save(t.Context())
		if err != nil {
			t.Fatal(err)
		}
		release, err := f.client.CatalogRelease.Create().SetGameID(game.ID).SetVersion(1).SetConfiguration(fixtureDocument(t, c)).SetCreatedBy(fixtures[project+"_shopworker_id"]).Save(t.Context())
		if err != nil {
			t.Fatal(err)
		}
		if _, err = f.client.Game.UpdateOne(game).SetPublished(true).SetCurrentRelease(release.ID).Save(t.Context()); err != nil {
			t.Fatal(err)
		}
		definition := shopDefinition()
		definition.Asset = "/catalog-assets/game-placeholder.svg"
		data := fixtureDocument(t, definition)
		product, err := f.client.ShopProduct.Create().SetSlug("fixture-" + project).SetGameID(game.ID).SetGameName(c.Name).SetTitle(definition.Title).SetDraft(data).SetState("published").Save(t.Context())
		if err != nil {
			t.Fatal(err)
		}
		published, err := f.client.ShopProductRelease.Create().SetProductID(product.ID).SetVersion(1).SetData(data).Save(t.Context())
		if err != nil {
			t.Fatal(err)
		}
		if _, err = f.client.ShopProduct.UpdateOne(product).SetCurrentRelease(published.ID).Save(t.Context()); err != nil {
			t.Fatal(err)
		}
		v := definition.Variants[0]
		if _, err = f.client.ShopStock.Create().SetProductID(product.ID).SetReleaseID(published.ID).SetVariantKey(v.Key).SetEnabled(true).SetLabel(v.Label).SetRegion(v.Region).SetPlatform(v.Platform).SetServer(v.Server).SetCurrency(v.Currency).SetUnitAmountMinor(1234).SetMinQuantity(v.MinQuantity).SetMaxQuantity(v.MaxQuantity).SetTotal(8).Save(t.Context()); err != nil {
			t.Fatal(err)
		}
		fixtures[project+"_shop_slug"] = game.Slug
		fixtures[project+"_shop_product"] = product.ID
	}
}
