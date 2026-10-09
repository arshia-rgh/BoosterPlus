//go:build integration

package integration

import (
	"context"
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/couponclaim"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentrecord"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// This provider exists only in integration builds. No runtime endpoint can activate it.
type paymentProvider struct {
	mu             sync.Mutex
	verifier       *nowpayments.Client
	rows           map[string]nowpayments.Payment
	calls          int
	ambiguous      bool
	preflightError error
	legacyNative   bool
	readError      error
	block          chan struct{}
	entered        chan struct{}
}

const paymentTestSecret = "synthetic-payment-ipn-secret-for-tests"

func newPaymentProvider(t *testing.T) *paymentProvider {
	t.Helper()
	verifier, err := nowpayments.New(nowpayments.Config{APIKey: strings.Repeat("synthetic-api", 3), IPNSecret: paymentTestSecret, PublicOrigin: "https://booster.example.test"})
	if err != nil {
		t.Fatal(err)
	}
	return &paymentProvider{verifier: verifier, rows: map[string]nowpayments.Payment{}}
}
func (p *paymentProvider) CheckInvoice(_ context.Context, _ nowpayments.InvoiceRequest) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.preflightError
}
func (p *paymentProvider) CreateInvoice(_ context.Context, _ nowpayments.InvoiceRequest) (nowpayments.Invoice, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.calls++
	id := fmt.Sprint(p.calls)
	if p.ambiguous {
		return nowpayments.Invoice{}, nowpayments.ErrAmbiguous
	}
	return nowpayments.Invoice{ID: id, URL: "https://nowpayments.io/payment/?iid=" + id}, nil
}
func (p *paymentProvider) VerifyWebhook(body []byte, signature string) (nowpayments.Notice, error) {
	return p.verifier.VerifyWebhook(body, signature)
}
func (p *paymentProvider) GetPayment(ctx context.Context, id string) (nowpayments.Payment, error) {
	p.mu.Lock()
	value, ok := p.rows[id]
	err := p.readError
	block, entered := p.block, p.entered
	p.block = nil
	p.entered = nil
	p.mu.Unlock()
	if entered != nil {
		close(entered)
	}
	if block != nil {
		select {
		case <-ctx.Done():
			return nowpayments.Payment{}, ctx.Err()
		case <-block:
		}
	}
	if err != nil {
		return nowpayments.Payment{}, err
	}
	if !ok {
		return nowpayments.Payment{}, nowpayments.ErrUnavailable
	}
	return value, nil
}
func (p *paymentProvider) ListPayments(_ context.Context, _ int) (nowpayments.PaymentPage, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	ids := make([]string, 0, len(p.rows))
	for id := range p.rows {
		ids = append(ids, id)
	}
	slices.Sort(ids)
	return nowpayments.PaymentPage{IDs: ids, Pages: 1}, nil
}
func (p *paymentProvider) set(value nowpayments.Payment) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.rows[value.ID] = value
}

type paymentFixture struct {
	base     *orderFixture
	store    *payments.Store
	provider *paymentProvider
	policy   payments.PolicyView
}

