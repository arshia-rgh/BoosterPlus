//go:build integration

package integration

import (
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
	work "github.com/arshia-rgh/BoosterPlus/backend/internal/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func TestBoosterReadinessMatchesExecutionGuards(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	check := func(id, reason string) {
		t.Helper()
		got, err := f.work.Readiness(ctx, f.booster, id, "booster")
		if err != nil || got.Requirement != reason || got.Ready != (reason == "ready") {
			t.Fatal("readiness", got, err)
		}
	}
	v := f.assign(t, f.paid(t, "solo"))
	check(v.OrderID, "details")
	if _, err := f.work.Readiness(ctx, f.second, v.OrderID, "booster"); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("foreign readiness", err)
	}
	if _, err := f.work.Readiness(ctx, f.buyer, v.OrderID, "account"); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer readiness", err)
	}
	v = f.handoff(t, v)
	check(v.OrderID, "game_access")
	_, err := f.work.SubmitSecret(ctx, f.buyer, v.OrderID, work.SecretInput{WorkVersion: v.Version, RequestKey: uuid.NewString(), ExpiresAt: time.Unix(f.auth.clock.Load(), 0).Add(time.Hour), Value: []byte("synthetic temporary game access")})
	if err != nil {
		t.Fatal(err)
	}
	check(v.OrderID, "ready")
	if _, err = f.auth.client.SecretBundle.Update().Where(secretbundle.ResourceIDEQ(v.OrderID)).SetExpiresAt(time.Unix(f.auth.clock.Load(), 0).Add(-time.Second)).Save(ctx); err != nil {
		t.Fatal(err)
	}
	check(v.OrderID, "game_access")
	v = f.handoff(t, f.assign(t, f.paid(t, "duo")))
	check(v.OrderID, "confirmed_session")
	v = f.book(t, v)
	check(v.OrderID, "ready")
	if _, err = f.auth.client.Order.UpdateOneID(v.OrderID).SetState(order.StateCompleted).Save(ctx); err != nil {
		t.Fatal(err)
	}
	check(v.OrderID, "not_active")
}
