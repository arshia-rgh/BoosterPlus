package catalog

import (
	"context"
	"slices"
	"strconv"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountlisting"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/coupon"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/couponclaim"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
)

// Promotions resolves only the current published game and reviewed targets.
// Quotes are anonymous, indicative and bounded; they never reserve inventory.
func promotionViews(ctx context.Context, client *ent.Client, release Release, now time.Time) ([]PromotionView, error) {
	result := []PromotionView{}
	if release.Paused || release.Configuration.Discovery == nil {
		return result, nil
	}
	for _, definition := range release.Configuration.Discovery.Promotions {
		if !definition.Enabled || now.Before(definition.StartsAt) || !now.Before(definition.EndsAt) {
			continue
		}
		view, ok, readErr := promotionTarget(ctx, client, release, definition)
		if readErr != nil {
			return result, readErr
		}
		if !ok {
			continue
		}
		if definition.CouponCode != "" {
			ok, readErr = promotionDiscount(ctx, client, release, definition, &view, now)
			if readErr != nil {
				return result, readErr
			}
			if !ok {
				continue
			}
		}
		result = append(result, view)
	}
	slices.SortStableFunc(result, func(a, b PromotionView) int { return b.Priority - a.Priority })
	return result, nil
}

func promotionTarget(ctx context.Context, client *ent.Client, release Release, p Promotion) (PromotionView, bool, error) {
	view := PromotionView{Key: p.Key, Title: p.Title, Description: p.Description,
		Target: p.Target, ReleaseID: release.ID, StartsAt: p.StartsAt, EndsAt: p.EndsAt,
		Priority: p.Priority, Indicative: true}
	switch p.Target {
	case "package":
		if !Available(release.Configuration, release.Paused, "boost") {
			return view, false, nil
		}
		for _, pack := range release.Configuration.Packages {
			if pack.Key != p.Package {
				continue
			}
			for _, variant := range pack.Variants {
				if variant.Key != p.Variant {
					continue
				}
				view.Service, view.Package, view.Variant = "boost", pack.Key, variant.Key
				view.Currency, view.AmountMinor = variant.Currency, variant.AmountMinor
				if variant.Capacity != nil {
					count, err := client.OrderContract.Query().Where(ordercontract.GameIDEQ(release.GameID), ordercontract.PackageKeyEQ(pack.Key), ordercontract.VariantKeyEQ(variant.Key), ordercontract.CapacityHeldEQ(true)).Count(ctx)
					if err != nil {
						return view, false, err
					}
					remaining := *variant.Capacity - count
					if remaining <= 0 {
						return view, false, nil
					}
					if p.ShowQuantity {
						view.Remaining = &remaining
					}
				}
				return view, true, nil
			}
		}
	case "account":
		if p.CouponCode != "" {
			return view, false, nil
		}
		if !Available(release.Configuration, release.Paused, "accounts") {
			return view, false, nil
		}
		row, err := client.AccountListing.Query().Where(accountlisting.IDEQ(p.ListingID), accountlisting.GameIDEQ(release.GameID), accountlisting.CurrentReleaseEQ(p.ReleaseID), accountlisting.StateEQ("published")).Select(accountlisting.FieldID, accountlisting.FieldCurrentRelease, accountlisting.FieldPublicCurrency, accountlisting.FieldPublicAmountMinor).Only(ctx)
		if ent.IsNotFound(err) {
			return view, false, nil
		}
		if err != nil {
			return view, false, err
		}
		view.Service, view.ListingID, view.ReleaseID = "accounts", row.ID, row.CurrentRelease
		view.Currency, view.AmountMinor = row.PublicCurrency, strconv.FormatInt(row.PublicAmountMinor, 10)
		if p.ShowQuantity {
			remaining := 1
			view.Remaining = &remaining
		}
		return view, true, nil
	}
	return view, false, nil
}

func promotionDiscount(ctx context.Context, client *ent.Client, release Release, p Promotion, view *PromotionView, now time.Time) (bool, error) {
	row, err := client.Coupon.Query().Where(coupon.CodeEQ(p.CouponCode), coupon.VersionEQ(p.CouponVersion)).Only(ctx)
	if ent.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	policy, err := couponDefinition(row.Definition)
	if err != nil {
		return false, err
	}
	category, service := "account_resale", ""
	if p.Target == "package" {
		category = "boosting"
		for _, pack := range release.Configuration.Packages {
			if pack.Key == p.Package {
				service = pack.Service
				break
			}
		}
	}
	subtotal, ok := decimal(view.AmountMinor)
	if !ok {
		return false, nil
	}
	total, ok := couponAmount(policy, subtotal, view.Currency, release.Slug, service, p.Package, category, now)
	if !ok {
		return false, nil
	}
	if policy.GlobalLimit > 0 {
		count, countErr := client.CouponClaim.Query().Where(couponclaim.CouponIDEQ(row.ID), couponclaim.StateIn(couponclaim.StateHeld, couponclaim.StateRedeemed)).Count(ctx)
		if countErr != nil {
			return false, countErr
		}
		if count >= policy.GlobalLimit {
			return false, nil
		}
	}
	view.OriginalMinor = view.AmountMinor
	view.AmountMinor = rounded(total).String()
	view.CouponCode, view.CouponVersion = p.CouponCode, p.CouponVersion
	if policy.EndsAt.Before(view.EndsAt) {
		view.EndsAt = policy.EndsAt
	}
	return true, nil
}
