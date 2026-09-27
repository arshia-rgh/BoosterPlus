package resale

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
)

func TestBrowseFilterRejectsAmbiguousPricesAndMismatchedCursors(t *testing.T) {
	for _, f := range []BrowseFilters{
		{Currency: "usd"}, {Currency: "USDT"}, {Sort: "price_asc"}, {MaxMinor: "5000"}, {Currency: "USD", MaxMinor: "-1"}, {Currency: "USD", MaxMinor: "0"}, {Currency: "USD", MaxMinor: "1000000000000"}, {Sort: "unknown"}, {Search: strings.Repeat("x", 121)}, {After: strings.Repeat("x", 1025)}, {Search: "private\x00value"},
	} {
		if !errors.Is(f.validate(), ErrInvalid) {
			t.Errorf("accepted invalid filters: %+v", f)
		}
	}
	for _, sort := range []string{"newest", "price_asc", "price_desc"} {
		f := BrowseFilters{Sort: sort, Currency: "USD", MaxMinor: "5000", Search: "literal%_", Slug: "game"}
		row := &ent.AccountListing{ID: "11111111-1111-4111-8111-111111111111", CreatedAt: time.Date(2026, 9, 27, 0, 0, 0, 123000, time.UTC), PublicAmountMinor: 2500}
		cursor, err := f.next(row)
		if err != nil {
			t.Fatal(err)
		}
		f.After = cursor
		c, err := f.cursor()
		if err != nil || c.ID != row.ID || !c.CreatedAt.Equal(row.CreatedAt) || c.Amount != 2500 {
			t.Fatal("cursor round trip", c, err)
		}
		changed := f
		changed.Currency = "EUR"
		if _, err = changed.cursor(); !errors.Is(err, ErrInvalid) {
			t.Fatal("cross currency cursor accepted", err)
		}
		changed = f
		changed.Search = "changed"
		if _, err = changed.cursor(); !errors.Is(err, ErrInvalid) {
			t.Fatal("cross filter cursor accepted", err)
		}
		for _, bad := range []string{"invalid", strings.Repeat("/", 50), base64.RawURLEncoding.EncodeToString([]byte(`{"v":2}`))} {
			changed = f
			changed.After = bad
			if _, err = changed.cursor(); !errors.Is(err, ErrInvalid) {
				t.Fatal("malformed cursor accepted", err)
			}
		}
		c.Amount = -1
		c.CreatedAt = time.Time{}
		raw, marshalErr := json.Marshal(c)
		if marshalErr != nil {
			t.Fatal(marshalErr)
		}
		changed = f
		changed.After = base64.RawURLEncoding.EncodeToString(raw)
		if _, err = changed.cursor(); !errors.Is(err, ErrInvalid) {
			t.Fatal("invalid cursor position accepted", err)
		}
	}
}
