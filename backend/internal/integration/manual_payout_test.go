//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/manualpayout"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/transferattempt"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resale"
)

func manualObligation(t *testing.T, f *resaleFixture, confirm bool) payments.TransferView {
	t.Helper()
	raw, err := json.Marshal(map[string]string{"offer_id": f.offer.ID})
	if err != nil {
		t.Fatal(err)
	}
	if err = f.store.SellerObligationHandler()(t.Context(), jobs.Job{Payload: raw}); err != nil {
		t.Fatal(err)
	}
	rows, err := f.store.SellerPayouts(t.Context(), f.base.other, f.offer.SubmissionID, false)
	if err != nil || len(rows) != 1 {
		t.Fatal("missing payout obligation", err)
	}
	if !confirm {
		return rows[0]
	}
	row, err := f.store.ConfirmSellerRecipient(t.Context(), f.base.other, rows[0].ID, payments.RecipientInput{Version: rows[0].Version, Address: "synthetic-seller-destination", Accept: true})
	if err != nil {
		t.Fatal(err)
	}
	return row
}

func manualInput(f *resaleFixture, row payments.TransferView) payments.ManualPayoutInput {
	return payments.ManualPayoutInput{RequestKey: uuid.NewString(), Version: row.Version, Amount: row.Amount, Currency: row.Currency, Network: row.Network, Recipient: row.Recipient, TransactionHash: strings.Repeat("AB", 32), CompletedAt: time.Unix(f.base.auth.clock.Load(), 0), Reason: "Synthetic staff verification of the exact completed transfer.", Confirm: true}
}

func TestManualPayoutExactTermsAuthorizationAndIdempotentCompletion(t *testing.T) {
	f := resaleDB(t, "buy_first")
	ctx := t.Context()
	provider := &outgoingFixture{}
	f.store.ConfigureOutgoing(provider, false)
	row := manualObligation(t, f, true)
	input := manualInput(f, row)
	if _, err := f.resale.ChangeListing(ctx, f.base.admin, f.listing.ID, "publish", resale.ListingInput{Version: f.listing.Version, Product: resaleProduct(), PublicReviewed: true}); err == nil {
		t.Fatal("buy-first listing published before seller payment")
	}
	for _, principal := range []*identity.Principal{f.base.other, f.base.buyer} {
		if _, err := f.store.RecordManualSellerPayout(ctx, principal, row.ID, input); err == nil {
			t.Fatal("non-owner recorded payout")
		}
	}
	for name, change := range map[string]func(*payments.ManualPayoutInput){
		"amount":           func(v *payments.ManualPayoutInput) { v.Amount = "11" },
		"currency":         func(v *payments.ManualPayoutInput) { v.Currency = "usdtbsc" },
		"network":          func(v *payments.ManualPayoutInput) { v.Network = "bsc"; v.TransactionHash = "0x" + v.TransactionHash },
		"destination":      func(v *payments.ManualPayoutInput) { v.Recipient.Address = "different-synthetic-address" },
		"memo":             func(v *payments.ManualPayoutInput) { v.Recipient.Memo = "different-tag" },
		"version":          func(v *payments.ManualPayoutInput) { v.Version++ },
		"attestation":      func(v *payments.ManualPayoutInput) { v.Confirm = false },
		"future":           func(v *payments.ManualPayoutInput) { v.CompletedAt = v.CompletedAt.Add(time.Hour) },
		"before-recipient": func(v *payments.ManualPayoutInput) { v.CompletedAt = v.CompletedAt.Add(-time.Hour) },
		"note":             func(v *payments.ManualPayoutInput) { v.Reason = "short" },
		"hash":             func(v *payments.ManualPayoutInput) { v.TransactionHash = "not-a-chain-hash" },
	} {
		v := input
		change(&v)
		if _, err := f.store.RecordManualSellerPayout(ctx, f.base.admin, row.ID, v); err == nil {
			t.Fatalf("accepted changed %s", name)
		}
	}
	now := time.Unix(f.base.auth.clock.Load(), 0)
	// Existing receipt from a different payout must reserve its network/hash.
	if _, err := f.base.auth.client.ManualPayout.Create().SetID(uuid.NewString()).SetTransferID(uuid.NewString()).SetRequestHash(strings.Repeat("a", 64)).SetNetwork(input.Network).SetTransactionHash(strings.ToLower(input.TransactionHash)).SetSnapshot(map[string]any{}).SetRecordedBy(f.base.admin.User.ID).SetReason("Previously recorded synthetic external payout.").SetCompletedAt(now).SetCreatedAt(now).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := f.store.RecordManualSellerPayout(ctx, f.base.admin, row.ID, input); !errors.Is(err, payments.ErrConflict) {
		t.Fatal("same transaction reused across payouts", err)
	}
	input.TransactionHash = strings.Repeat("CD", 32)
	if _, err := f.base.auth.client.User.UpdateOneID(f.base.admin.User.ID).SetRole(identity.RoleAdmin).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := f.store.RecordManualSellerPayout(ctx, f.base.admin, row.ID, input); err == nil {
		t.Fatal("administrator without owner role recorded payment")
	}
	if _, err := f.base.auth.client.User.UpdateOneID(f.base.admin.User.ID).SetRole(identity.RoleOwner).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := f.base.auth.client.AuthSession.UpdateOneID(f.base.admin.Session.ID).SetAuthenticatedAt(now.Add(-11 * time.Minute)).SetMfaVerifiedAt(now.Add(-11 * time.Minute)).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := f.store.RecordManualSellerPayout(ctx, f.base.admin, row.ID, input); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("missing recent verification", err)
	}
	if _, err := f.base.auth.client.AuthSession.UpdateOneID(f.base.admin.Session.ID).SetMfaVerifiedAt(now).Save(ctx); err != nil {
		t.Fatal(err)
	}
	var wait sync.WaitGroup
	errorsCh := make(chan error, 2)
	for range 2 {
		wait.Go(func() {
			saved, err := f.store.RecordManualSellerPayout(ctx, f.base.admin, row.ID, input)
			if err == nil && (saved.State != "confirmed" || saved.ManualReceipt == nil || saved.ManualReceipt.TransactionHash != strings.ToLower(input.TransactionHash)) {
				err = errors.New("missing staff receipt")
			}
			errorsCh <- err
		})
	}
	wait.Wait()
	close(errorsCh)
	for err := range errorsCh {
		if err != nil {
			t.Fatal("idempotent concurrent replay", err)
		}
	}
	changed := input
	changed.Reason = "Different attestation cannot reuse the original receipt key."
	if _, err := f.store.RecordManualSellerPayout(ctx, f.base.admin, row.ID, changed); !errors.Is(err, payments.ErrConflict) {
		t.Fatal("idempotency payload changed", err)
	}
	input.RequestKey = uuid.NewString()
	if _, err := f.store.RecordManualSellerPayout(ctx, f.base.admin, row.ID, input); !errors.Is(err, payments.ErrConflict) {
		t.Fatal("second completion accepted", err)
	}
	count, err := f.base.auth.client.ManualPayout.Query().Where(manualpayout.TransferIDEQ(row.ID)).Count(ctx)
	if err != nil || count != 1 {
		t.Fatal("duplicate manual receipt", count, err)
	}
	attempts, err := f.base.auth.client.TransferAttempt.Query().Where(transferattempt.TransferIDEQ(row.ID)).Count(ctx)
	if err != nil || attempts != 0 || provider.creates != 0 || provider.verifies != 0 {
		t.Fatal("manual workflow invoked outgoing provider", err)
	}
	history, err := f.store.ReadTransferHistory(ctx, f.base.other, row.ID, "seller_payout", false, 0)
	if err != nil || len(history.Events) != 3 || len(history.Attempts) != 0 {
		t.Fatal("missing private history", err)
	}
	last := history.Events[len(history.Events)-1]
	if last.Action != "manual_confirmed" || last.Snapshot == nil || last.Snapshot.ManualReceipt == nil || last.Snapshot.Amount != row.Amount || last.Snapshot.Recipient != row.Recipient {
		t.Fatal("manual snapshot changed accepted terms")
	}
	raw, err := json.Marshal(history)
	if err != nil || strings.Contains(string(raw), input.Reason) || strings.Contains(string(raw), f.base.admin.User.ID) {
		t.Fatal("internal staff details exposed", err)
	}
	if _, err = f.store.ReadTransferHistory(ctx, f.base.buyer, row.ID, "seller_payout", false, 0); err == nil {
		t.Fatal("unrelated customer read payout")
	}
	f.publish(t)
	if err = database.Ready(ctx, f.base.auth.db); err != nil {
		t.Fatal("schema42 readiness", err)
	}
	if err = runner(t, f.base.auth.db).Down(ctx, 1); err == nil {
		t.Fatal("manual financial receipts allowed destructive rollback")
	}
	if err = runner(t, f.base.auth.db).Apply(ctx, 42); err != nil {
		t.Fatal("idempotent schema42 migration", err)
	}
}

