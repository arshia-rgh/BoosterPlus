//go:build integration && browsertest

package integration

import (
	"context"
	"math/big"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// Browser-only provider evidence exercises the real inbox, worker and SQL allocation path.
// Its callback secret is synthetic and has no relation to private merchant configuration.
type browserPaymentProvider struct{ *paymentProvider }

func (p *browserPaymentProvider) CreateInvoice(ctx context.Context, input nowpayments.InvoiceRequest) (nowpayments.Invoice, error) {
	invoice, err := p.paymentProvider.CreateInvoice(ctx, input)
	if err != nil {
		return invoice, err
	}
	minor, ok := new(big.Int).SetString(input.AmountMinor, 10)
	if !ok {
		return invoice, nowpayments.ErrInvalid
	}
	amount := nowpayments.Decimal(new(big.Rat).SetFrac(minor, big.NewInt(100)).FloatString(2))
	p.set(nowpayments.Payment{ID: invoice.ID, InvoiceID: invoice.ID, AttemptID: input.AttemptID, Status: "finished", PriceAmount: amount, PriceCurrency: "usd", PayAmount: "12.34000001", ActuallyPaid: "12.34000001", PayCurrency: input.PayCurrency, Network: "trx"})
	return invoice, nil
}
func seedBrowserPayments(t *testing.T, f *authFixture, fixtures map[string]string) {
	t.Helper()
	ctx := t.Context()
	for _, project := range []string{"desktop", "mobile"} {
		original, err := f.client.Order.Get(ctx, fixtures[project+"_work_solo"])
		if err != nil {
			t.Fatal(err)
		}
		originalContract, err := f.client.OrderContract.Get(ctx, original.CurrentContract)
		if err != nil {
			t.Fatal(err)
		}
		row, err := f.client.Order.Create().SetUserID(fixtures[project+"_paybuyer_id"]).SetGameID(original.GameID).SetGameName(original.GameName).SetSlug(original.Slug).SetService(original.Service).SetKind(order.KindPackage).SetPackageKey(original.PackageKey).SetVariantKey(original.VariantKey).SetRequestKey(uuid.NewString()).SetRequestHash(f.service.RequestDigest("fixture", []byte(uuid.NewString()))).SetState(order.StateAwaitingPayment).SetAnswers(original.Answers).SetSnapshot(original.Snapshot).SetEstimate(original.Estimate).SetTermsVersion("test-v1").SetCreatedAt(time.Now()).Save(ctx)
		if err != nil {
			t.Fatal(err)
		}
		contract, err := f.client.OrderContract.Create().SetOrderID(row.ID).SetActiveOrderID(row.ID).SetUserID(row.UserID).SetGameID(row.GameID).SetPackageKey(row.PackageKey).SetVariantKey(row.VariantKey).SetPaymentState(ordercontract.PaymentStateUnissued).SetData(originalContract.Data).Save(ctx)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = f.client.Order.UpdateOneID(row.ID).SetCurrentContract(contract.ID).Save(ctx); err != nil {
			t.Fatal(err)
		}
		fixtures[project+"_pay_order"] = row.ID
	}
}
