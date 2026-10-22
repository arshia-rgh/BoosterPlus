package paymentroutes

import (
	"encoding/json"
	"os"
	"slices"
	"testing"
)

func TestReviewedRoutesAndFrontendMirror(t *testing.T) {
	t.Parallel()
	routes := List()
	if len(routes) != 30 {
		t.Fatal("expected the owner's 30 reviewed routes")
	}
	seen := map[string]bool{}
	for _, route := range routes {
		if seen[route.Code] || route.Network == "" || route.Label == "" || route.Symbol == "" {
			t.Fatal("invalid registry", route.Code)
		}
		seen[route.Code] = true
	}
	for code, network := range map[string]string{"bnbbsc": "bsc", "usdc": "eth", "usdtarc20": "avaxc", "usdcarc20": "avaxc", "usdtarb": "arbitrum", "usdcsol": "sol", "usdtton": "ton"} {
		route, ok := Find(code)
		if !ok || route.Network != network {
			t.Fatal("incorrect mapping", code)
		}
	}
	if _, ok := Find("usdt"); ok {
		t.Fatal("ambiguous ticker accepted")
	}
	mirror, err := os.ReadFile("../../../frontend/contracts/payment-routes.json")
	var mirrored []Route
	if err != nil || json.Unmarshal(mirror, &mirrored) != nil || !slices.Equal(routes, mirrored) {
		t.Fatal("frontend payment route registry drift", err)
	}
	copyRoutes := List()
	copyRoutes[0].Network = "wrong"
	if List()[0].Network == "wrong" {
		t.Fatal("mutable registry")
	}
}
