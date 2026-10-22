package payments

import (
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/paymentroutes"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

func TestReviewedRouteReconciliationNeverConfusesNetworks(t *testing.T) {
	t.Parallel()
	for _, route := range paymentroutes.List() {
		invoice := "invoice"
		attempt := &ent.PaymentAttempt{ID: "attempt", InvoiceID: &invoice, AmountMinor: "5000", Currency: "USD", Route: map[string]any{"code": route.Code, "network": route.Network, "label": route.Label}}
		evidence := nowpayments.Payment{AttemptID: "attempt", InvoiceID: invoice, PriceAmount: "50", PriceCurrency: "usd", PayAmount: "1.123456789", PayCurrency: route.Code, Network: route.Network}
		if reason := matching(attempt, evidence); reason != "" {
			t.Fatal(route.Code, reason)
		}
		evidence.Network = "wrong"
		if matching(attempt, evidence) != "wrong_route" {
			t.Fatal("wrong chain accepted", route.Code)
		}
		evidence.Network = route.Network
		evidence.PayCurrency = "other"
		if matching(attempt, evidence) != "wrong_route" {
			t.Fatal("wrong token accepted", route.Code)
		}
	}
}
