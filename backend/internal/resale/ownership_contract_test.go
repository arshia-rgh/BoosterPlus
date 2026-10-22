package resale

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountlisting"
)

func TestOwnershipResponsesAndRequestsMatchContract(t *testing.T) {
	t.Parallel()
	var contract any
	if err := json.Unmarshal(api.Contract, &contract); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err := compiler.AddResource("contract.json", contract); err != nil {
		t.Fatal(err)
	}
	id := "00000000-0000-4000-8000-000000017501"
	draft, err := document(playoraDraft("PLAYORA account"))
	if err != nil {
		t.Fatal(err)
	}
	owned, err := listingView(&ent.AccountListing{ID: id, Origin: accountlisting.OriginPlayora, Version: 1, State: "draft", GameName: "Mobile Legends", Slug: "mobile-legends", Draft: draft})
	if err != nil {
		t.Fatal(err)
	}
	owned.Blockers = []string{"listing_price", "publication"}
	offer, submission, seller := id, id, id
	bought, err := listingView(&ent.AccountListing{ID: id, SubmissionID: &submission, OfferID: &offer, SellerID: &seller, Origin: accountlisting.OriginBuyFirst, Version: 1, State: "draft", Draft: draft})
	if err != nil {
		t.Fatal(err)
	}
	paid := false
	bought.SellerPayoutConfirmed = &paid
	if owned.SubmissionID != "" || owned.OfferID != "" || owned.Ownership != "playora" || bought.Ownership != "playora" || bought.SubmissionID != id {
		t.Fatalf("unexpected projections: %+v %+v", owned, bought)
	}
	valid := map[string]any{
		"AccountInventoryItem": owned,
		"AccountInventory":     map[string]any{"items": []ListingView{owned, bought}, "next": "", "counts": InventoryCounts{Playora: 2, Seller: 0}},
		"PlayoraListingInput":  PlayoraListingInput{RequestKey: id, GameID: id, Title: "PLAYORA account"},
	}
	invalid := map[string]any{
		"AccountInventoryItem": map[string]any{"id": id, "submission_id": "", "offer_id": "", "origin": "staff", "ownership": "playora", "state": "draft", "game": "", "slug": "", "release_id": "", "version": 1, "draft": owned.Draft},
		"AccountInventory":     map[string]any{"items": []ListingView{}, "next": ""},
		"PlayoraListingInput":  map[string]any{"request_key": id, "game_id": id, "title": "", "seller_id": id},
	}
	check := func(name string, value any) error {
		schema, compileErr := compiler.Compile("contract.json#/components/schemas/" + name)
		if compileErr != nil {
			t.Fatal(compileErr)
		}
		encoded, marshalErr := json.Marshal(value)
		if marshalErr != nil {
			t.Fatal(marshalErr)
		}
		var data any
		if marshalErr = json.Unmarshal(encoded, &data); marshalErr != nil {
			t.Fatal(marshalErr)
		}
		return schema.Validate(data)
	}
	for name, value := range valid {
		if err := check(name, value); err != nil {
			t.Fatal(name, err)
		}
	}
	for name, value := range invalid {
		if check(name, value) == nil {
			t.Fatal("contract accepted invalid", name)
		}
	}
}

func TestOwnershipProblemsAndStrictInput(t *testing.T) {
	t.Parallel()
	w := httptest.NewRecorder()
	if err := problem(w, ErrGameUnavailable); err != nil || w.Code != http.StatusConflict || !strings.Contains(w.Body.String(), `"resale_game_unavailable"`) {
		t.Fatal("closed account sales must have a specific problem code", w.Code, w.Body.String(), err)
	}
	r := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/api/v1/admin/account-listings", strings.NewReader(`{"request_key":"x","game_id":"y","title":"z","origin":"consignment"}`))
	r.Header.Set("Content-Type", "application/json")
	var input PlayoraListingInput
	if err := read(r, &input); !errors.Is(err, ErrInvalid) {
		t.Fatal("unknown fields such as a client-chosen origin must be refused:", err)
	}
}
