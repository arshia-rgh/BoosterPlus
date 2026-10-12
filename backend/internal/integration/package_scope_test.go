//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
)

func TestFixedPackagePinnedContentsAndContract(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	c := f.game.Configuration
	v := &c.Packages[0].Variants[0]
	v.PresetAnswers = &catalog.Answers{"mode": json.RawMessage(`"solo"`)}
	v.RequiredFields = []string{"note"}
	var err error
	f.game, err = f.catalog.Mutate(ctx, f.admin, f.game.ID, "save", catalog.Change{Revision: f.game.Revision, Configuration: c})
	if err != nil {
		t.Fatal(err)
	}
	f.game, err = f.catalog.Mutate(ctx, f.admin, f.game.ID, "publish", catalog.Change{Revision: f.game.Revision})
	if err != nil {
		t.Fatal(err)
	}
	input := f.input("package")
	input.Answers["mode"] = json.RawMessage(`"duo"`)
	_, err = f.store.Create(ctx, f.buyer, input)
	var invalid *orders.Invalid
	if !errors.As(err, &invalid) {
		t.Fatal("customer changed fixed contents", err)
	}
	count, err := f.auth.client.Order.Query().Count(ctx)
	if err != nil || count != 0 {
		t.Fatal("rejected override left an order", err)
	}
	delete(input.Answers, "mode")
	bought, err := f.store.Create(ctx, f.buyer, input)
	if err != nil || bought.Contract == nil || bought.Contract.Data.AmountMinor != "1234" || bought.Contract.Data.DeliveryBasis != catalog.DeliveryBasis || string(bought.Answers["mode"]) != `"solo"` {
		t.Fatal("fixed purchase did not pin agreement and contents", err)
	}
	again, err := f.store.Create(ctx, f.buyer, input)
	if err != nil || again.Order.ID != bought.Order.ID || again.Contract.ID != bought.Contract.ID {
		t.Fatal("retry duplicated purchase", err)
	}
	// A later published offer cannot rewrite the original purchased package.
	c.Packages[0].Variants[0].PresetAnswers = &catalog.Answers{"mode": json.RawMessage(`"duo"`)}
	f.game, err = f.catalog.Mutate(ctx, f.admin, f.game.ID, "save", catalog.Change{Revision: f.game.Revision, Configuration: c})
	if err != nil {
		t.Fatal(err)
	}
	f.game, err = f.catalog.Mutate(ctx, f.admin, f.game.ID, "publish", catalog.Change{Revision: f.game.Revision})
	if err != nil {
		t.Fatal(err)
	}
	loaded, err := f.store.Get(ctx, f.buyer, bought.Order.ID, false)
	if err != nil || string(loaded.Answers["mode"]) != `"solo"` || loaded.Contract.Data.DeliveryBasis != catalog.DeliveryBasis {
		t.Fatal("historical package changed", err)
	}
	if loaded.Estimate.Outcome != "estimated" || loaded.Estimate.Evaluator != "fixed-package-v1" || loaded.Estimate.AmountMinor != "1234" {
		t.Fatal("fixed purchase used the custom estimator")
	}
	custom := f.create(t, "custom")
	quoteInput := f.quote(custom)
	preview, err := f.store.PreviewQuote(ctx, f.admin, custom.Order.ID, quoteInput)
	if err != nil || preview.Data.DeliveryBasis != catalog.DeliveryBasis {
		t.Fatal("quote preview omitted start condition", err)
	}
	quoteInput.PreviewHash = preview.PreviewHash
	quoted, err := f.store.IssueQuote(ctx, f.admin, custom.Order.ID, quoteInput)
	if err != nil || quoted.Quote.Data.DeliveryBasis != catalog.DeliveryBasis {
		t.Fatal("issued quote omitted start condition", err)
	}
}
