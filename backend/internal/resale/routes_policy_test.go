package resale

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

func TestSellerRouteValidation(t *testing.T) {
	t.Parallel()
	routes := []sellerPayoutRoute{{Code: "usdtbsc", Network: "bsc"}}
	for _, test := range []struct {
		name, currency, network string
		valid                   bool
	}{
		{"published", "usdtbsc", "bsc", true},
		{"generic asset is not a route", "usdt", "bsc", false},
		{"wrong network", "usdtbsc", "trx", false},
		{"unpublished route", "usdttrc20", "trx", false},
		{"case mismatch", "USDTBSC", "bsc", false},
		{"missing", "", "", false},
	} {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			err := validateSellerRoute(routes, SellerTerms{Currency: test.currency, Network: test.network})
			if test.valid {
				if err != nil {
					t.Fatal(err)
				}
				return
			}
			var invalid *catalog.Invalid
			if !errors.As(err, &invalid) || len(invalid.Issues) != 1 || invalid.Issues[0].Path != "terms.currency" {
				t.Fatal("rejected route must identify the payout selector", err)
			}
			response := httptest.NewRecorder()
			if err = problem(response, err); err != nil {
				t.Fatal(err)
			}
			var body struct {
				Code   string          `json:"code"`
				Issues []catalog.Issue `json:"issues"`
			}
			if err = json.Unmarshal(response.Body.Bytes(), &body); err != nil {
				t.Fatal(err)
			}
			if response.Code != http.StatusUnprocessableEntity || body.Code != "resale_invalid" || len(body.Issues) != 1 || body.Issues[0].Path != "terms.currency" || body.Issues[0].Message == "" {
				t.Fatal("HTTP rejection lost actionable field feedback", response.Body.String())
			}
		})
	}
	if validateSellerRoute(nil, SellerTerms{Currency: "usdtbsc", Network: "bsc"}) == nil {
		t.Fatal("empty published routes accepted an offer")
	}
}

func TestPaymentOnlyNetworksCannotCreateUnsupportedManualSellerPayout(t *testing.T) {
	routes := []sellerPayoutRoute{{Code: "usdtton", Network: "ton"}, {Code: "usdtbsc", Network: "bsc"}}
	if validateSellerRoute(routes, SellerTerms{Currency: "usdtton", Network: "ton"}) == nil {
		t.Fatal("payment-only network exposed to manual payout")
	}
	if err := validateSellerRoute(routes, SellerTerms{Currency: "usdtbsc", Network: "bsc"}); err != nil {
		t.Fatal(err)
	}
}
