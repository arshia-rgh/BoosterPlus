//go:build integration

package integration

import (
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/shop"
)

func TestShopSortingAcrossPagesAndReleasedRegions(t *testing.T) {
	f, store, _, _ := shopPurchaseFixture(t)
	ctx := t.Context()
	add := func(title, region, category, price string, paused bool) {
		t.Helper()
		value := shopDefinition()
		value.Title = title
		value.Category = category
		value.Variants[0].Region = region
		value.Variants[0].UnitAmountMinor = price
		state := "published"
		if paused {
			state = "paused"
		}
		row, err := f.base.auth.client.ShopProduct.Create().SetGameID(f.base.game.ID).SetSlug(uuid.NewString()).SetGameName(f.base.game.Configuration.Name).SetTitle("Private draft 999999 diamonds").SetDraft(shopPurchaseDocument(t, shopDefinition())).SetState(state).Save(ctx)
		if err != nil {
			t.Fatal(err)
		}
		release, err := f.base.auth.client.ShopProductRelease.Create().SetProductID(row.ID).SetVersion(1).SetData(shopPurchaseDocument(t, value)).Save(ctx)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = f.base.auth.client.ShopProduct.UpdateOne(row).SetCurrentRelease(release.ID).Save(ctx); err != nil {
			t.Fatal(err)
		}
	}
	for _, region := range []string{"Indonesia", "Global", "Russia"} {
		for count := 72; count > 0; count-- {
			add(fmt.Sprintf("%d Diamonds · %s", count, region), region, "Sorting", fmt.Sprint(count*100), false)
		}
	}
	add("Weekly Pass · Global", "Global", "Sorting", "1", false)
	add("Weekly Pass · Indonesia", "Indonesia", "Sorting", "2", false)
	add("Elite Bundle · Global", "Global", "Sorting", "3", false)
	add("99999 Diamonds · Global", "Global", "Sorting", "1", true)
	input := shop.BrowseInput{Slug: f.base.game.Slug, Category: "Sorting", Method: "manual"}
	var all []shop.PublicProduct
	seen := map[string]bool{}
	firstCursor := ""
	for {
		page, err := store.Browse(ctx, input)
		if err != nil {
			t.Fatal(err)
		}
		for _, item := range page.Items {
			if seen[item.ID] {
				t.Fatal("duplicate page item")
			}
			seen[item.ID] = true
			all = append(all, item)
		}
		if firstCursor == "" {
			firstCursor = page.Next
		}
		if page.Next == "" {
			break
		}
		if len(all) > 219 {
			t.Fatal("non-terminating pagination")
		}
		input.After = page.Next
	}
	if len(all) != 219 {
		t.Fatalf("got %d products", len(all))
	}
	for group, region := range []string{"Global", "Indonesia", "Russia"} {
		for count := 1; count <= 72; count++ {
			want := fmt.Sprintf("%d Diamonds · %s", count, region)
			if all[group*72+count-1].Definition.Title != want {
				t.Fatalf("wrong order at %d: %s", group*72+count-1, all[group*72+count-1].Definition.Title)
			}
		}
	}
	if all[216].Definition.Title != "Weekly Pass · Global" || all[217].Definition.Title != "Weekly Pass · Indonesia" || all[218].Definition.Title != "Elite Bundle · Global" {
		t.Fatal("non-diamonds displaced diamonds")
	}
	input.After = ""
	input.Sort = "diamonds_desc"
	input.Region = "Indonesia"
	page, err := store.Browse(ctx, input)
	if err != nil || len(page.Items) != 50 || page.Items[0].Definition.Title != "72 Diamonds · Indonesia" {
		t.Fatal("filtered descending order", err)
	}
	input.After = page.Next
	page, err = store.Browse(ctx, input)
	if err != nil || len(page.Items) != 23 || !strings.HasPrefix(page.Items[22].Definition.Title, "Weekly Pass") {
		t.Fatal("pass not after final diamond", err)
	}
	input.After = ""
	input.Region = ""
	input.Sort = "price_asc"
	page, err = store.Browse(ctx, input)
	if err != nil || page.Items[0].Definition.Title != "Weekly Pass · Global" || page.Items[2].Definition.Title != "Elite Bundle · Global" {
		t.Fatal("price must override category and region", err)
	}
	input.Sort = "price_desc"
	page, err = store.Browse(ctx, input)
	if err != nil || page.Items[0].Definition.Variants[0].UnitAmountMinor != "7200" {
		t.Fatal("descending price", err)
	}
	input.After = firstCursor
	if _, err = store.Browse(ctx, input); !errors.Is(err, shop.ErrInvalid) {
		t.Fatal("cross-sort cursor accepted", err)
	}
	input.Sort = ""
	input.After = all[0].ID
	page, err = store.Browse(ctx, input)
	if err != nil || page.Items[0].Definition.Title != "2 Diamonds · Global" {
		t.Fatal("legacy bookmark", err)
	}
	input.After = ""
	input.Sort = "unsupported"
	if _, err = store.Browse(ctx, input); !errors.Is(err, shop.ErrInvalid) {
		t.Fatal("unsupported sort", err)
	}
	orders, err := f.base.auth.client.Order.Query().Count(ctx)
	if err != nil || orders != 0 {
		t.Fatal("sorting created an order", err)
	}
}
