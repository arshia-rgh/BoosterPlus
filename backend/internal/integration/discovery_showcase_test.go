//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/review"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/reviews"
)

func TestDiscoveryReviewShowcaseMigrationReadiness(t *testing.T) {
	db := testDB(t)
	ctx := t.Context()
	r := runner(t, db)
	if err := r.Apply(ctx, 27); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(ctx, db); err == nil {
		t.Fatal("schema without the showcase index passed readiness")
	}
	if err := r.Apply(ctx, 0); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(ctx, db); err != nil {
		t.Fatal(err)
	}
	if err := r.Down(ctx, len(r.Files())-27); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(ctx, db); err == nil {
		t.Fatal("rolled-back showcase migration passed readiness")
	}
	if err := r.Apply(ctx, 0); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(ctx, db); err != nil {
		t.Fatal(err)
	}
	executeSQL(t, db, "DROP INDEX review_showcase ON reviews")
	if err := database.Ready(ctx, db); err == nil {
		t.Fatal("missing showcase index passed readiness")
	}
}

func TestDiscoveryReviewShowcaseBoundPrivacyAndCurrentPurchase(t *testing.T) {
	f := reviewDB(t)
	ctx := t.Context()
	ids := []string{}
	private := []string{f.buyer.User.ID, f.buyer.User.Email, f.admin.User.ID}
	for i := range 10 {
		paid := f.completed(t)
		input := f.feedback()
		if i%2 == 1 {
			input.Rating = 5
		}
		saved, err := f.reviews.Save(ctx, f.buyer, paid.Order.ID, input)
		if err != nil {
			t.Fatal(err)
		}
		f.auth.clock.Add(1)
		published := f.publish(t, saved)
		ids = append(ids, published.Review.ID)
		private = append(private, paid.Order.ID, paid.Contract.ID)
		if i == 9 {
			if _, err = f.auth.client.OrderContract.UpdateOneID(paid.Contract.ID).SetPaymentState(ordercontract.PaymentStateFundsDetected).Save(ctx); err != nil {
				t.Fatal(err)
			}
		}
	}
	c := f.game.Configuration
	c.Name = "PRIVATE UNPUBLISHED GAME NAME"
	if _, err := f.catalog.Mutate(ctx, f.admin, f.game.ID, "save", catalog.Change{Revision: f.game.Revision, Configuration: c}); err != nil {
		t.Fatal(err)
	}
	view, err := f.reviews.Showcase(ctx)
	if err != nil || len(view.Items) != 8 {
		t.Fatal("bounded showcase", view, err)
	}
	for i, item := range view.Items {
		if item.Review.ID != ids[9-i] || item.Game != f.game.Configuration.Name || item.Slug != f.game.Slug {
			t.Fatal("unstable ordering or draft leak", item)
		}
	}
	if view.Items[0].Review.PurchaseStatus == "verified_purchase" {
		t.Fatal("changed agreement still shown as verified")
	}
	if view.Items[1].Review.Rating != 1 {
		t.Fatal("low rating excluded")
	}
	encoded, err := json.Marshal(view)
	if err != nil {
		t.Fatal(err)
	}
	for _, value := range append(private, c.Name, `"user_id"`, `"order_id"`, `"contract_id"`, `"moderation_note"`) {
		if strings.Contains(string(encoded), value) {
			t.Fatal("private review data exposed")
		}
	}
	checkShowcaseHTTP(t, f, view)
	for _, state := range []review.State{review.StateHidden, review.StatePending, review.StateWithdrawn} {
		if _, err = f.auth.client.Review.UpdateOneID(ids[9]).SetState(state).Save(ctx); err != nil {
			t.Fatal(err)
		}
		next, readErr := f.reviews.Showcase(ctx)
		if readErr != nil || len(next.Items) != 8 || next.Items[0].Review.ID != ids[8] {
			t.Fatal("non-public feedback exposed", state, readErr)
		}
	}
}

func checkShowcaseHTTP(t *testing.T, f *reviewFixture, view reviews.Showcase) {
	t.Helper()
	mux := http.NewServeMux()
	f.auth.service.Register(mux)
	f.reviews.Register(mux)
	result := httptest.NewRecorder()
	mux.ServeHTTP(result, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/v1/public/reviews", nil))
	if result.Code != http.StatusOK || result.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("public showcase transport", result.Code)
	}
	var actual reviews.Showcase
	if err := json.Unmarshal(result.Body.Bytes(), &actual); err != nil || len(actual.Items) != len(view.Items) {
		t.Fatal("showcase HTTP response", err)
	}
	var document, body any
	if err := json.Unmarshal(api.Contract, &document); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err := compiler.AddResource("contract.json", document); err != nil {
		t.Fatal(err)
	}
	schema, err := compiler.Compile("contract.json#/components/schemas/ReviewShowcase")
	if err != nil {
		t.Fatal(err)
	}
	if err = json.Unmarshal(result.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if err = schema.Validate(body); err != nil {
		t.Fatal("showcase schema", err)
	}
}

func TestDiscoveryReviewShowcaseGameVisibilityAndFailure(t *testing.T) {
	f := reviewDB(t)
	ctx := t.Context()
	paid := f.completed(t)
	saved, err := f.reviews.Save(ctx, f.buyer, paid.Order.ID, f.feedback())
	if err != nil {
		t.Fatal(err)
	}
	f.publish(t, saved)
	for _, state := range []struct {
		published, archived, paused bool
		count                       int
	}{
		{true, false, false, 1}, {true, false, true, 1}, {false, false, false, 0}, {true, true, false, 0},
	} {
		if _, err = f.auth.client.Game.UpdateOneID(f.game.ID).SetPublished(state.published).SetArchived(state.archived).SetPaused(state.paused).Save(ctx); err != nil {
			t.Fatal(err)
		}
		view, readErr := f.reviews.Showcase(ctx)
		if readErr != nil || len(view.Items) != state.count || view.Items == nil {
			t.Fatal("game visibility", state, view, readErr)
		}
	}
	cancelled, cancel := context.WithCancel(ctx)
	cancel()
	if _, err = f.reviews.Showcase(cancelled); !errors.Is(err, context.Canceled) {
		t.Fatal("cancelled read succeeded", err)
	}
}

func TestDiscoveryGameCardUsesReleasedArtworkFraming(t *testing.T) {
	f := orderDB(t)
	c := f.game.Configuration
	c.HeroLayout = &catalog.HeroLayout{CopySide: "left", DesktopX: 80, DesktopY: 20, MobileX: 70, MobileY: 20}
	saveDiscovery(t, f, c)
	draft := f.game.Configuration
	draft.HeroLayout = &catalog.HeroLayout{CopySide: "right", DesktopX: 20, DesktopY: 80, MobileX: 30, MobileY: 80}
	if _, err := f.catalog.Mutate(t.Context(), f.admin, f.game.ID, "save", catalog.Change{Revision: f.game.Revision, Configuration: draft}); err != nil {
		t.Fatal(err)
	}
	listing, err := f.catalog.List(t.Context(), nil, false, "")
	if err != nil || len(listing.Games) != 1 || listing.Games[0].HeroLayout == nil || *listing.Games[0].HeroLayout != *c.HeroLayout {
		t.Fatal("unreleased framing leaked to card", listing, err)
	}
}
