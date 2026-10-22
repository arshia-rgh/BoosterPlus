package payments

import (
	"encoding/json"
	"strings"
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

func TestHostedSelectionRequiresExplicitMarkerAndExactCommercialEvidence(t *testing.T) {
	invoice := "1"
	attempt := &ent.PaymentAttempt{ID: "attempt", InvoiceID: &invoice, AmountMinor: "5000", Currency: "USD", Route: map[string]any{"selection": "provider", "code": "", "network": "", "label": ""}}
	evidence := nowpayments.Payment{AttemptID: "attempt", InvoiceID: "1", PriceAmount: "50", PriceCurrency: "usd", PayAmount: "0.01", PayCurrency: "outsidelocalregistry", Network: "newchain"}
	if issue := matching(attempt, evidence); issue != "" {
		t.Fatal("merchant allowlist leaked into evidence", issue)
	}
	for _, route := range []map[string]any{nil, {}, {"selection": "unknown"}, {"selection": "provider", "code": "btc"}} {
		attempt.Route = route
		if matching(attempt, evidence) != "wrong_route" {
			t.Fatal("implicit provider selection", route)
		}
	}
	attempt.Route = map[string]any{"selection": "provider"}
	evidence.Network = ""
	if matching(attempt, evidence) != "wrong_route" {
		t.Fatal("missing network")
	}
	evidence.Network = "newchain"
	evidence.InvoiceID = "2"
	if matching(attempt, evidence) != "reference_mismatch" {
		t.Fatal("invoice mismatch")
	}
	evidence.InvoiceID = "1"
	evidence.PriceAmount = "49.99"
	if matching(attempt, evidence) != "price_mismatch" {
		t.Fatal("USD mismatch")
	}
}

func TestEmptyPayoutRoutesStayArraysInHostedHistory(t *testing.T) {
	t.Parallel()
	stored := map[string]any{"routes": nil, "currencies": []any{"USD"}, "text": "Accepted policy unchanged"}
	view, err := attemptView(&ent.PaymentAttempt{Route: map[string]any{"selection": "provider"}, Policy: stored})
	if err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(view)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(raw), `"routes":[]`) || stored["routes"] != nil || view.Policy.Data.Text != "Accepted policy unchanged" {
		t.Fatal("empty routes or stored agreement changed", string(raw))
	}
}
