// Package paymentroutes defines reviewed asset/network pairs, not provider availability.
package paymentroutes

import (
	_ "embed"
	"encoding/json"
	"slices"
)

// Maximum bounds policy size and all downstream availability fan-out.
const Maximum = 40

// Route preserves the provider code separately from its readable coin/network names.
type Route struct {
	Code         string `json:"code"`
	Network      string `json:"network"`
	Symbol       string `json:"symbol"`
	NetworkLabel string `json:"network_label"`
	Label        string `json:"label"`
	Group        string `json:"group"`
}

//go:embed routes.json
var source []byte

// List returns a fresh copy so callers cannot mutate the reviewed registry.
func List() []Route {
	var routes []Route
	if err := json.Unmarshal(source, &routes); err != nil {
		panic("invalid embedded payment routes")
	}
	return routes
}

// Find never infers the chain from a ticker or accepts a similarly named token.
func Find(code string) (Route, bool) {
	for _, route := range List() {
		if route.Code == code {
			return route, true
		}
	}
	return Route{}, false
}

// ManualPayoutNetwork reflects the existing manual-recording validators. Payment
// acceptance alone must not enable unsupported seller payout networks.
func ManualPayoutNetwork(network string) bool {
	return slices.Contains([]string{"bsc", "eth", "trx", "sol"}, network)
}
