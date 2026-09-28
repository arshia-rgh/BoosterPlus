package shop

import (
	"context"
	"encoding/json"
	"strings"

	"entgo.io/ent/dialect/sql"
	"entgo.io/ent/dialect/sql/sqljson"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/game"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopproduct"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopproductrelease"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopstock"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

// PublicProduct contains only published terms and indicative available capacity.
type PublicProduct struct {
	ID         string         `json:"id"`
	GameID     string         `json:"game_id"`
	GameSlug   string         `json:"game_slug"`
	ReleaseID  string         `json:"release_id"`
	Version    int            `json:"version"`
	Definition Definition     `json:"definition"`
	Available  map[string]int `json:"available"`
}

// PublicPage is bounded by a stable product cursor. Filters apply before pagination.
type PublicPage struct {
	Items []PublicProduct `json:"items"`
	Next  string          `json:"next"`
}

// BrowseInput scopes discovery to one game and bounded release-backed filters.
type BrowseInput struct{ Slug, After, Search, Region, Category string }

func publicProduct(ctx context.Context, c *ent.Client, row *ent.ShopProduct, g *ent.Game) (PublicProduct, error) {
	release, err := c.ShopProductRelease.Query().Where(shopproductrelease.IDEQ(row.CurrentRelease), shopproductrelease.ProductIDEQ(row.ID)).Only(ctx)
	if err != nil {
		return PublicProduct{}, err
	}
	definition, err := definition(release.Data)
	if err != nil {
		return PublicProduct{}, err
	}
	if len(Validate(definition, true)) != 0 {
		return PublicProduct{}, ErrConflict
	}
	out := PublicProduct{ID: row.ID, GameID: g.ID, GameSlug: g.Slug, ReleaseID: release.ID, Version: release.Version, Definition: definition, Available: map[string]int{}}
	stocks, err := c.ShopStock.Query().Where(shopstock.ProductIDEQ(row.ID), shopstock.ReleaseIDEQ(release.ID), shopstock.EnabledEQ(true)).All(ctx)
	if err != nil {
		return PublicProduct{}, err
	}
	for _, stock := range stocks {
		if stock.Total >= stock.Reserved+stock.Committed {
			out.Available[stock.VariantKey] = stock.Total - stock.Reserved - stock.Committed
		}
	}
	return out, nil
}
func publicGame(ctx context.Context, c *ent.Client, slug string) (*ent.Game, error) {
	if !text(slug, 1, 80) {
		return nil, ErrInvalid
	}
	row, err := c.Game.Query().Where(game.SlugEQ(slug), game.PublishedEQ(true), game.ArchivedEQ(false), game.PausedEQ(false)).Only(ctx)
	if err != nil {
		return nil, err
	}
	available, err := catalog.GameAvailable(ctx, c, row, "shop")
	if err != nil {
		return nil, err
	}
	if !available {
		return nil, ErrConflict
	}
	return row, nil
}

// Published never returns draft, paused or archived product data.
func (s *Store) Published(ctx context.Context, slug, id string) (PublicProduct, error) {
	if !validID(id) {
		return PublicProduct{}, ErrInvalid
	}
	g, err := publicGame(ctx, s.client, slug)
	if err != nil {
		return PublicProduct{}, err
	}
	row, err := s.client.ShopProduct.Query().Where(shopproduct.IDEQ(id), shopproduct.GameIDEQ(g.ID), shopproduct.StateEQ("published")).Only(ctx)
	if err != nil {
		return PublicProduct{}, err
	}
	return publicProduct(ctx, s.client, row, g)
}

// Browse uses the immutable current release rather than mutable draft titles.
// All filters use released data and apply before stable keyset pagination.
func (s *Store) Browse(ctx context.Context, input BrowseInput) (PublicPage, error) {
	out := PublicPage{Items: []PublicProduct{}}
	if input.After != "" && !validID(input.After) || !text(input.Search, 0, 120) || !text(input.Region, 0, 80) || !text(input.Category, 0, 80) {
		return out, ErrInvalid
	}
	g, err := publicGame(ctx, s.client, input.Slug)
	if err != nil {
		return out, err
	}
	q := s.client.ShopProduct.Query().Where(shopproduct.GameIDEQ(g.ID), shopproduct.StateEQ("published")).Order(ent.Asc(shopproduct.FieldID)).Limit(51)
	if input.After != "" {
		q.Where(shopproduct.IDGT(input.After))
	}
	q.Where(func(selector *sql.Selector) {
		released := sql.Table(shopproductrelease.Table)
		selector.Join(released).On(selector.C(shopproduct.FieldCurrentRelease), released.C(shopproductrelease.FieldID))
		if search := strings.TrimSpace(input.Search); search != "" {
			selector.Where(sql.Or(sqljson.StringContains(released.C(shopproductrelease.FieldData), search, sqljson.Path("title")), sqljson.StringContains(released.C(shopproductrelease.FieldData), search, sqljson.Path("description"))))
		}
		if input.Category != "" {
			selector.Where(sqljson.ValueEQ(released.C(shopproductrelease.FieldData), input.Category, sqljson.Path("category")))
		}
		if input.Region != "" {
			stock := sql.Table(shopstock.Table)
			selector.Where(sql.In(selector.C(shopproduct.FieldID), sql.Select(stock.C(shopstock.FieldProductID)).From(stock).Where(sql.And(sql.EQ(stock.C(shopstock.FieldRegion), input.Region), sql.EQ(stock.C(shopstock.FieldEnabled), true)))))
		}
	})
	rows, err := q.All(ctx)
	if err != nil {
		return out, err
	}
	if len(rows) > 50 {
		out.Next = rows[49].ID
		rows = rows[:50]
	}
	for _, row := range rows {
		product, e := publicProduct(ctx, s.client, row, g)
		if e != nil {
			return PublicPage{}, e
		}
		out.Items = append(out.Items, product)
	}
	return out, nil
}
func snapshot(value any) (map[string]any, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	var out map[string]any
	err = json.Unmarshal(raw, &out)
	return out, err
}
