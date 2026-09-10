//go:build integration

package integration

import (
	"bytes"
	"encoding/json"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

type fulfillmentFixture struct {
	*orderFixture
	work            *fulfillment.Store
	booster, second *identity.Principal
}

func fulfillmentDB(t *testing.T) *fulfillmentFixture {
	t.Helper()
	f := orderDB(t)
	c := f.game.Configuration
	c.Services[0].Fulfillment = &catalog.FulfillmentPolicy{Mode: "selection", Field: "mode", AccountValue: "solo", TogetherValue: "duo", SecretHours: 24, ShareFields: []string{"mode", "player"}}
	c.Services[0].Fields = append(c.Services[0].Fields, catalog.Field{Key: "player", Label: "Player identifier", Type: "short_text", Stage: "fulfillment", Required: true, MinLength: 1, MaxLength: 80})
	c.Packages[0].Variants[0].Eligibility = nil
	var err error
	f.game, err = f.catalog.Mutate(t.Context(), f.admin, f.game.ID, "save", catalog.Change{Revision: f.game.Revision, Configuration: c})
	if err != nil {
		t.Fatal(err)
	}
	f.game, err = f.catalog.Mutate(t.Context(), f.admin, f.game.ID, "publish", catalog.Change{Revision: f.game.Revision})
	if err != nil {
		t.Fatal(err)
	}
	staff := func(email string) *identity.Principal {
		_, p := f.auth.login(t, email)
		if _, e := f.auth.client.User.UpdateOneID(p.User.ID).SetRole(identity.RoleBooster).SetStaffAlias("Synthetic booster").Save(t.Context()); e != nil {
			t.Fatal(e)
		}
		p = f.auth.principalFromSession(t, p)
		_, _, p = f.auth.enroll(t, p)
		return p
	}
	ring, err := vault.NewKeyring("v1", map[string][]byte{"v1": vaultKey(t)})
	if err != nil {
		t.Fatal(err)
	}
	store, err := fulfillment.New(f.auth.client, f.auth.service, ring, func() time.Time { return time.Unix(f.auth.clock.Load(), 0) })
	if err != nil {
		t.Fatal(err)
	}
	return &fulfillmentFixture{f, store, staff("workstaff@example.test"), staff("worksecond@example.test")}
}
func (f *fulfillmentFixture) paid(t *testing.T, mode string) orders.Detail {
	t.Helper()
	input := f.input("package")
	input.Answers["mode"] = json.RawMessage(`"` + mode + `"`)
	detail, err := f.store.Create(t.Context(), f.buyer, input)
	if err != nil {
		t.Fatal(err)
	}
	// Synthetic verified settlement exists only in this isolated test database.
	// Production exposes no endpoint or configuration to bypass P07 evidence.
	if _, err = f.auth.client.OrderContract.UpdateOneID(detail.Contract.ID).SetPaymentState(ordercontract.PaymentStateSettled).Save(t.Context()); err != nil {
		t.Fatal(err)
	}
	if _, err = f.auth.client.Order.UpdateOneID(detail.Order.ID).SetState(order.StateQueued).Save(t.Context()); err != nil {
		t.Fatal(err)
	}
	return detail
}
func (f *fulfillmentFixture) assign(t *testing.T, detail orders.Detail) fulfillment.View {
	t.Helper()
	value, err := f.work.Assign(t.Context(), f.admin, detail.Order.ID, fulfillment.Assignment{OrderVersion: detail.Order.Version, AssignedID: f.booster.User.ID, Reason: "Assign reviewed work"})
	if err != nil {
		t.Fatal(err)
	}
	return value
}
func (f *fulfillmentFixture) handoff(t *testing.T, v fulfillment.View) fulfillment.View {
	t.Helper()
	value, err := f.work.SaveHandoff(t.Context(), f.buyer, v.OrderID, fulfillment.Handoff{Version: v.Version, OrderVersion: v.OrderVersion, Answers: catalog.Answers{"player": json.RawMessage(`"synthetic-player"`)}})
	if err != nil {
		t.Fatal(err)
	}
	return value
}
func updateWork(v fulfillment.View) fulfillment.Update {
	return fulfillment.Update{Version: v.Version, OrderVersion: v.OrderVersion, Note: "Customer-visible synthetic progress"}
}
func TestFulfillmentPaidAuthorizationAndBothModes(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	unpaid := f.create(t, "package")
	if _, err := f.work.Assign(ctx, f.admin, unpaid.Order.ID, fulfillment.Assignment{OrderVersion: 1, AssignedID: f.booster.User.ID, Reason: "Must deny unpaid"}); !errors.Is(err, fulfillment.ErrConflict) {
		t.Fatal("unpaid assignment", err)
	}
	if _, err := f.store.Transition(ctx, f.buyer, unpaid.Order.ID, "cancel", false, orders.Action{Version: 1}); err != nil {
		t.Fatal(err)
	}
	detail := f.paid(t, "solo")
	v := f.assign(t, detail)
	if _, err := f.work.Get(ctx, f.second, v.OrderID, "booster"); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("unassigned access", err)
	}
	if _, err := f.work.Get(ctx, f.other, v.OrderID, "account"); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("foreign customer", err)
	}
	if _, err := f.work.Transition(ctx, f.booster, v.OrderID, "booster", "start", updateWork(v)); err == nil {
		t.Fatal("started without handoff")
	}
	v = f.handoff(t, v)
	if _, err := f.work.Transition(ctx, f.booster, v.OrderID, "booster", "start", updateWork(v)); err == nil {
		t.Fatal("started account mode without credential")
	}
	secret := fulfillment.SecretInput{WorkVersion: v.Version, RequestKey: uuid.NewString(), ExpiresAt: time.Unix(f.auth.clock.Load(), 0).Add(time.Hour), Value: []byte("synthetic temporary game access")}
	expected := bytes.Clone(secret.Value)
	meta, err := f.work.SubmitSecret(ctx, f.buyer, v.OrderID, secret)
	if err != nil {
		t.Fatal(err)
	}
	secret.Value = bytes.Clone(expected)
	retry, err := f.work.SubmitSecret(ctx, f.buyer, v.OrderID, secret)
	if err != nil || retry.Version != meta.Version {
		t.Fatal("secret retry", err)
	}
	if raw, e := f.work.RevealSecret(ctx, f.second, v.OrderID, "booster"); e == nil || raw != nil {
		t.Fatal("unassigned reveal")
	}
	raw, err := f.work.RevealSecret(ctx, f.booster, v.OrderID, "booster")
	if err != nil || !bytes.Equal(raw, expected) {
		t.Fatal("assigned reveal", err)
	}
	clear(raw)
	visible, err := f.work.Get(ctx, f.booster, v.OrderID, "booster")
	if err != nil {
		t.Fatal(err)
	}
	encoded, err := json.Marshal(visible)
	if err != nil {
		t.Fatal(err)
	}
	for _, private := range []string{f.buyer.User.ID, f.buyer.User.Email, "ordinary customer note", "amount_minor", "coupon_code"} {
		if bytes.Contains(encoded, []byte(private)) {
			t.Fatal("private commerce leaked to booster")
		}
	}
	v, err = f.work.Transition(ctx, f.booster, v.OrderID, "booster", "start", updateWork(v))
	if err != nil {
		t.Fatal(err)
	}
	u := updateWork(v)
	u.Progress = 80
	v, err = f.work.Transition(ctx, f.booster, v.OrderID, "booster", "progress", u)
	if err != nil {
		t.Fatal(err)
	}
	v, err = f.work.Transition(ctx, f.booster, v.OrderID, "booster", "submit_completion", updateWork(v))
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.work.Transition(ctx, f.booster, v.OrderID, "booster", "approve_completion", updateWork(v)); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("booster completed own work", err)
	}
	v, err = f.work.Transition(ctx, f.admin, v.OrderID, "admin", "approve_completion", updateWork(v))
	if err != nil || v.State != "completed" || v.Progress != 100 {
		t.Fatal(v.State, err)
	}
	if raw, err = f.work.RevealSecret(ctx, f.booster, v.OrderID, "booster"); err == nil || raw != nil {
		t.Fatal("completed secret revealed")
	}
	status, err := f.work.SecretStatus(ctx, f.buyer, v.OrderID)
	if err != nil || status.State != "deleted" {
		t.Fatal(status, err)
	}
	together := f.paid(t, "duo")
	v = f.handoff(t, f.assign(t, together))
	secret.Value = bytes.Clone(expected)
	secret.WorkVersion = v.Version
	if _, err = f.work.SubmitSecret(ctx, f.buyer, v.OrderID, secret); err == nil {
		t.Fatal("together collected game credential")
	}
	v = f.book(t, v)
	v, err = f.work.Transition(ctx, f.booster, v.OrderID, "booster", "start", updateWork(v))
	if err != nil || v.Mode != "together" {
		t.Fatal(err)
	}
}
func TestFulfillmentConcurrentAssignmentRevocationAndAudit(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	detail := f.paid(t, "solo")
	v := f.handoff(t, f.assign(t, detail))
	expiry := time.Unix(f.auth.clock.Load(), 0).Add(time.Hour)
	if _, err := f.work.SubmitSecret(ctx, f.buyer, v.OrderID, fulfillment.SecretInput{WorkVersion: v.Version, RequestKey: uuid.NewString(), ExpiresAt: expiry, Value: []byte("synthetic private value")}); err != nil {
		t.Fatal(err)
	}
	var wins atomic.Int64
	var wg sync.WaitGroup
	for range 5 {
		wg.Go(func() {
			_, err := f.work.Assign(ctx, f.admin, v.OrderID, fulfillment.Assignment{Version: v.Version, OrderVersion: v.OrderVersion, AssignedID: f.second.User.ID, Reason: "Reassign with fresh handoff"})
			if err == nil {
				wins.Add(1)
			} else if !errors.Is(err, fulfillment.ErrConflict) {
				t.Error(err)
			}
		})
	}
	wg.Wait()
	if wins.Load() != 1 {
		t.Fatal("concurrent assignment", wins.Load())
	}
	if _, err := f.work.Get(ctx, f.booster, v.OrderID, "booster"); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("old assignee retained access", err)
	}
	if raw, err := f.work.RevealSecret(ctx, f.second, v.OrderID, "booster"); err == nil || raw != nil {
		t.Fatal("new assignee got old secret")
	}
	latest, err := f.work.Get(ctx, f.admin, v.OrderID, "admin")
	if err != nil || latest.State != "on_hold" {
		t.Fatal(err)
	}
	if _, err = f.auth.db.ExecContext(ctx, "DROP TABLE auth_audits"); err != nil {
		t.Fatal(err)
	}
	if _, err = f.work.Assign(ctx, f.admin, v.OrderID, fulfillment.Assignment{Version: latest.Version, OrderVersion: latest.OrderVersion, AssignedID: f.booster.User.ID, Reason: "Must roll back"}); err == nil {
		t.Fatal("assignment committed without audit")
	}
	after, err := f.work.Get(ctx, f.admin, v.OrderID, "admin")
	if err != nil || after.AssignedID != f.second.User.ID || after.Version != latest.Version {
		t.Fatal("audit rollback lost", err)
	}
}

