//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/publicmetrics"
)

func metricOrder(t *testing.T, f *orderFixture, state order.State, gameID string, settled bool, completed time.Time) *ent.Order {
	t.Helper()
	ctx := t.Context()
	// Synthetic evidence is confined to the randomly named isolated test schema.
	row, err := f.auth.client.Order.Create().SetUserID(f.buyer.User.ID).SetGameID(gameID).SetGameName("Synthetic game").SetSlug(f.game.Slug).SetService("boost").SetKind(order.KindPackage).SetRequestKey(uuid.NewString()).SetRequestHash(strings.Repeat("a", 64)).SetState(state).SetAnswers(map[string]any{}).SetSnapshot(map[string]any{}).SetEstimate(map[string]any{}).SetTermsVersion("fixture-only").Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	payment := ordercontract.PaymentStateUnissued
	if settled {
		payment = ordercontract.PaymentStateSettled
	}
	contract, err := f.auth.client.OrderContract.Create().SetOrderID(row.ID).SetActiveOrderID(row.ID).SetUserID(row.UserID).SetGameID(gameID).SetPaymentState(payment).SetData(map[string]any{}).Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	row, err = f.auth.client.Order.UpdateOneID(row.ID).SetCurrentContract(contract.ID).Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if !completed.IsZero() {
		for version := 1; version <= 2; version++ { // duplicate completion evidence must still count one order
			if _, err = f.auth.client.OrderEvent.Create().SetOrderID(row.ID).SetVersion(version).SetAction("approve_completion").SetActorID(f.admin.User.ID).SetActorRole("admin").SetCreatedAt(completed).Save(ctx); err != nil {
				t.Fatal(err)
			}
		}
	}
	return row
}

func TestPublicMetricsEligibilityBoundariesSuppressionAndFailure(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	now := time.Now().UTC()
	policy := publicmetrics.Policy{WindowDays: 30, MinimumSample: 5, MaximumAgeSecs: 300}
	for range 5 {
		metricOrder(t, f, order.StateInProgress, f.game.ID, true, time.Time{})
		metricOrder(t, f, order.StateCompleted, f.game.ID, true, now.Add(-time.Hour))
	}
	metricOrder(t, f, order.StateInProgress, f.game.ID, false, time.Time{})
	metricOrder(t, f, order.StateCancelled, f.game.ID, true, now.Add(-time.Hour))
	metricOrder(t, f, order.StateCompleted, f.game.ID, true, now) // exclusive end
	metricOrder(t, f, order.StateCompleted, f.game.ID, true, now.AddDate(0, 0, -30).Add(-time.Second))
	metricOrder(t, f, order.StateCompleted, f.game.ID, false, now.Add(-time.Hour))
	metricOrder(t, f, order.StateInProgress, uuid.NewString(), true, time.Time{})
	disputed := metricOrder(t, f, order.StateInProgress, f.game.ID, true, time.Time{})
	if _, err := f.auth.client.ServiceCase.Create().SetRequestHash(strings.Repeat("b", 64)).SetOrderID(disputed.ID).SetActiveOrderID(disputed.ID).SetUserID(disputed.UserID).SetKind("dispute").SetPolicy(map[string]any{}).SetPreviousState("in_progress").SetCreatedAt(now).SetUpdatedAt(now).Save(ctx); err != nil {
		t.Fatal(err)
	}
	assertCounts := func(values []publicmetrics.Metric, active, completed int) {
		t.Helper()
		if values[0].Value == nil || *values[0].Value != active || values[1].Value == nil || *values[1].Value != completed || values[2].Value != nil || values[2].State != "unavailable" {
			t.Fatal("incorrect evidence", values)
		}
	}
	values := publicmetrics.Read(ctx, f.auth.client, &policy, f.game.ID, now)
	assertCounts(values, 5, 5)
	if values[0].StaleAt == nil || !values[0].StaleAt.Equal(now.Add(300*time.Second)) {
		t.Fatal("freshness missing")
	}
	metricOrder(t, f, order.StateCompleted, f.game.ID, true, now.AddDate(0, 0, -30)) // inclusive start
	assertCounts(publicmetrics.Read(ctx, f.auth.client, &policy, f.game.ID, now), 5, 6)
	assertCounts(publicmetrics.Read(ctx, f.auth.client, &policy, "", now), 6, 6)
	raw, err := json.Marshal(values)
	if err != nil {
		t.Fatal(err)
	}
	for _, secret := range []string{f.buyer.User.ID, f.buyer.User.Email, f.game.ID, disputed.ID, "request_hash"} {
		if strings.Contains(string(raw), secret) {
			t.Fatal("private evidence leaked", secret)
		}
	}
	policy.MinimumSample = 7
	suppressed := publicmetrics.Read(ctx, f.auth.client, &policy, f.game.ID, now)
	for _, v := range suppressed[:2] {
		if v.State != "insufficient_sample" || v.Value != nil || v.SampleSize != nil {
			t.Fatal("small sample exposed", v)
		}
	}
	cancelled, cancel := context.WithCancel(ctx)
	cancel()
	for _, v := range publicmetrics.Read(cancelled, f.auth.client, &policy, "", now) {
		if v.State != "unavailable" || v.Value != nil || v.SampleSize != nil {
			t.Fatal("failure fabricated evidence", v)
		}
	}
}