func paymentDB(t *testing.T) *paymentFixture {
	t.Helper()
	base := orderDB(t)
	provider := newPaymentProvider(t)
	store := payments.New(base.auth.client, base.auth.service, provider, "fixture:synthetic-merchant", true, func() time.Time { return time.Unix(base.auth.clock.Load(), 0) })
	policy := payments.Policy{Remedies: &payments.Remedies{Cancellation: "Synthetic cancellation review terms.", PartialWork: "Synthetic partial work review terms.", NoShow: "Synthetic no show review terms.", MissedTarget: "Synthetic missed target review terms.", RefundBasis: "Synthetic exact received funds basis.", RefundFees: "Synthetic approved fee treatment.", DisputeHours: 168, AppealHours: 48, MaxAppeals: 1}, Label: "Synthetic checkout policy", Text: "Synthetic testing agreement; no live merchant or real payment.", Currencies: []string{"USD"}, Routes: []payments.Route{{Code: "usdttrc20", Label: "Synthetic USDT TRON", Network: "trx"}}, FeeMode: "merchant", RateMode: "fixed", WindowMinutes: 30}
	settings, err := store.SavePolicy(t.Context(), base.admin, payments.PolicyInput{Version: 1, Action: "publish", Data: policy})
	if err != nil {
		t.Fatal(err)
	}
	return &paymentFixture{base, store, provider, *settings.Published}
}
func (f *paymentFixture) start(t *testing.T, detail orders.Detail) payments.Attempt {
	t.Helper()
	a, err := f.store.Start(t.Context(), f.base.buyer, detail.Order.ID, payments.StartInput{ContractID: detail.Contract.ID, PolicyID: f.policy.ID, Route: "usdttrc20", AcceptPolicy: true})
	if err != nil {
		t.Fatal(err)
	}
	if f.provider.legacyNative {
		if _, err := f.base.auth.client.ExecContext(t.Context(), "UPDATE payment_attempts SET native_checkout=TRUE, deposit_claimed=FALSE WHERE id=?", a.ID); err != nil {
			t.Fatal(err)
		}
		a.NativeCheckout = true
	}
	return a
}
func (f *paymentFixture) issue(t *testing.T, a payments.Attempt) {
	t.Helper()
	raw, err := json.Marshal(map[string]string{"attempt_id": a.ID})
	if err != nil {
		t.Fatal(err)
	}
	if err = f.store.InvoiceHandler()(t.Context(), jobs.Job{Payload: raw}); err != nil {
		t.Fatal(err)
	}
}
func (f *paymentFixture) evidence(t *testing.T, a payments.Attempt, id, status, paid string) nowpayments.Payment {
	t.Helper()
	row, err := f.base.auth.client.PaymentAttempt.Get(t.Context(), a.ID)
	if err != nil {
		t.Fatal(err)
	}
	invoice := "1"
	if row.InvoiceID != nil {
		invoice = *row.InvoiceID
	}
	return nowpayments.Payment{ID: id, InvoiceID: invoice, AttemptID: a.ID, Status: status, PriceAmount: "12.34", PriceCurrency: "usd", PayAmount: "12.34000001", ActuallyPaid: nowpayments.Decimal(paid), PayCurrency: "usdttrc20", Network: "trx"}
}
func paymentSignal(t *testing.T, id string) ([]byte, string) {
	t.Helper()
	body, err := json.Marshal(map[string]string{"payment_id": id, "payment_status": "finished"})
	if err != nil {
		t.Fatal(err)
	}
	mac := hmac.New(sha512.New, []byte(paymentTestSecret))
	if _, err = mac.Write(body); err != nil {
		t.Fatal(err)
	}
	return body, hex.EncodeToString(mac.Sum(nil))
}
func (f *paymentFixture) record(t *testing.T, p nowpayments.Payment) string {
	t.Helper()
	f.provider.set(p)
	body, sig := paymentSignal(t, p.ID)
	if err := f.store.Receive(t.Context(), body, sig); err != nil {
		t.Fatal(err)
	}
	row, err := f.base.auth.client.PaymentRecord.Query().Where(paymentrecord.PaymentIDEQ(p.ID)).Only(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	return row.ID
}
func (f *paymentFixture) reconcile(t *testing.T, p nowpayments.Payment) *ent.PaymentRecord {
	t.Helper()
	id := f.record(t, p)
	if err := f.store.Reconcile(t.Context(), id); err != nil {
		t.Fatal(err)
	}
	row, err := f.base.auth.client.PaymentRecord.Get(t.Context(), id)
	if err != nil {
		t.Fatal(err)
	}
	return row
}
func TestPaymentsConcurrentCheckoutAuthoritativeAllocationAndReversal(t *testing.T) {
	f := paymentDB(t)
	detail := f.base.create(t, "package")
	ctx := t.Context()
	input := payments.StartInput{ContractID: detail.Contract.ID, PolicyID: f.policy.ID, Route: "usdttrc20", AcceptPolicy: true}
	var wg sync.WaitGroup
	var ids sync.Map
	for range 5 {
		wg.Go(func() {
			a, err := f.store.Start(ctx, f.base.buyer, detail.Order.ID, input)
			if err != nil {
				t.Error(err)
				return
			}
			ids.Store(a.ID, true)
		})
	}
	wg.Wait()
	count := 0
	ids.Range(func(_, _ any) bool { count++; return true })
	if count != 1 {
		t.Fatal("duplicate attempts", count)
	}
	a := f.start(t, detail)
	for range 3 {
		f.issue(t, a)
	}
	if f.provider.calls != 1 {
		t.Fatal("invoice POST repeated")
	}
	if _, err := f.store.Start(ctx, f.base.other, detail.Order.ID, input); !ent.IsNotFound(err) {
		t.Fatal("other owner started payment", err)
	}
	if _, err := f.store.History(ctx, f.base.other, detail.Order.ID, false); !ent.IsNotFound(err) {
		t.Fatal("private checkout leaked", err)
	}
	if _, err := f.store.History(ctx, f.base.buyer, detail.Order.ID, true); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer finance access", err)
	}
	if _, err := f.base.store.Transition(ctx, f.base.buyer, detail.Order.ID, "cancel", false, orders.Action{Version: detail.Order.Version}); !errors.Is(err, orders.ErrConflict) {
		t.Fatal("invoice cancelled unsafely", err)
	}
	body, sig := paymentSignal(t, "100")
	if err := f.store.Receive(ctx, body, strings.Repeat("0", 128)); !errors.Is(err, nowpayments.ErrSignature) {
		t.Fatal("forged callback", err)
	}
	p := f.evidence(t, a, "100", "waiting", "0")
	f.provider.set(p)
	for range 5 {
		wg.Go(func() {
			if err := f.store.Receive(ctx, body, sig); err != nil {
				t.Error(err)
			}
		})
	}
	wg.Wait()
	signals, err := f.base.auth.client.PaymentSignal.Query().Count(ctx)
	if err != nil || signals != 1 {
		t.Fatal("inbox duplication", signals, err)
	}
	record := f.reconcile(t, p)
	if record.State != "awaiting_payment" {
		t.Fatal("callback status was treated as authority", record.State)
	}
	p.Status = "finished"
	p.ActuallyPaid = p.PayAmount
	record = f.reconcile(t, p)
	if record.State != "settled" || record.Issue != "" {
		t.Fatal("exact settlement", record.State, record.Issue)
	}
	for range 3 {
		f.reconcile(t, p)
	}
	allocations, err := f.base.auth.client.PaymentAllocation.Query().All(ctx)
	if err != nil || len(allocations) != 1 || allocations[0].AmountMinor != "1234" || allocations[0].CryptoAmount != "12.34000001" {
		t.Fatal("allocation is not exact and unique", err)
	}
	detail, err = f.base.store.Get(ctx, f.base.buyer, detail.Order.ID, false)
	if err != nil || detail.Order.State != "queued" || detail.Contract.PaymentState != "settled" {
		t.Fatal("order not atomically paid", err)
	}
	p.Status = "waiting"
	f.reconcile(t, p)
	duplicate := p
	duplicate.ID = "101"
	duplicate.Status = "finished"
	record = f.reconcile(t, duplicate)
	if record.Issue != "duplicate_payment" {
		t.Fatal("second deposit spent twice", record.Issue)
	}
	p.Status = "refunded"
	p.ActuallyPaid = "0"
	f.reconcile(t, p)
	detail, err = f.base.store.Get(ctx, f.base.buyer, detail.Order.ID, false)
	if err != nil || detail.Order.State != "on_hold" || detail.Contract.PaymentState != "funds_detected" {
		t.Fatal("reversal did not stop work", err)
	}
	history, err := f.store.History(ctx, f.base.buyer, detail.Order.ID, false)
	if err != nil || len(history.Receipts) != 2 {
		t.Fatal(err)
	}
	found := false
	for _, receipt := range history.Receipts {
		if receipt.State == "reversed" && receipt.Amount == "12.34000001" {
			found = true
		}
	}
	if !found {
		t.Fatal("reversal erased original received amount")
	}
}
func TestPaymentsExceptionsNeverInventSettlement(t *testing.T) {
	cases := []struct {
		name, issue string
		change      func(*nowpayments.Payment)
	}{
		{"underpaid", "underpaid", func(p *nowpayments.Payment) { p.ActuallyPaid = "1" }},
		{"partial", "underpaid", func(p *nowpayments.Payment) { p.Status = "partially_paid"; p.ActuallyPaid = "1" }},
		{"wrong coin", "wrong_route", func(p *nowpayments.Payment) { p.PayCurrency = "btc" }},
		{"wrong network", "wrong_route", func(p *nowpayments.Payment) { p.Network = "eth" }},
		{"wrong fiat", "price_mismatch", func(p *nowpayments.Payment) { p.PriceCurrency = "eur" }},
		{"wrong amount", "price_mismatch", func(p *nowpayments.Payment) { p.PriceAmount = "12.35" }},
		{"unknown attempt", "unknown_attempt", func(p *nowpayments.Payment) { p.AttemptID = uuid.NewString() }},
		{"wrong invoice", "invoice_mismatch", func(p *nowpayments.Payment) { p.InvoiceID = "9999" }},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			f := paymentDB(t)
			d := f.base.create(t, "package")
			a := f.start(t, d)
			f.issue(t, a)
			p := f.evidence(t, a, "100", "finished", "12.34000001")
			tt.change(&p)
			r := f.reconcile(t, p)
			if r.Issue != tt.issue {
				t.Fatal(r.Issue)
			}
			n, err := f.base.auth.client.PaymentAllocation.Query().Count(t.Context())
			if err != nil || n != 0 {
				t.Fatal("unverified funds allocated", err)
			}
		})
	}
}
func TestPaymentsTopupOverpaymentAndExpiryRelease(t *testing.T) {
	t.Run("topup and overpayment", func(t *testing.T) {
		f := paymentDB(t)
		d := f.base.create(t, "package")
		a := f.start(t, d)
		f.issue(t, a)
		p := f.evidence(t, a, "100", "partially_paid", "1")
		f.reconcile(t, p)
		p.Status = "finished"
		p.ActuallyPaid = "13.00000001"
		r := f.reconcile(t, p)
		if r.State != "settled" || r.Issue != "overpaid" {
			t.Fatal(r.State, r.Issue)
		}
		history, err := f.store.History(t.Context(), f.base.buyer, d.Order.ID, false)
		if err != nil || len(history.Receipts) != 1 || history.Receipts[0].Amount != "13.00000001" || history.Receipts[0].AllocatedMinor != "1234" {
			t.Fatal("extra funds treated as price", err)
		}
	})
	t.Run("expiry releases coupon and quarantines late funds", func(t *testing.T) {
		f := paymentDB(t)
		ctx := t.Context()
		policy := couponPolicy()
		c, err := f.base.catalog.SaveCoupon(ctx, f.base.admin, "", 0, policy)
		if err != nil {
			t.Fatal(err)
		}
		input := f.base.input("package")
		input.CouponCode = policy.Code
		input.ExpectedAmount = "617"
		input.ExpectedCouponVersion = c.Version
		d, err := f.base.store.Create(ctx, f.base.buyer, input)
		if err != nil {
			t.Fatal(err)
		}
		a := f.start(t, d)
		f.issue(t, a)
		f.base.auth.clock.Add(31 * 60)
		if err = f.store.Maintain(ctx); err != nil {
			t.Fatal(err)
		}
		contract, err := f.base.auth.client.OrderContract.Get(ctx, d.Contract.ID)
		if err != nil || contract.PaymentState != "retired" || contract.CapacityHeld {
			t.Fatal("expired hold retained", err)
		}
		claim, err := f.base.auth.client.CouponClaim.Query().Where(couponclaim.ContractIDEQ(d.Contract.ID)).Only(ctx)
		if err != nil || claim.State != couponclaim.StateReleased {
			t.Fatal("coupon hold retained", err)
		}
		p := f.evidence(t, a, "100", "finished", "12.34000001")
		p.PriceAmount = "6.17"
		r := f.reconcile(t, p)
		if r.Issue != "retired_contract" {
			t.Fatal("late payment reactivated inventory", r.Issue)
		}
	})
}
func TestPaymentsAmbiguousWritesDiscoveryAndStaleObservation(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	d := f.base.create(t, "package")
	a := f.start(t, d)
	f.provider.ambiguous = true
	f.issue(t, a)
	f.issue(t, a)
	if f.provider.calls != 1 {
		t.Fatal("ambiguous invoice retried")
	}
	p := f.evidence(t, a, "100", "waiting", "0")
	f.provider.set(p)
	if err := f.store.Discover(ctx); err != nil {
		t.Fatal(err)
	}
	row, err := f.base.auth.client.PaymentRecord.Query().Where(paymentrecord.PaymentIDEQ("100")).Only(ctx)
	if err != nil {
		t.Fatal("missing callback not discovered", err)
	}
	block, entered := make(chan struct{}), make(chan struct{})
	f.provider.mu.Lock()
	f.provider.block = block
	f.provider.entered = entered
	f.provider.mu.Unlock()
	result := make(chan error, 1)
	go func() { result <- f.store.Reconcile(ctx, row.ID) }()
	<-entered
	p.Status = "finished"
	p.ActuallyPaid = p.PayAmount
	f.provider.set(p)
	f.base.auth.clock.Add(61)
	if err = f.store.Reconcile(ctx, row.ID); err != nil {
		close(block)
		t.Fatal(err)
	}
	close(block)
	if err = <-result; !errors.Is(err, payments.ErrConflict) {
		t.Fatal("expired observation overwrote newer funds", err)
	}
	row, err = f.base.auth.client.PaymentRecord.Get(ctx, row.ID)
	if err != nil || row.State != "settled" {
		t.Fatal("newer evidence lost", err)
	}
	f.issue(t, a)
	if f.provider.calls != 1 {
		t.Fatal("discovery recovery retried invoice")
	}
}

