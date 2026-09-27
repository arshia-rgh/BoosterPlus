//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/resale"
)

// These public query fixtures intentionally contain no seller credentials or payment records.
func seedBrowseListing(t *testing.T, f *resaleFixture, n int, currency, state string) (string, time.Time) {
	t.Helper()
	ctx := t.Context()
	client := f.base.auth.client
	product := resaleProduct()
	product.Title = fmt.Sprintf("Browse sample %02d %%_", n)
	product.Currency = currency
	product.AmountMinor = strconv.Itoa(1000 + (n/4)*50)
	raw, err := json.Marshal(product)
	if err != nil {
		t.Fatal(err)
	}
	var data map[string]any
	if err = json.Unmarshal(raw, &data); err != nil {
		t.Fatal(err)
	}
	created := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC).Add(time.Duration(n/3) * time.Hour)
	row, err := client.AccountListing.Create().SetSubmissionID(uuid.NewString()).SetOfferID(uuid.NewString()).SetSellerID(f.base.other.User.ID).SetGameID(f.intake.game.ID).SetGameName(f.intake.game.Configuration.Name).SetSlug(f.intake.game.Slug).SetState(state).SetDraft(data).SetPublicTitle(product.Title).SetPublicRegion(product.Region).SetPublicRank(product.Rank).SetPublicCurrency(currency).SetPublicAmountMinor(int64(1000 + (n/4)*50)).SetCreatedAt(created).SetUpdatedAt(created).Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	release, err := client.AccountListingRelease.Create().SetListingID(row.ID).SetVersion(1).SetData(data).SetCreatedBy(f.base.admin.User.ID).SetCreatedAt(created).Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = client.AccountListing.UpdateOneID(row.ID).SetCurrentRelease(release.ID).Save(ctx); err != nil {
		t.Fatal(err)
	}
	return row.ID, created
}

