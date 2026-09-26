package catalog

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/catalogrelease"
)

// GameAvailable reads only the released policy, using the caller's client so
// reservations can check availability inside their existing transaction fence.
// Draft edits cannot change current sale eligibility.
func GameAvailable(ctx context.Context, client *ent.Client, g *ent.Game, service string) (bool, error) {
	if !g.Published || g.Archived || g.Paused || g.CurrentRelease == "" {
		return false, nil
	}
	r, err := client.CatalogRelease.Query().Where(catalogrelease.IDEQ(g.CurrentRelease), catalogrelease.GameIDEQ(g.ID)).Only(ctx)
	if err != nil {
		return false, err
	}
	c, err := configuration(r.Configuration)
	if err != nil {
		return false, err
	}
	return Available(c, false, service), nil
}
