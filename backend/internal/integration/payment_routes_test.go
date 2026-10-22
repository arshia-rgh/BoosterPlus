//go:build integration

package integration

import "testing"

func TestPaymentReceiptPreservesHistoricalNetworkCasing(t *testing.T) {
	f := paymentDB(t)
	detail := f.base.create(t, "package")
	a := f.start(t, detail)
	f.issue(t, a)
	p := f.evidence(t, a, "176", "confirming", "12.34000001")
	f.reconcile(t, p)
	receipt, err := f.base.auth.client.PaymentReceipt.Query().Only(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	// Reproduce a receipt saved before provider network casing was normalized.
	if _, err = f.base.auth.client.ExecContext(t.Context(), "UPDATE payment_receipts SET network=? WHERE id=?", "TRX", receipt.ID); err != nil {
		t.Fatal(err)
	}
	p.Status = "finished"
	record := f.reconcile(t, p)
	if record.State != "settled" || record.Issue != "" {
		t.Fatal("historical network casing blocked settlement", record.State, record.Issue)
	}
	receipt, err = f.base.auth.client.PaymentReceipt.Get(t.Context(), receipt.ID)
	if err != nil || receipt.Network != "TRX" {
		t.Fatal("historical receipt rewritten", err)
	}
}
