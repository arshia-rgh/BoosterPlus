//go:build integration

package integration

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resale"
)

func TestAccountCommissionReservationRetryAndFullRefund(t *testing.T) {
	f := resaleDB(t, "consignment")
	ctx := t.Context()
	f.publish(t)
	input := f.reserveInput()
	detail, err := f.resale.Reserve(ctx, f.base.buyer, f.listing.ID, input)
	if err != nil {
		t.Fatal(err)
	}
	repeated, err := f.resale.Reserve(ctx, f.base.buyer, f.listing.ID, input)
	if err != nil || repeated.Order.ID != detail.Order.ID {
		t.Fatal("reservation retry duplicated the order", err)
	}
	price := detail.Contract.Data.AccountPrice
	if price == nil || price.BaseMinor != "1175" || price.FeeMinor != "59" || price.TotalMinor != "1234" || detail.Contract.Data.AmountMinor != "1234" || len(detail.Contract.Data.Lines) != 2 {
		t.Fatal("accepted contract omitted or double-applied commission")
	}
	a := f.start(t, detail)
	f.issue(t, a)
	f.reconcile(t, f.evidence(t, a, "920", "finished", "12.34000001"))
	history, err := f.store.History(ctx, f.base.buyer, detail.Order.ID, false)
	if err != nil || len(history.Receipts) != 1 {
		t.Fatal(err)
	}
	record, err := f.store.OpenCase(ctx, f.base.buyer, detail.Order.ID, false, payments.CaseInput{RequestKey: uuid.NewString(), Kind: "dispute", Note: "Synthetic full account refund including buyer commission."})
	if err != nil {
		t.Fatal(err)
	}
	refund, err := f.store.ProposeRefund(ctx, f.base.admin, record.ID, payments.RefundInput{RequestKey: uuid.NewString(), ReceiptID: history.Receipts[0].ID, Amount: "12.34000001", Terms: "Refund the entire allocated crypto purchase, including the buyer commission."})
	if err != nil || refund.Amount != "12.34000001" {
		t.Fatal("full refund excluded buyer commission", err)
	}
	if _, err = f.store.ProposeRefund(ctx, f.base.admin, record.ID, payments.RefundInput{RequestKey: uuid.NewString(), ReceiptID: history.Receipts[0].ID, Amount: "0.00000001", Terms: "Synthetic over-refund must remain blocked; compensation is separate."}); err == nil {
		t.Fatal("commission allowed over-refunding the receipt")
	}
	// Buyer-facing immutable snapshots must never reveal the seller's quote or net.
	raw, err := json.Marshal(detail.Contract.Data)
	if err != nil {
		t.Fatal(err)
	}
	var data map[string]any
	if err = json.Unmarshal(raw, &data); err != nil {
		t.Fatal(err)
	}
	publicPrice, ok := data["account_price"].(map[string]any)
	if !ok || len(publicPrice) != 4 {
		t.Fatal("seller quote leaked into buyer contract")
	}
}

func TestAccountLegacyPriceAndSellerObligationStayUnchanged(t *testing.T) {
	f := resaleDB(t, "consignment")
	ctx := t.Context()
	f.publish(t)
	// Represent immutable agreements written before commissions existed. Only
	// this isolated synthetic fixture is altered; live historical data is untouched.
	release, err := f.base.auth.client.AccountListingRelease.Get(ctx, f.listing.ReleaseID)
	if err != nil {
		t.Fatal(err)
	}
	delete(release.Data, "commission")
	if _, err = f.base.auth.db.ExecContext(ctx, "UPDATE account_listing_releases SET data = ? WHERE id = ?", mustJSON(t, release.Data), release.ID); err != nil {
		t.Fatal(err)
	}
	offer, err := f.base.auth.client.SellerOffer.Get(ctx, f.offer.ID)
	if err != nil {
		t.Fatal(err)
	}
	delete(offer.Data, "commission")
	offer.Data["amount"] = "10.00000001"
	if _, err = f.base.auth.db.ExecContext(ctx, "UPDATE seller_offers SET data = ? WHERE id = ?", mustJSON(t, offer.Data), offer.ID); err != nil {
		t.Fatal(err)
	}
	detail := f.reserve(t)
	if detail.Contract.Data.AccountPrice != nil || detail.Contract.Data.AmountMinor != "1234" || len(detail.Contract.Data.Lines) != 0 {
		t.Fatal("historical buyer agreement was repriced")
	}
	raw, err := json.Marshal(map[string]string{"offer_id": offer.ID})
	if err != nil {
		t.Fatal(err)
	}
	for range 2 {
		if err = f.store.SellerObligationHandler()(ctx, jobs.Job{Payload: raw}); err != nil {
			t.Fatal(err)
		}
	}
	payouts, err := f.store.SellerPayouts(ctx, f.base.other, offer.SubmissionID, false)
	if err != nil || len(payouts) != 1 || payouts[0].Amount != "10.00000001" {
		t.Fatal("historical exact seller obligation changed or duplicated", err)
	}
}

func TestAccountListingRejectsCommissionRemovalAndConsignmentReprice(t *testing.T) {
	f := resaleDB(t, "consignment")
	ctx := t.Context()
	product := resaleProduct()
	product.Commission = nil
	if _, err := f.resale.ChangeListing(ctx, f.base.admin, f.listing.ID, "save", resale.ListingInput{Version: f.listing.Version, Product: product}); err == nil {
		t.Fatal("new release omitted the buyer commission")
	}
	product = resaleProduct()
	product.Commission.BaseMinor, product.Commission.FeeMinor, product.Commission.TotalMinor, product.AmountMinor = "2000", "100", "2100", "2100"
	if _, err := f.resale.ChangeListing(ctx, f.base.admin, f.listing.ID, "publish", resale.ListingInput{Version: f.listing.Version, Product: product, PublicReviewed: true}); err == nil {
		t.Fatal("consignment seller was repriced without acceptance")
	}
	f.publish(t)
	input := f.reserveInput()
	input.ExpectedAmount = "1175"
	if _, err := f.resale.Reserve(ctx, f.base.buyer, f.listing.ID, input); err == nil {
		t.Fatal("buyer reserved at a price excluding commission")
	}
}

func mustJSON(t *testing.T, value any) []byte {
	t.Helper()
	raw, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return raw
}
