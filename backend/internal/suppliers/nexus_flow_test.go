package suppliers

import (
	"errors"
	"net/http"
	"strings"
	"testing"
)

func TestNexusDynamicCatalogCompleteAndFailureAtomic(t *testing.T) {
	failure := false
	client := fixtureClient(t, NexusSandbox, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatal("catalog mutation")
		}
		switch r.URL.Path {
		case "/api/v1/catalog":
			reply(t, w, `{"games":[{"id":"roblox","name":"Roblox"}],"categories":[{"id":"roblox:passes","name":"Passes"}],"products":[]}`)
		case "/api/v1/utils/roblox/super-games":
			reply(t, w, `[{"id":"game1","name":"Game","name_en":"Test game","superpass_enabled":true}]`)
		case "/api/v1/utils/roblox/super-games/game1/passes":
			reply(t, w, `[{"id":"roblox:passes:p1"}]`)
		case "/api/v1/products/roblox:passes:p1":
			if failure {
				w.WriteHeader(http.StatusServiceUnavailable)
				return
			}
			reply(t, w, `{"id":"roblox:passes:p1","name":"Pass","price":1.005,"type":"topup","deliveryData":[{"id":"username","label":"Username","type":"text","required":true}],"amountType":{"type":"one"},"metadata":{"region":{"global":false,"countries":["TR"]}}}`)
		default:
			t.Error("unexpected catalog path", r.URL.Path)
			w.WriteHeader(http.StatusNotFound)
		}
	})
	catalog, err := client.Catalog(t.Context())
	if err != nil || len(catalog.Products) != 1 || catalog.Products[0].Offers[0].Cost != "1.005" || catalog.Products[0].Region.Countries[0] != "TR" || !strings.Contains(catalog.Products[0].Name, "Test game") {
		t.Fatal("dynamic offer lost", err)
	}
	failure = true
	catalog, err = client.Catalog(t.Context())
	if err == nil || len(catalog.Products) != 0 {
		t.Fatal("partial catalog replaced previous snapshot")
	}
}
func TestNexusPendingActionBoundedTrustedOrigins(t *testing.T) {
	payload := `{"employee":{"username":"worker123","profileUrl":"https://www.roblox.com/users/5087011877/profile"}}`
	client := fixtureClient(t, NexusSandbox, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatal("action mutated order")
		}
		reply(t, w, payload)
	})
	action, err := client.PendingAction(t.Context(), "42", "roblox:passes:p1")
	if err != nil || action.Kind != "join_game" || action.Employee != "worker123" {
		t.Fatal(err)
	}
	payload = `{"employee":{"username":"worker","profileUrl":"https://www.roblox.com.evil.test/users/1/profile"}}`
	if _, err = client.PendingAction(t.Context(), "42", "roblox:passes:p1"); !errors.Is(err, ErrEvidence) {
		t.Fatal("untrusted profile", err)
	}
	for _, url := range []string{"http://nexus-sandbox.amadeustech.dev/v/abc", "https://nexus.amadeustech.dev/v/abc", "https://nexus-sandbox.amadeustech.dev@evil.test/v/abc", "https://nexus-sandbox.amadeustech.dev/v/abc#secret"} {
		payload = `{"verification":{"url":"` + url + `"}}`
		if _, err = client.PendingAction(t.Context(), "42", "roblox:robux-login:p1"); err == nil {
			t.Fatal("untrusted verification origin")
		}
	}
	payload = `{"verification":{"url":"https://nexus-sandbox.amadeustech.dev/v/abc"}}`
	if _, err = client.PendingAction(t.Context(), "42", "roblox:robux-login:p1"); err != nil {
		t.Fatal("trusted verification", err)
	}
}
