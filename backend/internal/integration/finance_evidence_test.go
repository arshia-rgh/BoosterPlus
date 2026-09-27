//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

func TestFinanceEvidencePreservesExactAmountsAndStaleObservation(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	a := f.start(t, f.base.create(t, "package"))
	f.issue(t, a)
	observed := f.evidence(t, a, "771", "partially_paid", "0.1234567890123456789")
	observed.Destination = &nowpayments.Destination{Address: "private-provider-destination"}
	row := f.reconcile(t, observed)
	queue, err := f.store.List(ctx, f.base.admin, "", "")
	if err != nil || len(queue.Attempts) != 1 || len(queue.Attempts[0].Evidence) != 1 {
		t.Fatal("missing staff evidence", err)
	}
	evidence := queue.Attempts[0].Evidence[0]
	if evidence.ExpectedAmount != "12.34000001" || evidence.ReceivedAmount != "0.1234567890123456789" || evidence.Currency != "usdttrc20" || evidence.Network != "trx" || evidence.ObservedAt == nil {
		t.Fatal("inexact provider evidence", evidence)
	}
	original := *evidence.ObservedAt
	f.base.auth.clock.Add(30)
	f.provider.mu.Lock()
	f.provider.readError = nowpayments.ErrUnavailable
	f.provider.mu.Unlock()
	if err = f.store.Reconcile(ctx, row.ID); !errors.Is(err, nowpayments.ErrUnavailable) {
		t.Fatal("failed read", err)
	}
	queue, err = f.store.List(ctx, f.base.admin, "", "")
	if err != nil {
		t.Fatal(err)
	}
	evidence = queue.Attempts[0].Evidence[0]
	if evidence.Issue != "provider_unavailable" || evidence.ObservedAt == nil || !evidence.ObservedAt.Equal(original) || evidence.CheckedAt == nil || !evidence.CheckedAt.Equal(original.Add(30*time.Second)) {
		t.Fatal("failure erased evidence or used a false fresh timestamp", evidence)
	}
	raw, err := json.Marshal(queue)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(raw), "private-provider-destination") || strings.Contains(string(raw), "fixture:synthetic-merchant") {
		t.Fatal("private provider data exposed")
	}
	if _, err = f.store.List(ctx, f.base.buyer, "", ""); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer accessed finance evidence", err)
	}
}

func TestFinanceEvidenceRejectsAmountsFromMismatchedAttempt(t *testing.T) {
	f := paymentDB(t)
	a := f.start(t, f.base.create(t, "package"))
	f.issue(t, a)
	observed := f.evidence(t, a, "772", "partially_paid", "0.1234567890123456789")
	f.reconcile(t, observed)
	observed.AttemptID = uuid.NewString()
	f.reconcile(t, observed)
	queue, err := f.store.List(t.Context(), f.base.admin, "", "")
	if err != nil || len(queue.Attempts) != 1 || len(queue.Attempts[0].Evidence) != 1 {
		t.Fatal("missing linked exception", err)
	}
	evidence := queue.Attempts[0].Evidence[0]
	if evidence.Issue != "unknown_attempt" || evidence.ExpectedAmount != "" || evidence.ReceivedAmount != "" || evidence.Currency != "" || evidence.Network != "" {
		t.Fatal("misassociated amounts exposed", evidence)
	}
}

func TestFinanceEvidenceBoundedAndIsolated(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	a := f.start(t, f.base.create(t, "package"))
	now := time.Unix(f.base.auth.clock.Load(), 0)
	for i := range 12 {
		_, err := f.base.auth.client.PaymentRecord.Create().SetAccount("fixture:synthetic-merchant").SetPaymentID(strconv.Itoa(800 + i)).SetAttemptID(a.ID).SetData(map[string]any{}).SetCreatedAt(now).SetCheckedAt(now.Add(time.Duration(i) * time.Second)).Save(ctx)
		if err != nil {
			t.Fatal(err)
		}
	}
	_, err := f.base.auth.client.PaymentRecord.Create().SetAccount("fixture:other-merchant").SetPaymentID("999").SetAttemptID(a.ID).SetData(map[string]any{}).SetCreatedAt(now).SetCheckedAt(now.Add(time.Hour)).Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	queue, err := f.store.List(ctx, f.base.admin, "", "")
	if err != nil || len(queue.Attempts) != 1 {
		t.Fatal("missing attempt", err)
	}
	item := queue.Attempts[0]
	if !item.MoreEvidence || len(item.Evidence) != 10 || item.Evidence[0].PaymentID != "811" || item.Evidence[9].PaymentID != "802" {
		t.Fatal("incorrect evidence bound or merchant isolation", item.Evidence)
	}
	for _, evidence := range item.Evidence {
		if evidence.CheckedAt != nil || evidence.ObservedAt != nil || evidence.ReceivedAmount != "" {
			t.Fatal("unread record reported observation", evidence)
		}
	}
	// Checkout and outgoing activation are independent and both require a provider.
	store := payments.New(f.base.auth.client, f.base.auth.service, f.provider, "fixture:synthetic-merchant", false, func() time.Time { return now })
	for _, tc := range []struct {
		provider      payments.OutgoingProvider
		enabled, want bool
	}{
		{nil, true, false}, {&outgoingFixture{}, false, false}, {&outgoingFixture{}, true, true},
	} {
		store.ConfigureOutgoing(tc.provider, tc.enabled)
		settings, readErr := store.Settings(ctx, f.base.admin)
		if readErr != nil || settings.Enabled || settings.OutgoingEnabled != tc.want {
			t.Fatal("incorrect independent payment switches", settings, readErr)
		}
	}
}