func TestFulfillmentFreshFactorsAndUnsharedHandoff(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	v := f.handoff(t, f.assign(t, f.paid(t, "solo")))
	for _, input := range []fulfillment.Handoff{
		{Version: v.Version, OrderVersion: v.OrderVersion, Answers: catalog.Answers{"mode": json.RawMessage(`"duo"`)}},
		{Version: v.Version, OrderVersion: v.OrderVersion, Answers: catalog.Answers{"player": json.RawMessage(`true`)}},
	} {
		if _, err := f.work.SaveHandoff(ctx, f.buyer, v.OrderID, input); err == nil {
			t.Fatal("immutable or invalid handoff changed")
		}
	}
	input := fulfillment.SecretInput{WorkVersion: v.Version, RequestKey: uuid.NewString(), ExpiresAt: time.Unix(f.auth.clock.Load(), 0).Add(25 * time.Hour), Value: []byte("synthetic game access")}
	if _, err := f.work.SubmitSecret(ctx, f.buyer, v.OrderID, input); err == nil {
		t.Fatal("service credential lifetime exceeded")
	}
	input.ExpiresAt = time.Unix(f.auth.clock.Load(), 0).Add(time.Hour)
	input.Value = []byte("synthetic game access")
	if _, err := f.work.SubmitSecret(ctx, f.other, v.OrderID, input); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("other customer wrote access", err)
	}
	input.Value = []byte("synthetic game access")
	if _, err := f.work.SubmitSecret(ctx, f.buyer, v.OrderID, input); err != nil {
		t.Fatal(err)
	}
	f.auth.clock.Add(601)
	if raw, err := f.work.RevealSecret(ctx, f.booster, v.OrderID, "booster"); !errors.Is(err, identity.ErrRecent) || raw != nil {
		t.Fatal("old primary factor revealed", err)
	}
	if _, err := f.auth.client.AuthSession.UpdateOneID(f.booster.Session.ID).SetAuthenticatedAt(time.Unix(f.auth.clock.Load(), 0)).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if raw, err := f.work.RevealSecret(ctx, f.booster, v.OrderID, "booster"); !errors.Is(err, identity.ErrMFA) || raw != nil {
		t.Fatal("old second factor revealed", err)
	}
	if _, err := f.auth.client.User.UpdateOneID(f.booster.User.ID).SetSuspended(true).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := f.work.Get(ctx, f.booster, v.OrderID, "booster"); !errors.Is(err, identity.ErrUnauthenticated) {
		t.Fatal("suspended staff read work", err)
	}
	if _, err := f.work.Assign(ctx, f.admin, v.OrderID, fulfillment.Assignment{Version: v.Version, OrderVersion: v.OrderVersion, AssignedID: f.second.User.ID, Reason: "Stale administrator must refresh factors"}); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("stale administrator assignment", err)
	}
}
