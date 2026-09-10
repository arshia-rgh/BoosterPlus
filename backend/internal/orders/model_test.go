package orders

import (
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

func TestQuoteValidationAndLineReconciliation(t *testing.T) {
	t.Parallel()
	now := time.Now()
	valid := QuoteInput{Version: 1, AmountMinor: "100", Currency: "USD", Scope: "Synthetic scope", Reason: "Reviewed request", DeliveryMinHours: 1, DeliveryMaxHours: 24, ExpiresAt: now.Add(48 * time.Hour), Lines: []catalog.PriceLine{{Key: "base", Label: "Base", AmountMinor: "150"}, {Key: "adjustment", Label: "Adjustment", AmountMinor: "-50"}}}
	if err := validateQuote(valid, now); err != nil {
		t.Fatal(err)
	}
	cases := map[string]func(*QuoteInput){"zero total": func(q *QuoteInput) { q.AmountMinor = "0" }, "fractional total": func(q *QuoteInput) { q.AmountMinor = "100.5" }, "unsupported currency": func(q *QuoteInput) { q.Currency = "BTC" }, "missing reason": func(q *QuoteInput) { q.Reason = "" }, "missing scope": func(q *QuoteInput) { q.Scope = "" }, "expired": func(q *QuoteInput) { q.ExpiresAt = now }, "too distant": func(q *QuoteInput) { q.ExpiresAt = now.Add(8 * 24 * time.Hour) }, "delivery inverted": func(q *QuoteInput) { q.DeliveryMinHours = 25 }, "wrong line sum": func(q *QuoteInput) { q.AmountMinor = "101" }, "duplicate line": func(q *QuoteInput) { q.Lines = append(q.Lines, q.Lines[0]) }, "spoof coupon line": func(q *QuoteInput) {
		q.Lines = []catalog.PriceLine{{Key: "coupon", Label: "Spoof", AmountMinor: "100"}}
	}}
	for name, change := range cases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			q := valid
			change(&q)
			if err := validateQuote(q, now); err == nil {
				t.Fatal("invalid commercial proposal accepted")
			}
		})
	}
}
