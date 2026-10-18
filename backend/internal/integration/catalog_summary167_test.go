//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resale"
)

func TestSameBaseSurchargePublicationPreservesHistoricalRelease(t *testing.T) {
	f := authDB(t, nil)
	p := catalogAdmin(t, f)
	store := catalog.New(f.client, f.service)
	c := catalogConfig()
	c.Services[0].Evaluator = "pricing-v1"
	a := catalog.Answers{"mode": json.RawMessage(`"solo"`)}
	c.Services[0].Pricing = &catalog.PricePlan{Currency: "USD", BaseMinor: "2000", MinimumMinor: "1", MaximumMinor: "999999", Rules: []catalog.PriceRule{}, Cases: []catalog.PriceCase{{Key: "base", Answers: a, Outcome: "estimated", AmountMinor: "2000"}}}
	d, err := store.Create(t.Context(), p, "same-base", c)
	if err != nil {
		t.Fatal(err)
	}
	d, err = store.Mutate(t.Context(), p, d.ID, "publish", catalog.Change{Revision: d.Revision})
	if err != nil {
		t.Fatal(err)
	}
	old, err := store.Published(t.Context(), d.Slug)
	if err != nil {
		t.Fatal(err)
	}
	c.Services[0].Pricing.Surcharges = []catalog.PriceSurcharge{{Key: "win", Label: "Win rate", Kind: "percentage", Value: "200"}, {Key: "hero", Label: "One hero", Kind: "percentage", Value: "50"}, {Key: "delivery", Label: "Within 24 hours", Kind: "percentage", Value: "25"}}
	c.Services[0].Pricing.Cases[0].AmountMinor = "7500"
	d, err = store.Mutate(t.Context(), p, d.ID, "save", catalog.Change{Revision: d.Revision, Configuration: c})
	if err != nil {
		t.Fatal(err)
	}
	view, err := store.Published(t.Context(), d.Slug)
	if err != nil {
		t.Fatal(err)
	}
	if got := catalog.CalculateNew(view, "boost", a, time.Now()); got.AmountMinor != "2000" {
		t.Fatal("unpublished premiums leaked", got)
	}
	if _, err = store.Mutate(t.Context(), p, d.ID, "publish", catalog.Change{Revision: d.Revision}); err != nil {
		t.Fatal(err)
	}
	view, err = store.Published(t.Context(), d.Slug)
	if err != nil {
		t.Fatal(err)
	}
	if got := catalog.CalculateNew(view, "boost", a, time.Now()); got.AmountMinor != "7500" || len(view.Configuration.Services[0].Pricing.Surcharges) != 3 {
		t.Fatal("same-base premiums lost in persistence", got)
	}
	if got := catalog.CalculateNew(old, "boost", a, time.Now()); got.AmountMinor != "2000" {
		t.Fatal("historical release changed", got)
	}
}

func TestReviewedAccountSummaryPersistsWithoutChangingAcceptedPurchase(t *testing.T) {
	f := resaleDB(t, "consignment")
	p := resaleProduct()
	heroes := 125
	p.HeroCount = &heroes
	p.SellingPoint = "Collector skins for EXP mains."
	p.SkinCollection = &catalog.CosmeticCollection{Groups: []catalog.CosmeticGroup{{Category: "Collector", Count: "2", Names: []string{"Aldous", "Yu Zhong"}}}}
	v, err := f.resale.ChangeListing(t.Context(), f.base.admin, f.listing.ID, "publish", resale.ListingInput{Version: f.listing.Version, Product: p, PublicReviewed: true})
	if err != nil {
		t.Fatal(err)
	}
	f.listing = v
	public, err := f.resale.Published(t.Context(), v.ID)
	if err != nil {
		t.Fatal(err)
	}
	if public.Product.HeroCount == nil || *public.Product.HeroCount != 125 || public.Product.SellingPoint != p.SellingPoint || public.Product.SkinCollection.Groups[0].Names[1] != "Yu Zhong" {
		t.Fatal("public summary lost", public)
	}
	// Unpublished edits must not leak into the buyer's accepted release.
	p.SellingPoint = "Unpublished replacement"
	v, err = f.resale.ChangeListing(t.Context(), f.base.admin, v.ID, "save", resale.ListingInput{Version: v.Version, Product: p})
	if err != nil {
		t.Fatal(err)
	}
	f.listing = v
	purchase := f.reserve(t)
	if _, err = f.resale.ChangeListing(t.Context(), f.base.admin, v.ID, "save", resale.ListingInput{Version: v.Version, Product: p}); !errors.Is(err, resale.ErrConflict) {
		t.Fatal("reserved listing remained editable", err)
	}
	row, err := f.base.auth.client.Order.Get(t.Context(), purchase.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(row.AccountSnapshot)
	if err != nil {
		t.Fatal(err)
	}
	var accepted resale.PublicListing
	if err = json.Unmarshal(raw, &accepted); err != nil {
		t.Fatal(err)
	}
	if accepted.Product.SellingPoint != "Collector skins for EXP mains." || accepted.Product.HeroCount == nil || *accepted.Product.HeroCount != 125 || len(accepted.Product.SkinCollection.Groups[0].Names) != 2 {
		t.Fatal("purchase summary changed", accepted)
	}
}