func TestManualPayoutHoldsAndProviderAttempts(t *testing.T) {
	f := resaleDB(t, "consignment")
	ctx := t.Context()
	f.store.ConfigureOutgoing(&outgoingFixture{}, false)
	pending := manualObligation(t, f, false)
	if _, err := f.store.RecordManualSellerPayout(ctx, f.base.admin, pending.ID, manualInput(f, pending)); err == nil {
		t.Fatal("unconfirmed destination accepted")
	}
	row := manualObligation(t, f, true)
	if _, err := f.store.RecordManualSellerPayout(ctx, f.base.admin, row.ID, manualInput(f, row)); err == nil {
		t.Fatal("unfulfilled consignment payout accepted")
	}
	rows, err := f.store.SellerPayouts(ctx, f.base.admin, f.offer.SubmissionID, true)
	if err != nil || len(rows) != 1 || rows[0].ManualRecording == nil || rows[0].ManualRecording.Reason != "eligibility_hold" {
		t.Fatal("missing hold explanation", err)
	}
	f.store.ConfigureOutgoing(&outgoingFixture{}, true)
	rows, err = f.store.SellerPayouts(ctx, f.base.admin, f.offer.SubmissionID, true)
	if err != nil || rows[0].ManualRecording.Reason != "automatic_enabled" {
		t.Fatal("competing payment methods", err)
	}
	f.store.ConfigureOutgoing(&outgoingFixture{}, false)
	if _, err = f.base.auth.client.MoneyTransfer.UpdateOneID(row.ID).SetCurrentAttempt(uuid.NewString()).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.store.RecordManualSellerPayout(ctx, f.base.admin, row.ID, manualInput(f, row)); err == nil {
		t.Fatal("provider attempt overridden")
	}
}
