//go:build integration

package integration

import (
	"errors"
	"reflect"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/orderevent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/scheduling"
)

func syntheticDelivery() *catalog.DeliveryPolicy {
	windows := []scheduling.WeeklyWindow{}
	for day := range 7 {
		windows = append(windows, scheduling.WeeklyWindow{Weekday: day, Start: "00:00", End: "24:00"})
	}
	return &catalog.DeliveryPolicy{Calendar: scheduling.Calendar{Zone: "UTC", Windows: windows, Closures: []string{}}, Rules: []catalog.DeliveryRule{
		{Key: "synthetic_account", Mode: "account", MinMinutes: 30, MaxMinutes: 60, WaitMinMinutes: 15, WaitMaxMinutes: 30, WorkloadMinutes: 10},
		{Key: "synthetic_together", Mode: "together", MinMinutes: 30, MaxMinutes: 60},
	}}
}
func forecastDB(t *testing.T) *fulfillmentFixture {
	t.Helper()
	f := fulfillmentDB(t)
	c := f.game.Configuration
	c.Services[0].Delivery = syntheticDelivery()
	var err error
	f.game, err = f.catalog.Mutate(t.Context(), f.admin, f.game.ID, "save", catalog.Change{Revision: f.game.Revision, Configuration: c})
	if err != nil {
		t.Fatal(err)
	}
	f.game, err = f.catalog.Mutate(t.Context(), f.admin, f.game.ID, "publish", catalog.Change{Revision: f.game.Revision})
	if err != nil {
		t.Fatal(err)
	}
	return f
}
func forecastInput(v fulfillment.View, preview fulfillment.ForecastPreview) fulfillment.ForecastApply {
	return fulfillment.ForecastApply{Version: v.Version, OrderVersion: v.OrderVersion, CalculatedAt: preview.Forecast.CalculatedAt, Basis: preview.Basis, Note: "Reviewed synthetic delivery range"}
}
func TestDeliveryForecastAtomicityPrivacyAndStaleness(t *testing.T) {
	f := forecastDB(t)
	ctx := t.Context()
	detail := f.paid(t, "solo")
	v := f.assign(t, detail)
	preview, err := f.work.PreviewForecast(ctx, f.admin, v.OrderID)
	if err != nil || preview.Status != "needs_review" || preview.Forecast != nil {
		t.Fatal(preview, err)
	}
	v = f.handoff(t, v)
	preview, err = f.work.PreviewForecast(ctx, f.admin, v.OrderID)
	if err != nil || preview.Status != "ready" {
		t.Fatal(preview, err)
	}
	input := forecastInput(v, preview)
	for _, principal := range []*identity.Principal{f.buyer, f.other, f.booster, f.second} {
		if _, err = f.work.PreviewForecast(ctx, principal, v.OrderID); !errors.Is(err, identity.ErrForbidden) {
			t.Fatal("preview authority", err)
		}
		if _, err = f.work.ApplyForecast(ctx, principal, v.OrderID, input); !errors.Is(err, identity.ErrForbidden) {
			t.Fatal("apply authority", err)
		}
	}
	// Changing the current paid queue invalidates a preview without modifying this order.
	otherWork := f.assign(t, f.paid(t, "solo"))
	if _, err = f.work.ApplyForecast(ctx, f.admin, v.OrderID, input); !errors.Is(err, fulfillment.ErrConflict) {
		t.Fatal("stale queue", err)
	}
	preview, err = f.work.PreviewForecast(ctx, f.admin, v.OrderID)
	if err != nil {
		t.Fatal(err)
	}
	if got := preview.Forecast.StartEarliest.Sub(preview.Forecast.CalculatedAt); got != 25*time.Minute {
		t.Fatal("queue working minutes", got)
	}
	input = forecastInput(v, preview)
	bad := input
	bad.Basis = strings.Repeat("0", 64)
	if _, err = f.work.ApplyForecast(ctx, f.admin, v.OrderID, bad); !errors.Is(err, fulfillment.ErrConflict) {
		t.Fatal("tampered preview", err)
	}
	bad = input
	bad.CalculatedAt = bad.CalculatedAt.Add(-11 * time.Minute)
	if _, err = f.work.ApplyForecast(ctx, f.admin, v.OrderID, bad); !errors.Is(err, fulfillment.ErrConflict) {
		t.Fatal("expired preview", err)
	}
	var wins atomic.Int64
	var wg sync.WaitGroup
	for range 3 {
		wg.Go(func() {
			_, e := f.work.ApplyForecast(ctx, f.admin, v.OrderID, input)
			if e == nil {
				wins.Add(1)
			} else if !errors.Is(e, fulfillment.ErrConflict) {
				t.Error(e)
			}
		})
	}
	wg.Wait()
	if wins.Load() != 1 {
		t.Fatal("concurrent forecast", wins.Load())
	}
	current, err := f.work.Get(ctx, f.buyer, v.OrderID, "account")
	if err != nil || current.Forecast == nil || current.ForecastReview || !current.Forecast.FinishLatest.Equal(preview.Forecast.FinishLatest) {
		t.Fatal(current, err)
	}
	agreement, err := f.store.Get(ctx, f.buyer, v.OrderID, false)
	if err != nil || !reflect.DeepEqual(agreement.Contract.Data, detail.Contract.Data) {
		t.Fatal("commercial agreement mutated", err)
	}
	events, err := f.auth.client.OrderEvent.Query().Where(orderevent.OrderIDEQ(v.OrderID), orderevent.ActionEQ("delivery_forecast")).All(ctx)
	if err != nil || len(events) != 1 || !strings.Contains(events[0].Message, preview.Forecast.FinishLatest.Format(time.RFC3339)) {
		t.Fatal("forecast timeline", err)
	}
	if _, err = f.work.Assign(ctx, f.admin, otherWork.OrderID, fulfillment.Assignment{Version: otherWork.Version, OrderVersion: otherWork.OrderVersion, AssignedID: f.second.User.ID, Reason: "Move synthetic queue workload"}); err != nil {
		t.Fatal(err)
	}
	current, err = f.work.Get(ctx, f.buyer, v.OrderID, "account")
	if err != nil || !current.ForecastReview || !current.Forecast.FinishLatest.Equal(preview.Forecast.FinishLatest) {
		t.Fatal("range moved rather than marked stale", err)
	}
	manual := updateWork(current)
	start, finish := input.CalculatedAt.Add(time.Hour), input.CalculatedAt.Add(2*time.Hour)
	manual.EstimatedStart, manual.EstimatedFinish = &start, &finish
	current, err = f.work.Transition(ctx, f.admin, v.OrderID, "admin", "estimate", manual)
	if err != nil || current.Forecast != nil || current.ForecastReview {
		t.Fatal("manual override", err)
	}
}