func TestPaymentsCancellationRaceAndConfirmationAfterDeadline(t *testing.T) {
	t.Run("cancellation races invoice reservation", func(t *testing.T) {
		f := paymentDB(t)
		d := f.base.create(t, "package")
		ctx := t.Context()
		var group sync.WaitGroup
		results := make(chan error, 2)
		group.Go(func() {
			_, err := f.store.Start(ctx, f.base.buyer, d.Order.ID, payments.StartInput{ContractID: d.Contract.ID, PolicyID: f.policy.ID, Route: "usdttrc20", AcceptPolicy: true})
			results <- err
		})
		group.Go(func() {
			_, err := f.base.store.Transition(ctx, f.base.buyer, d.Order.ID, "cancel", false, orders.Action{Version: d.Order.Version})
			results <- err
		})
		group.Wait()
		close(results)
		success := 0
		for err := range results {
			if err == nil {
				success++
			} else if !errors.Is(err, payments.ErrConflict) && !errors.Is(err, orders.ErrConflict) {
				t.Fatal(err)
			}
		}
		if success != 1 {
			t.Fatal("cancellation and invoice both won", success)
		}
		current, err := f.base.store.Get(ctx, f.base.buyer, d.Order.ID, false)
		if err != nil {
			t.Fatal(err)
		}
		attempts, err := f.base.auth.client.PaymentAttempt.Query().Count(ctx)
		if err != nil {
			t.Fatal(err)
		}
		if (current.Order.State == "cancelled" && attempts != 0) || (current.Order.State == "awaiting_payment" && attempts != 1) {
			t.Fatal("financial fence disagrees with order", current.Order.State, attempts)
		}
	})
	t.Run("previously detected funds may finish after the local window", func(t *testing.T) {
		f := paymentDB(t)
		d := f.base.create(t, "package")
		a := f.start(t, d)
		f.issue(t, a)
		p := f.evidence(t, a, "100", "confirming", "12.34000001")
		f.reconcile(t, p)
		f.base.auth.clock.Add(31 * 60)
		if err := f.store.Maintain(t.Context()); err != nil {
			t.Fatal(err)
		}
		p.Status = "finished"
		row := f.reconcile(t, p)
		if row.State != "settled" {
			t.Fatal("timely funds expired while confirming", row.State, row.Issue)
		}
	})
}
