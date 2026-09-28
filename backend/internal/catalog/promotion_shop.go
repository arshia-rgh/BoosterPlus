package catalog

import (
	"context"
	"strconv"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopproduct"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopstock"
)

// Shop stock carries the exact commercial projection written atomically with
// its product release. Never read mutable draft prices for public discovery.
func shopPromotionTarget(ctx context.Context, client *ent.Client, release Release, p Promotion, view PromotionView) (PromotionView, bool, error) {
	if p.CouponCode != "" || !Available(release.Configuration, release.Paused, "shop") {
		return view, false, nil
	}
	row, err := client.ShopProduct.Query().Where(shopproduct.IDEQ(p.ProductID), shopproduct.GameIDEQ(release.GameID), shopproduct.StateEQ("published"), shopproduct.CurrentReleaseEQ(p.ReleaseID)).Only(ctx)
	if ent.IsNotFound(err) {
		return view, false, nil
	}
	if err != nil {
		return view, false, err
	}
	stock, err := client.ShopStock.Query().Where(shopstock.ProductIDEQ(row.ID), shopstock.ReleaseIDEQ(p.ReleaseID), shopstock.VariantKeyEQ(p.Variant), shopstock.EnabledEQ(true)).Only(ctx)
	if ent.IsNotFound(err) {
		return view, false, nil
	}
	if err != nil {
		return view, false, err
	}
	available := stock.Total - stock.Reserved - stock.Committed
	if stock.MinQuantity < 1 || stock.MinQuantity > 100 || stock.MinQuantity > stock.MaxQuantity || available < stock.MinQuantity || stock.UnitAmountMinor < 1 || stock.UnitAmountMinor > 999999999999/int64(stock.MinQuantity) {
		return view, false, nil
	}
	view.Service, view.ProductID, view.Variant, view.ReleaseID = "shop", row.ID, stock.VariantKey, p.ReleaseID
	view.Quantity = stock.MinQuantity
	view.Currency, view.AmountMinor = stock.Currency, strconv.FormatInt(stock.UnitAmountMinor*int64(stock.MinQuantity), 10)
	if p.ShowQuantity {
		view.Remaining = &available
	}
	return view, true, nil
}
