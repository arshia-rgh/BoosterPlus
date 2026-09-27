package catalog

import (
	"context"
	"strings"
	"unicode/utf8"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/game"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// StaffFilters applies literal name/slug discovery and lifecycle filtering before pagination.
type StaffFilters struct{ Search, State, After string }

// StaffList returns draft metadata only after checking current staff authority.
func (s *Store) StaffList(ctx context.Context, p *identity.Principal, input StaffFilters) (Listing, error) {
	result := Listing{Games: []Summary{}}
	if !utf8.ValidString(input.Search) || len([]rune(input.Search)) > 160 || strings.ContainsRune(input.Search, 0) || (input.After != "" && !slugPattern.MatchString(input.After)) {
		return result, &Invalid{[]Issue{{"search", "Use bounded catalog filters and a valid cursor."}}}
	}
	err := s.auth.AuthorizedTransaction(ctx, p, "admin", false, func(tx *ent.Tx, _ *identity.Principal) error {
		result = Listing{Games: []Summary{}}
		q := tx.Game.Query().Order(ent.Asc(game.FieldSlug)).Limit(51)
		if input.Search != "" {
			q.Where(game.Or(game.NameContainsFold(input.Search), game.SlugContainsFold(input.Search)))
		}
		if input.After != "" {
			q.Where(game.SlugGT(input.After))
		}
		switch input.State {
		case "":
		case "draft":
			q.Where(game.PublishedEQ(false), game.ArchivedEQ(false))
		case "published":
			q.Where(game.PublishedEQ(true), game.ArchivedEQ(false))
		case "paused":
			q.Where(game.PausedEQ(true), game.ArchivedEQ(false))
		case "archived":
			q.Where(game.ArchivedEQ(true))
		default:
			return &Invalid{[]Issue{{"state", "Choose a known catalog state."}}}
		}
		rows, err := q.All(ctx)
		if err != nil {
			return err
		}
		if len(rows) > 50 {
			result.Next = rows[49].Slug
			rows = rows[:50]
		}
		for _, row := range rows {
			c, err := configuration(row.Configuration)
			if err != nil {
				return err
			}
			result.Games = append(result.Games, Summary{HeroLayout: c.HeroLayout, Capabilities: Capabilities(c, row.Paused), IntakeEnabled: c.Intake != nil && Available(c, row.Paused, "accounts"), ID: row.ID, Slug: row.Slug, Name: c.Name, Description: c.Description, Asset: c.Asset, AssetAlt: c.AssetAlt, Paused: row.Paused, Published: row.Published, Archived: row.Archived, Revision: row.Version})
		}
		return nil
	})
	return result, err
}
