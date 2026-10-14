package resale

import (
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

func TestListingAgreementBlockerPointsToCorrectEditor(t *testing.T) {
	for _, test := range []struct {
		name  string
		issue *catalog.Invalid
		want  string
	}{
		{"missing commission", nil, "listing_price"},
		{"incorrect total", &catalog.Invalid{Issues: []catalog.Issue{{Path: "product.amount_minor"}}}, "listing_price"},
		{"inspection contradicts seller terms", &catalog.Invalid{Issues: []catalog.Issue{{Path: "product.dispute_hours"}}}, "listing_terms"},
	} {
		t.Run(test.name, func(t *testing.T) {
			if got := listingAgreementBlocker(test.issue); got != test.want {
				t.Fatalf("blocker points to %q, want %q", got, test.want)
			}
		})
	}
}
