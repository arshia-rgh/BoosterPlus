//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentrecord"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// Deliberately separate from hosted fixtures; only these tests enable native writes.
type nativePaymentProvider struct {
	*paymentProvider
	depositCalls int
	depositError error
}

func (p *nativePaymentProvider) CreateInvoicePayment(_ context.Context, invoice, asset string) (string, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.depositCalls++
	if invoice != "1" || asset != "usdttrc20" {
		return "", nowpayments.ErrInvalid
	}
	return "100", p.depositError
}
func nativePaymentDB(t *testing.T) (*paymentFixture, *nativePaymentProvider) {
	t.Helper()
	f := paymentDB(t)
	f.provider.legacyNative = true // Exercise persisted attempts from the previous release.
	p := &nativePaymentProvider{paymentProvider: f.provider}
	f.store = payments.New(f.base.auth.client, f.base.auth.service, p, "fixture:synthetic-merchant", true, func() time.Time { return time.Unix(f.base.auth.clock.Load(), 0) })
	return f, p
}
func TestNativeCheckoutCreationRecoveryAndPrivateInstructions(t *testing.T) {
	for _, ambiguous := range []bool{false, true} {
		t.Run(map[bool]string{false: "returned", true: "lost-response"}[ambiguous], func(t *testing.T) {
			f, provider := nativePaymentDB(t)
			ctx := t.Context()
			if ambiguous {
				provider.depositError = nowpayments.ErrAmbiguous
			}
			detail := f.base.create(t, "package")
			attempt := f.start(t, detail)
			raw, err := json.Marshal(map[string]string{"attempt_id": attempt.ID})
			if err != nil {
				t.Fatal(err)
			}
			var wg sync.WaitGroup
			for range 5 {
				wg.Go(func() {
					if e := f.store.InvoiceHandler()(ctx, jobs.Job{Payload: raw}); e != nil {
						t.Error(e)
					}
				})
			}
			wg.Wait()
			if provider.calls != 1 || provider.depositCalls != 1 {
				t.Fatal("duplicate provider write")
			}
			stored, e := f.base.auth.client.PaymentAttempt.Get(ctx, attempt.ID)
			if e != nil || stored.CheckoutURL != "" {
				t.Fatal("native hosted fallback persisted", e)
			}
			before, err := f.store.History(ctx, f.base.buyer, detail.Order.ID, false)
			if err != nil || len(before.Attempts) != 1 || !before.Attempts[0].NativeCheckout || before.Attempts[0].CheckoutURL != "" || before.Attempts[0].Deposit != nil {
				t.Fatal("creation treated as evidence", err)
			}
			p := f.evidence(t, attempt, "100", "waiting", "0")
			p.Destination = &nowpayments.Destination{Address: "synthetic-not-payable-address", Memo: "memo-123", ExpiresAt: time.Unix(f.base.auth.clock.Load(), 0).Add(10 * time.Minute)}
			provider.set(p)
			if err = f.store.Discover(ctx); err != nil {
				t.Fatal(err)
			}
			record, err := f.base.auth.client.PaymentRecord.Query().Where(paymentrecord.PaymentIDEQ("100")).Only(ctx)
			if err != nil {
				t.Fatal(err)
			}
			if err = f.store.Reconcile(ctx, record.ID); err != nil {
				t.Fatal(err)
			}
			history, err := f.store.History(ctx, f.base.buyer, detail.Order.ID, false)
			if err != nil || history.Attempts[0].Deposit == nil || history.Attempts[0].InstructionStatus != "ready" || history.Attempts[0].Deposit.Amount != "12.34000001" || len(history.Receipts) != 0 {
				t.Fatal("read-back instructions", err)
			}
			assertNativeContract(t, history)
			if _, err = f.store.History(ctx, f.base.other, detail.Order.ID, false); !ent.IsNotFound(err) {
				t.Fatal("destination leaked", err)
			}
			list, err := f.store.List(ctx, f.base.admin, "", "")
			if err != nil || list.Attempts[0].Deposit != nil || list.Attempts[0].CheckoutURL != "" {
				t.Fatal("finance queue leaked payable destination", err)
			}
			paused := payments.New(f.base.auth.client, f.base.auth.service, provider, "fixture:synthetic-merchant", false, func() time.Time { return time.Unix(f.base.auth.clock.Load(), 0) })
			history, err = paused.History(ctx, f.base.buyer, detail.Order.ID, false)
			if err != nil || history.Enabled || history.Attempts[0].Deposit == nil {
				t.Fatal("pause erased existing payment", err)
			}
			invalid := p
			invalid.InvoiceID = "999"
			provider.set(invalid)
			if err = f.store.Reconcile(ctx, record.ID); err != nil {
				t.Fatal(err)
			}
			history, err = f.store.History(ctx, f.base.buyer, detail.Order.ID, false)
			if err != nil || history.Attempts[0].Deposit != nil {
				t.Fatal("mismatched read kept old payable instructions", err)
			}
			provider.set(p)
			if err = f.store.Reconcile(ctx, record.ID); err != nil {
				t.Fatal(err)
			}
			provider.mu.Lock()
			provider.readError = nowpayments.ErrUnavailable
			provider.mu.Unlock()
			if err = f.store.Reconcile(ctx, record.ID); !errors.Is(err, nowpayments.ErrUnavailable) {
				t.Fatal(err)
			}
			history, err = f.store.History(ctx, f.base.buyer, detail.Order.ID, false)
			if err != nil || history.Attempts[0].Deposit != nil || history.Attempts[0].InstructionStatus != "refreshing" {
				t.Fatal("failed read retained payable instructions", err)
			}
			provider.mu.Lock()
			provider.readError = nil
			provider.mu.Unlock()
			if err = f.store.Reconcile(ctx, record.ID); err != nil {
				t.Fatal(err)
			}
			f.base.auth.clock.Add(121)
			history, err = f.store.History(ctx, f.base.buyer, detail.Order.ID, false)
			if err != nil || history.Attempts[0].Deposit != nil || history.Attempts[0].InstructionStatus != "refreshing" {
				t.Fatal("stale instructions exposed", err)
			}
			p.Status = "confirming"
			provider.set(p)
			if err = paused.Reconcile(ctx, record.ID); err != nil {
				t.Fatal(err)
			}
			history, err = paused.History(ctx, f.base.buyer, detail.Order.ID, false)
			if err != nil || history.Attempts[0].Deposit != nil || history.Attempts[0].State != "confirming" {
				t.Fatal("confirmation still asks for deposit", err)
			}
			p.Status = "finished"
			p.ActuallyPaid = p.PayAmount
			provider.set(p)
			if err = paused.Reconcile(ctx, record.ID); err != nil {
				t.Fatal(err)
			}
			history, err = paused.History(ctx, f.base.buyer, detail.Order.ID, false)
			if err != nil || history.Attempts[0].State != "settled" || history.Attempts[0].Deposit != nil || len(history.Receipts) != 1 {
				t.Fatal("native settlement", err)
			}
			f.issue(t, attempt)
			if provider.depositCalls != 1 {
				t.Fatal("repeated native creation after reconciliation")
			}
		})
	}
}
func TestNativeCheckoutClaimSurvivesCrash(t *testing.T) {
	f, provider := nativePaymentDB(t)
	ctx := t.Context()
	detail := f.base.create(t, "package")
	a := f.start(t, detail)
	// Simulate a worker dying after durable claim but before recording the response.
	if _, err := f.base.auth.client.PaymentAttempt.UpdateOneID(a.ID).SetPostClaimed(true).SetInvoiceID("1").SetState("awaiting_payment").SetDepositClaimed(true).Save(ctx); err != nil {
		t.Fatal(err)
	}
	f.issue(t, a)
	if err := f.store.Maintain(ctx); err != nil {
		t.Fatal(err)
	}
	if provider.depositCalls != 0 || provider.calls != 0 {
		t.Fatal("crashed write was retried")
	}
}
func TestNativeCheckoutUnclaimedInvoiceResumesOnlyWhenEnabled(t *testing.T) {
	f, provider := nativePaymentDB(t)
	ctx := t.Context()
	detail := f.base.create(t, "package")
	a := f.start(t, detail)
	if _, err := f.base.auth.client.PaymentAttempt.UpdateOneID(a.ID).SetPostClaimed(true).SetInvoiceID("1").SetState("awaiting_payment").Save(ctx); err != nil {
		t.Fatal(err)
	}
	paused := payments.New(f.base.auth.client, f.base.auth.service, provider, "fixture:synthetic-merchant", false, func() time.Time { return time.Unix(f.base.auth.clock.Load(), 0) })
	if err := paused.Maintain(ctx); err != nil {
		t.Fatal(err)
	}
	if provider.depositCalls != 0 {
		t.Fatal("paused checkout made a write")
	}
	if err := f.store.Maintain(ctx); err != nil {
		t.Fatal(err)
	}
	if err := f.store.Maintain(ctx); err != nil {
		t.Fatal(err)
	}
	if provider.depositCalls != 1 || provider.calls != 0 {
		t.Fatal("native recovery write count")
	}
}
func TestNativeCheckoutExplicitMigrationReadiness(t *testing.T) {
	db := testDB(t)
	ctx := t.Context()
	r := runner(t, db)
	if err := r.Apply(ctx, 28); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(ctx, db); err == nil {
		t.Fatal("old schema accepted")
	}
	if err := r.Apply(ctx, 29); err != nil {
		t.Fatal(err)
	}
	if err := r.Verify(ctx); err != nil {
		t.Fatal("native checkout migration journal", err)
	}
	// SQL defaults, not an application migration, protect existing hosted attempts.
	var native, claimed string
	if err := db.QueryRowContext(ctx, "SELECT column_default FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='payment_attempts' AND column_name='native_checkout'").Scan(&native); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRowContext(ctx, "SELECT column_default FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='payment_attempts' AND column_name='deposit_claimed'").Scan(&claimed); err != nil {
		t.Fatal(err)
	}
	if native != "0" || claimed != "1" {
		t.Fatal("unsafe migration defaults")
	}
	if err := r.Down(ctx, 1); err != nil {
		t.Fatal(err)
	}
	var columns int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='payment_attempts' AND column_name IN ('native_checkout','deposit_claimed','deposit_payment_id','deposit_data')").Scan(&columns); err != nil || columns != 0 {
		t.Fatal("rollback retained native checkout columns", err)
	}
	if err := database.Ready(ctx, db); err == nil {
		t.Fatal("rollback accepted")
	}
	if err := r.Apply(ctx, 0); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(ctx, db); err != nil {
		t.Fatal(err)
	}
	executeSQL(t, db, "ALTER TABLE payment_attempts DROP COLUMN deposit_claimed")
	if err := database.Ready(ctx, db); err == nil {
		t.Fatal("drift accepted")
	}
}

func assertNativeContract(t *testing.T, history payments.History) {
	t.Helper()
	var contract any
	if err := json.Unmarshal(api.Contract, &contract); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err := compiler.AddResource("contract.json", contract); err != nil {
		t.Fatal(err)
	}
	schema, err := compiler.Compile("contract.json#/components/schemas/PaymentHistory")
	if err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(history)
	if err != nil {
		t.Fatal(err)
	}
	var value any
	if err = json.Unmarshal(raw, &value); err != nil {
		t.Fatal(err)
	}
	if err = schema.Validate(value); err != nil {
		t.Fatal(err)
	}
}
