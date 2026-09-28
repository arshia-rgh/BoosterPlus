//go:build integration && browsertest

package integration

import (
	"fmt"
	"testing"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

// Shop fixtures are isolated commercial examples, never installed by runtime seeds.
func seedBrowserShop(t *testing.T, f *authFixture, fixtures map[string]string) {
	t.Helper()
	for projectIndex, project := range []string{"desktop", "mobile"} {
		for _, purpose := range []string{"", "offers-"} {
			c := catalogConfig()
			c.Name = "Shop fixture game"
			c.Discovery = &catalog.Discovery{Capabilities: catalog.Capabilities(c, false)}
			for i := range c.Discovery.Capabilities {
				if c.Discovery.Capabilities[i].Service == "shop" {
					c.Discovery.Capabilities[i].State = "active"
				}
			}
			game, err := f.client.Game.Create().SetSlug("shop-" + purpose + project + "-" + uuid.NewString()).SetName(c.Name).SetConfiguration(fixtureDocument(t, c)).Save(t.Context())
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
			productID := uuid.NewString()
			if purpose != "" {
				productID = fmt.Sprintf("ffffffff-ffff-4fff-8fff-%012d", projectIndex+1)
			}
			product, err := f.client.ShopProduct.Create().SetID(productID).SetSlug("fixture-" + project).SetGameID(game.ID).SetGameName(c.Name).SetTitle(definition.Title).SetDraft(data).SetState("published").Save(t.Context())
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
			if purpose != "" {
				for i := range 50 {
					alternateID := fmt.Sprintf("0000000%d-0000-4000-8000-%012d", projectIndex+1, i+1)
					title := fmt.Sprintf("Synthetic alternate item %d", i+1)
					alternate, e := f.client.ShopProduct.Create().SetID(alternateID).SetSlug(fmt.Sprintf("fixture-alternate-%d", i+1)).SetGameID(game.ID).SetGameName(c.Name).SetTitle(title).SetDraft(data).SetState("published").Save(t.Context())
					if e != nil {
						t.Fatal(e)
					}
					copyDefinition := definition
					copyDefinition.Title = title
					copyRelease, e := f.client.ShopProductRelease.Create().SetProductID(alternate.ID).SetVersion(1).SetData(fixtureDocument(t, copyDefinition)).Save(t.Context())
					if e != nil {
						t.Fatal(e)
					}
					if _, e = f.client.ShopProduct.UpdateOne(alternate).SetCurrentRelease(copyRelease.ID).Save(t.Context()); e != nil {
						t.Fatal(e)
					}
				}
			}
			fixtures[project+"_"+purpose+"shop_slug"] = game.Slug
			fixtures[project+"_"+purpose+"shop_product"] = product.ID
		}
	}
}
