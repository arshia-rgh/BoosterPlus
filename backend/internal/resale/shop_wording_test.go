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

func TestShopCancellationAfterPaymentPreservesFailureAndMandatoryRemedies(t *testing.T) {
	terms := agreementDefaults.Shop["cancellation_terms"]
	for _, required := range []string{
		"After payment is confirmed",
		"cannot be cancelled simply because you change your mind",
		"full refund for failure of an accepted condition",
		"incorrect or unusable product",
		"cancellation, withdrawal or refund right required by law",
		"paid but unavailable item",
	} {
		if !strings.Contains(terms, required) {
			t.Errorf("cancellation terms lost %q", required)
		}
	}
	if strings.Contains(terms, "Cancel for a full refund before actual fulfillment") {
		t.Fatal("shop cancellation template still allows change-of-mind cancellation after payment")
	}
}