func TestDeliveryForecastSessionsFactorsAndRollback(t *testing.T) {
	f := forecastDB(t)
	ctx := t.Context()
	v := f.handoff(t, f.assign(t, f.paid(t, "duo")))
	preview, err := f.work.PreviewForecast(ctx, f.admin, v.OrderID)
	if err != nil || preview.Status != "needs_review" {
		t.Fatal("unconfirmed availability", preview, err)
	}
	v = f.book(t, v)
	preview, err = f.work.PreviewForecast(ctx, f.admin, v.OrderID)
	if err != nil || preview.Status != "ready" || preview.Forecast.FinishLatest.Sub(preview.Forecast.StartLatest) != time.Hour {
		t.Fatal(preview, err)
	}
	input := forecastInput(v, preview)
	now := time.Unix(f.auth.clock.Load(), 0)
	if _, err = f.auth.client.AuthSession.UpdateOneID(f.admin.Session.ID).SetAuthenticatedAt(now.Add(-11 * time.Minute)).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.work.ApplyForecast(ctx, f.admin, v.OrderID, input); err == nil {
		t.Fatal("stale primary accepted")
	}
	if _, err = f.auth.client.AuthSession.UpdateOneID(f.admin.Session.ID).SetAuthenticatedAt(now).SetMfaVerifiedAt(now.Add(-11 * time.Minute)).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.work.ApplyForecast(ctx, f.admin, v.OrderID, input); err == nil {
		t.Fatal("stale MFA accepted")
	}
	if _, err = f.auth.client.AuthSession.UpdateOneID(f.admin.Session.ID).SetMfaVerifiedAt(now).Save(ctx); err != nil {
		t.Fatal(err)
	}
	// Deliberately break only this isolated test database to prove rollback.
	if _, err = f.auth.db.ExecContext(ctx, "DROP TABLE auth_audits"); err != nil {
		t.Fatal(err)
	}
	if _, err = f.work.ApplyForecast(ctx, f.admin, v.OrderID, input); err == nil {
		t.Fatal("missing audit accepted")
	}
	current, err := f.work.Get(ctx, f.buyer, v.OrderID, "account")
	if err != nil || current.Version != v.Version || current.Forecast != nil {
		t.Fatal("partial forecast persisted", err)
	}
}
