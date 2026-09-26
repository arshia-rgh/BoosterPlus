package catalog

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Publication validates mutable target evidence in the same staff transaction
// as release creation. Customer checkout still reserves capacity and coupons
// independently; publishing a promotion never holds inventory.
func validatePromotionTargets(ctx context.Context, client *ent.Client, release Release, now time.Time) error {
	if release.Configuration.Discovery == nil {
		return nil
	}
	issues := []Issue{}
	for i, p := range release.Configuration.Discovery.Promotions {
		if !p.Enabled {
			continue
		}
		path := fmt.Sprintf("discovery.promotions.%d", i)
		if !now.Before(p.EndsAt) {
			issues = append(issues, Issue{path, "Disable this expired promotion or review a new interval before publication."})
			continue
		}
		view, ok, err := promotionTarget(ctx, client, release, p)
		if err != nil {
			return err
		}
		if !ok {
			issues = append(issues, Issue{path, "The target is unavailable, exhausted or has changed release. Review it before publication."})
			continue
		}
		if p.CouponCode != "" {
			// Future offers must be valid at their start. Do not require a coupon
			// to be currently active when approving a scheduled promotion.
			at := now
			if p.StartsAt.After(at) {
				at = p.StartsAt
			}
			ok, err = promotionDiscount(ctx, client, release, p, &view, at)
			if err != nil {
				return err
			}
			if !ok || view.EndsAt.Before(p.EndsAt) {
				issues = append(issues, Issue{path + ".coupon_code", "Review the current coupon revision, scope, remaining uses and full promotion interval."})
			}
		}
	}
	if len(issues) > 0 {
		return &Invalid{issues}
	}
	return nil
}

func (s *Store) publicationPreview(ctx context.Context, p *identity.Principal, id string) (Draft, []Issue, error) {
	var result Draft
	issues := []Issue{}
	err := s.auth.AuthorizedTransaction(ctx, p, "admin", false, func(tx *ent.Tx, _ *identity.Principal) error {
		row, err := tx.Game.Get(ctx, id)
		if err != nil {
			return err
		}
		result, err = draft(row)
		if err != nil {
			return err
		}
		issues = ValidateConfiguration(result.Configuration, true)
		if len(issues) > 0 {
			return nil
		}
		err = validatePromotionTargets(ctx, tx.Client(), Release{GameID: row.ID, Slug: row.Slug, Configuration: result.Configuration}, time.Now())
		var invalid *Invalid
		if errors.As(err, &invalid) {
			issues = append(issues, invalid.Issues...)
			return nil
		}
		return err
	})
	return result, issues, err
}
