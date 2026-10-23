package shop

import (
	"fmt"
	"slices"
	"testing"
)

func TestShopDiamondQuantity(t *testing.T) {
	for _, tc := range []struct {
		title, category string
		kind            int
		count           int64
	}{
		{"54 Diamonds · Indonesia", "Diamonds", 0, 54},
		{"50 + 5 Diamonds (First Top-Up Bonus) · Philippines", "Bundles", 0, 55},
		{"First Recharge 1000 Diamonds (500 + 500) · Global", "Bundles", 0, 1000},
		{"9,288 Diamonds · Global", "Diamonds", 0, 9288},
		{"2845 Diamonds · Russia · Code", "Digital codes", 0, 2845},
		{"Weekly Diamond Pass 3x · Global", "Passes", 1, 0},
		{"Pass with 210 Diamonds", "Bundles", 1, 0},
		{"Monthly Elite Pack", "Passes", 1, 0},
		{"Weekly Elite Pack", "Bundles", 2, 0},
		{"0.5 Diamonds", "Diamonds", 2, 0},
		{"1,00 Diamonds", "Diamonds", 2, 0},
		{"999999999999999999999 Diamonds", "Diamonds", 2, 0},
		{"900000000 + 900000000 Diamonds", "Bundles", 2, 0},
		{"0 Diamonds", "Diamonds", 2, 0},
	} {
		t.Run(tc.title, func(t *testing.T) {
			kind, amount := productDiamonds(Definition{Title: tc.title, Category: tc.category})
			if kind != tc.kind || amount != tc.count {
				t.Fatalf("got kind %d count %d", kind, amount)
			}
		})
	}
}

func TestShopOrderPriority(t *testing.T) {
	keys := []shopOrderKey{
		{ID: "pass", Kind: 1, Region: "global", Amount: 100, Currency: "USD"},
		{ID: "regional-small", Region: "indonesia", Diamonds: 5, Amount: 200, Currency: "USD"},
		{ID: "global-large", Region: "global", Diamonds: 100, Amount: 1000, Currency: "USD"},
		{ID: "global-small", Region: "global", Diamonds: 20, Amount: 300, Currency: "USD"},
		{ID: "regional-large", Region: "indonesia", Diamonds: 10, Amount: 400, Currency: "USD"},
		{ID: "other", Kind: 2, Region: "global", Amount: 50, Currency: "USD"},
	}
	for _, tc := range []struct {
		sort string
		want []string
	}{
		{"", []string{"global-small", "global-large", "regional-small", "regional-large", "pass", "other"}},
		{"diamonds_desc", []string{"global-large", "global-small", "regional-large", "regional-small", "pass", "other"}},
		{"price_asc", []string{"other", "pass", "regional-small", "global-small", "regional-large", "global-large"}},
		{"price_desc", []string{"global-large", "regional-large", "global-small", "regional-small", "pass", "other"}},
	} {
		t.Run(tc.sort, func(t *testing.T) {
			ordered := slices.Clone(keys)
			slices.SortFunc(ordered, func(a, b shopOrderKey) int { return compareShopKey(a, b, tc.sort) })
			for i, key := range ordered {
				if key.ID != tc.want[i] {
					t.Fatalf("position %d got %s want %s", i, key.ID, tc.want[i])
				}
			}
		})
	}
	regions := []string{"", "United States", "global", "Indonesia"}
	slices.SortFunc(regions, compareShopRegion)
	if !slices.Equal(regions, []string{"global", "Indonesia", "United States", ""}) {
		t.Fatal(regions)
	}
}

func TestShopOrderPageIsBoundedAndNumeric(t *testing.T) {
	page := []orderedShopRow{}
	for i := 1000; i > 0; i-- {
		page = insertShopRow(page, orderedShopRow{key: shopOrderKey{ID: fmt.Sprint(i), Region: "global", Diamonds: int64(i)}}, "")
		if len(page) > 51 {
			t.Fatal("unbounded page")
		}
	}
	for i, item := range page {
		if item.key.Diamonds != int64(i+1) {
			t.Fatal("quantity ordered lexically or before full scan", item.key)
		}
	}
}

func TestShopOrderCursorBindsAllFilters(t *testing.T) {
	input := BrowseInput{Slug: "fixture", Search: " diamonds ", Region: "Global", Category: "Diamonds", Method: "id", Sort: "diamonds_asc"}
	key := shopOrderKey{ID: "1f81969d-a385-4299-ab31-7ef7d7fe1d0d", Region: "global", Diamonds: 55, Currency: "USD", Amount: 1234}
	cursor, err := input.encodeOrderCursor(key)
	if err != nil || len(cursor) > 1024 {
		t.Fatal(cursor, err)
	}
	input.After = cursor
	got, err := input.orderCursor()
	if err != nil || got != key {
		t.Fatal(got, err)
	}
	for _, change := range []func(*BrowseInput){
		func(f *BrowseInput) { f.Slug = "other" }, func(f *BrowseInput) { f.Search = "other" }, func(f *BrowseInput) { f.Region = "Indonesia" },
		func(f *BrowseInput) { f.Category = "Passes" }, func(f *BrowseInput) { f.Method = "code" }, func(f *BrowseInput) { f.Sort = "price_desc" },
	} {
		changed := input
		change(&changed)
		if _, err = changed.orderCursor(); err == nil {
			t.Fatal("reused cursor for changed filters")
		}
	}
	input.Sort = ""
	if _, err = input.orderCursor(); err != nil {
		t.Fatal("default is not ascending", err)
	}
	for _, bad := range []string{"not-a-cursor", "e30", cursor + "!"} {
		input.After = bad
		if _, err = input.orderCursor(); err == nil {
			t.Fatal("invalid cursor accepted")
		}
	}
	input.Sort = "unknown"
	if input.validSort() {
		t.Fatal("unknown sort accepted")
	}
}

func TestShopPriceUsesEnabledMinimumPurchase(t *testing.T) {
	value := Definition{Title: "50 Diamonds", Variants: []Variant{
		{Region: "Indonesia", Currency: "USD", UnitAmountMinor: "250", MinQuantity: 2, MaxQuantity: 10, Enabled: true},
		{Region: "Global", Currency: "USD", UnitAmountMinor: "350", MinQuantity: 1, MaxQuantity: 10, Enabled: true},
		{Region: "Global", Currency: "USD", UnitAmountMinor: "1", MinQuantity: 1, MaxQuantity: 10, Enabled: false},
		{Region: "Global", Currency: "EUR", UnitAmountMinor: "2", MinQuantity: 1, MaxQuantity: 10, Enabled: true},
	}}
	key, err := newShopOrderKey("example", value)
	if err != nil || key.Amount != 350 || key.Region != "global" || key.Currency != "USD" {
		t.Fatal(key, err)
	}
	value.Variants = nil
	if _, err = newShopOrderKey("example", value); err == nil {
		t.Fatal("unpriceable product accepted")
	}
}
