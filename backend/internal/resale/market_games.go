package resale

import (
	"context"
	"encoding/json"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountlisting"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/catalogrelease"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

// MarketGame contains released discovery metadata only, never a staff draft.
type MarketGame struct {
	Slug string `json:"slug"`
	Name string `json:"name"`
}

// MarketGames bounds work to fifty distinct games with published inventory per page.
// Availability can remove candidates; an empty page may still have a next cursor.
func (s *Store) MarketGames(ctx context.Context, after string) ([]MarketGame, string, error) {
	result := []MarketGame{}
	if !text(after, 0, 80) {
		return result, "", ErrInvalid
	}
	var candidates []struct {
		GameID string `json:"game_id"`
		Slug   string `json:"slug"`
	}
	err := s.client.AccountListing.Query().Where(accountlisting.StateEQ("published"), accountlisting.SlugGT(after)).
		Order(ent.Asc(accountlisting.FieldSlug)).Unique(true).Limit(51).Select(accountlisting.FieldGameID, accountlisting.FieldSlug).Scan(ctx, &candidates)
	if err != nil {
		return result, "", err
	}
	next := ""
	if len(candidates) > 50 {
		next = candidates[49].Slug
		candidates = candidates[:50]
	}
	for _, candidate := range candidates {
		game, readErr := s.client.Game.Get(ctx, candidate.GameID)
		if readErr != nil {
			return result, next, readErr
		}
		if !game.Published || game.Archived || game.Paused || game.CurrentRelease == "" {
			continue
		}
		release, readErr := s.client.CatalogRelease.Query().Where(catalogrelease.IDEQ(game.CurrentRelease), catalogrelease.GameIDEQ(game.ID)).Only(ctx)
		if readErr != nil {
			return result, next, readErr
		}
		raw, readErr := json.Marshal(release.Configuration)
		if readErr != nil {
			return result, next, readErr
		}
		var config catalog.Configuration
		if readErr = json.Unmarshal(raw, &config); readErr != nil {
			return result, next, readErr
		}
		if catalog.Available(config, false, "accounts") {
			result = append(result, MarketGame{Slug: candidate.Slug, Name: config.Name})
		}
	}
	return result, next, nil
}
