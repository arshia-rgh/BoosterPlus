package payments

import (
	"bytes"
	"encoding/base64"
	"image/png"
	"strings"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

func depositFixture() (*ent.PaymentAttempt, nowpayments.Payment, time.Time) {
	now := time.Date(2026, 9, 27, 12, 0, 0, 0, time.UTC)
	invoice, contract := "1", "contract"
	attempt := &ent.PaymentAttempt{ID: "attempt", NativeCheckout: true, ActiveContractID: &contract, InvoiceID: &invoice, DepositPaymentID: "2", State: "awaiting_payment", AmountMinor: "1234", Currency: "USD", Route: map[string]any{"code": "usdttrc20", "network": "trx", "label": "Synthetic USDT"}, ExpiresAt: now.Add(time.Hour)}
	p := nowpayments.Payment{ID: "2", InvoiceID: "1", AttemptID: "attempt", Status: "waiting", PriceAmount: "12.34", PriceCurrency: "usd", PayAmount: "0.00000000000000000001", ActuallyPaid: "0", PayCurrency: "usdttrc20", Network: "trx", Destination: &nowpayments.Destination{Address: "synthetic-not-payable-address", Memo: "123", ExpiresAt: now.Add(10 * time.Minute)}}
	return attempt, p, now
}
func TestDepositExactAmountQRAndFreshness(t *testing.T) {
	a, p, now := depositFixture()
	d, err := depositView(a, p, now)
	if err != nil || d == nil || d.Amount != string(p.PayAmount) || d.Memo != "123" || !d.ValidUntil.Equal(now.Add(2*time.Minute)) {
		t.Fatal("deposit projection", err)
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(d.QR, "data:image/png;base64,"))
	if err != nil {
		t.Fatal(err)
	}
	picture, err := png.Decode(bytes.NewReader(raw))
	if err != nil {
		t.Fatal(err)
	}
	for x := range picture.Bounds().Dx() {
		for _, y := range []int{0, 15, picture.Bounds().Dy() - 1} {
			r, g, b, _ := picture.At(x, y).RGBA()
			if r != 65535 || g != 65535 || b != 65535 {
				t.Fatal("QR quiet zone missing")
			}
		}
	}
	a.DepositData, err = document(d)
	if err != nil {
		t.Fatal(err)
	}
	s := &Store{now: func() time.Time { return now }}
	for _, test := range []struct {
		elapsed time.Duration
		status  string
		visible bool
	}{{0, "ready", true}, {2 * time.Minute, "refreshing", false}, {10 * time.Minute, "expired", false}} {
		s.now = func() time.Time { return now.Add(test.elapsed) }
		view := Attempt{}
		s.projectDeposit(a, &view)
		if view.InstructionStatus != test.status || (view.Deposit != nil) != test.visible || view.CheckoutURL != "" {
			t.Fatal("unsafe instruction freshness", test.status)
		}
	}
}
func TestDepositNeverOverridesCommercialOrPaymentEvidence(t *testing.T) {
	changes := []func(*ent.PaymentAttempt, *nowpayments.Payment){
		func(a *ent.PaymentAttempt, _ *nowpayments.Payment) { a.NativeCheckout = false },
		func(a *ent.PaymentAttempt, _ *nowpayments.Payment) { a.ActiveContractID = nil },
		func(a *ent.PaymentAttempt, _ *nowpayments.Payment) { a.InvoiceID = nil },
		func(a *ent.PaymentAttempt, _ *nowpayments.Payment) { a.DepositPaymentID = "3" },
		func(a *ent.PaymentAttempt, _ *nowpayments.Payment) { a.ExpiresAt = time.Time{} },
		func(a *ent.PaymentAttempt, _ *nowpayments.Payment) { now := time.Now(); a.FundsDetectedAt = &now },
		func(_ *ent.PaymentAttempt, p *nowpayments.Payment) { p.InvoiceID = "3" },
		func(_ *ent.PaymentAttempt, p *nowpayments.Payment) { p.AttemptID = "other" },
		func(_ *ent.PaymentAttempt, p *nowpayments.Payment) { p.PriceAmount = "12.35" },
		func(_ *ent.PaymentAttempt, p *nowpayments.Payment) { p.PayCurrency = "btc" },
		func(_ *ent.PaymentAttempt, p *nowpayments.Payment) { p.Network = "eth" },
		func(_ *ent.PaymentAttempt, p *nowpayments.Payment) { p.Network = "" },
		func(_ *ent.PaymentAttempt, p *nowpayments.Payment) { p.ActuallyPaid = "0.01" },
		func(_ *ent.PaymentAttempt, p *nowpayments.Payment) { p.Status = "confirming" },
		func(_ *ent.PaymentAttempt, p *nowpayments.Payment) { p.Destination = nil },
		func(_ *ent.PaymentAttempt, p *nowpayments.Payment) { p.Destination.Address = "javascript:unsafe" },
		func(_ *ent.PaymentAttempt, p *nowpayments.Payment) { p.Destination.Memo = "bad\nvalue" },
		func(_ *ent.PaymentAttempt, p *nowpayments.Payment) { p.Destination.ExpiresAt = time.Time{} },
	}
	for i, change := range changes {
		a, p, now := depositFixture()
		change(a, &p)
		d, err := depositView(a, p, now)
		if err != nil || d != nil {
			t.Fatal("unsafe payable instructions", i, err)
		}
	}
}

func TestTONDestinationDoesNotInventRequiredMemo(t *testing.T) {
	attempt, p, now := depositFixture()
	attempt.Route = map[string]any{"code": "ton", "network": "ton", "label": "TON"}
	p.PayCurrency = "ton"
	p.Network = "ton"
	p.Destination.Memo = ""
	view, err := depositView(attempt, p, now)
	if err != nil || view == nil || view.Memo != "" {
		t.Fatal("TON destination incorrectly required a memo", err)
	}
	p.Destination.Memo = "123456"
	view, err = depositView(attempt, p, now)
	if err != nil || view == nil || view.Memo != "123456" {
		t.Fatal("provider supplied memo lost", err)
	}
}
