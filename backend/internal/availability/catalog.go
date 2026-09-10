package availability

import (
	"context"
	"encoding/json"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/catalogrelease"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/game"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

type offering struct {
	gameID    string
	label     string
	available bool
	limited   bool
	exists    bool
}

// offering reads released content only. Paused/archived/missing offerings are closed.
func readOffering(ctx context.Context, c *ent.Client, slug, packKey, variantKey string) (offering, error) {
	g, e := c.Game.Query().Where(game.SlugEQ(slug)).Only(ctx)
	if ent.IsNotFound(e) {
		return offering{}, nil
	}
	if e != nil {
		return offering{}, e
	}
	result := offering{gameID: g.ID, label: slug + " / " + packKey + " / " + variantKey}
	if !g.Published || g.CurrentRelease == "" {
		return result, nil
	}
	release, e := c.CatalogRelease.Query().Where(catalogrelease.IDEQ(g.CurrentRelease), catalogrelease.GameIDEQ(g.ID)).Only(ctx)
	if e != nil {
		return result, e
	}
	raw, e := json.Marshal(release.Configuration)
	if e != nil {
		return result, e
	}
	var config catalog.Configuration
	if e = json.Unmarshal(raw, &config); e != nil {
		return result, e
	}
	for _, pack := range config.Packages {
		if pack.Key != packKey {
			continue
		}
		for _, variant := range pack.Variants {
			if variant.Key != variantKey {
				continue
			}
			result.label = config.Name + " / " + pack.Name + " / " + variant.Name
			result.exists = !g.Archived
			result.limited = variant.Capacity != nil
			if g.Paused || g.Archived {
				return result, nil
			}
			result.available = true
			if variant.Capacity != nil {
				n, countErr := c.OrderContract.Query().Where(ordercontract.GameIDEQ(g.ID), ordercontract.PackageKeyEQ(packKey), ordercontract.VariantKeyEQ(variantKey), ordercontract.CapacityHeldEQ(true)).Count(ctx)
				if countErr != nil {
					return result, countErr
				}
				result.available = n < *variant.Capacity
			}
			return result, nil
		}
	}
	return result, nil
}
func (s *Store) view(ctx context.Context, c *ent.Client, row *ent.AvailabilitySubscription) (View, error) {
	target, e := c.AvailabilityTarget.Get(ctx, row.TargetID)
	if e != nil {
		return View{}, e
	}
	offer, e := readOffering(ctx, c, target.Slug, target.PackageKey, target.VariantKey)
	if e != nil {
		return View{}, e
	}
	state := row.State
	if state == "active" {
		account, readErr := c.User.Get(ctx, row.UserID)
		if readErr != nil {
			return View{}, readErr
		}
		if !s.eligible(account, row) {
			state = "suppressed"
		}
	}
	return View{row.ID, row.Version, state, target.Slug, target.PackageKey, target.VariantKey, offer.label, offer.available, row.UpdatedAt}, nil
}
