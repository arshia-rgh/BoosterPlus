//go:build integration

package integration

import (
	"errors"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/orderquote"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
)

func TestQuotePreviewDoesNotIssueAndBindsReviewedAgreement(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	detail := f.create(t, "custom")
	input := f.quote(detail)
	preview, err := f.store.PreviewQuote(ctx, f.admin, detail.Order.ID, input)
	if err != nil {
		t.Fatal(err)
	}
	if preview.PreviewHash == "" || preview.Data.QuoteID != "" || preview.Data.AmountMinor != "2000" || preview.OrderVersion != detail.Order.Version {
		t.Fatal("invalid nonbinding preview")
	}
	count, err := f.auth.client.OrderQuote.Query().Where(orderquote.OrderIDEQ(detail.Order.ID)).Count(ctx)
	if err != nil || count != 0 {
		t.Fatal("preview issued a quote", err)
	}
	row, err := f.auth.client.Order.Get(ctx, detail.Order.ID)
	if err != nil || row.Version != detail.Order.Version || row.CurrentContract != "" || row.CurrentQuote != "" {
		t.Fatal("preview changed order", err)
	}
	if _, err = f.store.PreviewQuote(ctx, f.buyer, detail.Order.ID, input); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer preview allowed", err)
	}
	input.PreviewHash = preview.PreviewHash
	input.Scope = "Changed after preview"
	if _, err = f.store.IssueQuote(ctx, f.admin, detail.Order.ID, input); !errors.Is(err, orders.ErrConflict) {
		t.Fatal("changed preview accepted", err)
	}
	input.Scope = f.quote(detail).Scope
	other := f.create(t, "custom")
	if _, err = f.store.IssueQuote(ctx, f.admin, other.Order.ID, input); !errors.Is(err, orders.ErrConflict) {
		t.Fatal("cross-order preview accepted", err)
	}
	var success atomic.Int64
	var wg sync.WaitGroup
	for range 2 {
		wg.Go(func() {
			_, issueErr := f.store.IssueQuote(ctx, f.admin, detail.Order.ID, input)
			if issueErr == nil {
				success.Add(1)
			} else if !errors.Is(issueErr, orders.ErrConflict) {
				t.Error(issueErr)
			}
		})
	}
	wg.Wait()
	if success.Load() != 1 {
		t.Fatal("duplicate quote issuance")
	}
	if _, err = f.store.PreviewQuote(ctx, f.admin, detail.Order.ID, input); !errors.Is(err, orders.ErrConflict) {
		t.Fatal("stale preview allowed", err)
	}
	count, err = f.auth.client.OrderQuote.Query().Where(orderquote.OrderIDEQ(detail.Order.ID)).Count(ctx)
	if err != nil || count != 1 {
		t.Fatal("quote count", count, err)
	}
}

func TestQuotePreviewValidationAndIssueReverification(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	detail := f.create(t, "custom")
	input := f.quote(detail)
	input.Currency = "BAD"
	if _, err := f.store.PreviewQuote(ctx, f.admin, detail.Order.ID, input); err == nil {
		t.Fatal("invalid currency preview")
	}
	input = f.quote(detail)
	input.AmountMinor = "0"
	if _, err := f.store.PreviewQuote(ctx, f.admin, detail.Order.ID, input); err == nil {
		t.Fatal("invalid total preview")
	}
	input = f.quote(detail)
	preview, err := f.store.PreviewQuote(ctx, f.admin, detail.Order.ID, input)
	if err != nil {
		t.Fatal(err)
	}
	input.PreviewHash = preview.PreviewHash
	f.auth.clock.Add(16 * 60)
	if _, err = f.store.IssueQuote(ctx, f.admin, detail.Order.ID, input); err == nil {
		t.Fatal("stale factors allowed quote issue")
	}
}