func TestResaleMarketGamesReleasedNamesAvailabilityAndPagination(t *testing.T) {
	f := resaleDB(t, "consignment")
	ctx := t.Context()
	client := f.base.auth.client
	for n := 0; n < 52; n++ {
		slug := fmt.Sprintf("browse-game-%02d", n)
		game, err := client.Game.Create().SetSlug(slug).SetName("Private draft title").SetConfiguration(map[string]any{}).SetPublished(true).Save(ctx)
		if err != nil {
			t.Fatal(err)
		}
		config := f.intake.game.Configuration
		config.Name = fmt.Sprintf("Released game %02d", n)
		raw, err := json.Marshal(config)
		if err != nil {
			t.Fatal(err)
		}
		var data map[string]any
		if err = json.Unmarshal(raw, &data); err != nil {
			t.Fatal(err)
		}
		release, err := client.CatalogRelease.Create().SetGameID(game.ID).SetVersion(1).SetConfiguration(data).SetCreatedBy(f.base.admin.User.ID).Save(ctx)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = client.Game.UpdateOneID(game.ID).SetCurrentRelease(release.ID).SetPaused(n == 0).Save(ctx); err != nil {
			t.Fatal(err)
		}
		fixture := *f
		intake := *f.intake
		base := *intake.orderFixture
		base.game.ID = game.ID
		base.game.Slug = slug
		intake.orderFixture = &base
		fixture.intake = &intake
		seedBrowseListing(t, &fixture, n, "USD", "published")
		if n == 1 {
			seedBrowseListing(t, &fixture, 53, "USD", "published")
		}
	}
	// Multiple listings for a game must not duplicate that game's option.
	// The fixture's own game has no public listings and must not appear.
	games, next, err := f.resale.MarketGames(ctx, "")
	if err != nil || len(games) != 49 || next != "browse-game-49" {
		t.Fatal("bounded distinct game choices", len(games), next, err)
	}
	for _, game := range games {
		if !strings.HasPrefix(game.Name, "Released game ") || game.Slug == "browse-game-00" {
			t.Fatal("draft or paused game exposed", game)
		}
	}
	games, next, err = f.resale.MarketGames(ctx, next)
	if err != nil || len(games) != 2 || next != "" {
		t.Fatal("next game page", len(games), next, err)
	}
	if _, _, err = f.resale.MarketGames(ctx, strings.Repeat("x", 81)); !errors.Is(err, resale.ErrInvalid) {
		t.Fatal("unbounded cursor", err)
	}
	if _, _, err = f.resale.MarketGames(ctx, "\x00"); !errors.Is(err, resale.ErrInvalid) {
		t.Fatal("invalid cursor", err)
	}
}
func TestResaleBrowseStablePriceAndNewestPagination(t *testing.T) {
	f := resaleDB(t, "consignment")
	ctx := t.Context()
	dates := map[string]time.Time{}
	for n := 0; n < 52; n++ {
		id, date := seedBrowseListing(t, f, n, "USD", "published")
		dates[id] = date
	}
	seedBrowseListing(t, f, 0, "EUR", "published")
	seedBrowseListing(t, f, 0, "USD", "draft")
	seedBrowseListing(t, f, 0, "USD", "sold")
	for _, sort := range []string{"price_asc", "price_desc", "newest"} {
		filter := resale.BrowseFilters{Slug: f.intake.game.Slug, Search: "Browse sample", Currency: "USD", Sort: sort}
		seen := map[string]bool{}
		previousAmount := int64(0)
		previousID := ""
		var previousDate time.Time
		for page := 0; page < 4; page++ {
			rows, next, err := f.resale.BrowseFiltered(ctx, filter)
			if err != nil {
				t.Fatal(err)
			}
			if page == 0 && (len(rows) != 24 || next == "") {
				t.Fatal("pagination not bounded", len(rows), next)
			}
			for _, row := range rows {
				if seen[row.ID] || row.Product.Currency != "USD" || row.State != "published" {
					t.Fatal("duplicate or wrong inventory", row.ID)
				}
				amount, err := strconv.ParseInt(row.Product.AmountMinor, 10, 64)
				if err != nil {
					t.Fatal(err)
				}
				date := dates[row.ID]
				if previousID != "" {
					if sort == "price_asc" && (amount < previousAmount || amount == previousAmount && row.ID <= previousID) {
						t.Fatal("ascending price order")
					}
					if sort == "price_desc" && (amount > previousAmount || amount == previousAmount && row.ID <= previousID) {
						t.Fatal("descending price order")
					}
					if sort == "newest" && (date.After(previousDate) || date.Equal(previousDate) && row.ID <= previousID) {
						t.Fatal("newest order")
					}
				}
				seen[row.ID] = true
				previousAmount = amount
				previousID = row.ID
				previousDate = date
			}
			if next == "" {
				break
			}
			filter.After = next
		}
		if len(seen) != 52 {
			t.Fatal("lost inventory across pages", sort, len(seen))
		}
	}
	filter := resale.BrowseFilters{Slug: f.intake.game.Slug, Search: "%_", Currency: "USD", MaxMinor: "1000", Sort: "price_asc"}
	rows, next, err := f.resale.BrowseFiltered(ctx, filter)
	if err != nil || len(rows) != 4 || next != "" {
		t.Fatal("maximum price or literal filter", len(rows), next, err)
	}
	filter.Region = "unmatched"
	rows, _, err = f.resale.BrowseFiltered(ctx, filter)
	if err != nil || len(rows) != 0 {
		t.Fatal("region filter", len(rows), err)
	}
	filter = resale.BrowseFilters{Currency: "USD", Search: "Browse sample", Sort: "price_asc"}
	_, next, err = f.resale.BrowseFiltered(ctx, filter)
	if err != nil || next == "" {
		t.Fatal("missing cursor", err)
	}
	filter.After = next
	filter.Currency = "EUR"
	if _, _, err = f.resale.BrowseFiltered(ctx, filter); !errors.Is(err, resale.ErrInvalid) {
		t.Fatal("cross currency cursor", err)
	}
	filter.Currency = "USD"
	filter.Sort = "price_desc"
	if _, _, err = f.resale.BrowseFiltered(ctx, filter); !errors.Is(err, resale.ErrInvalid) {
		t.Fatal("cross sort cursor", err)
	}
}

func TestResaleBrowseHTTPRejectsAmbiguousPriceFilters(t *testing.T) {
	f := resaleDB(t, "consignment")
	seedBrowseListing(t, f, 0, "USD", "published")
	mux := http.NewServeMux()
	f.base.auth.service.Register(mux)
	f.resale.Register(mux)
	for _, tc := range []struct {
		query  string
		status int
	}{
		{"?sort=price_asc", http.StatusUnprocessableEntity},
		{"?currency=USD&max_minor=12.34", http.StatusUnprocessableEntity},
		{"?currency=USD&sort=price_asc&max_minor=1000", http.StatusOK},
		{"?sort=newest&after=invalid", http.StatusUnprocessableEntity},
	} {
		response := httptest.NewRecorder()
		request := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/v1/accounts"+tc.query, nil)
		mux.ServeHTTP(response, request)
		if response.Code != tc.status {
			t.Fatalf("query %s got %d want %d", tc.query, response.Code, tc.status)
		}
		if tc.status == http.StatusOK {
			var result struct {
				Items []resale.PublicListing `json:"items"`
			}
			if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
				t.Fatal(err)
			}
			if len(result.Items) != 1 || result.Items[0].Product.Currency != "USD" {
				t.Fatal("wrong public projection", result)
			}
		}
	}
}
