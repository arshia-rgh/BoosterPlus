package resale

import (
	"strings"
	"testing"
)

func TestShopDefaultsKeepPricingPrivateAndBuyerProtections(t *testing.T) {
	for key, value := range agreementDefaults.Shop {
		for _, private := range []string{"supplier", "provider", "nexus", "vendoria", "markup", "15%"} {
			if strings.Contains(strings.ToLower(value), private) {
				t.Fatalf("shop %s exposes private sourcing or pricing", key)
			}
		}
	}
	if !strings.Contains(agreementDefaults.Shop["refund_terms"], "100%") || !strings.Contains(agreementDefaults.Shop["fees"], "wallet/exchange sending fees") {
		t.Fatal("shop wording lost refund or external wallet-fee disclosure")
	}
}
