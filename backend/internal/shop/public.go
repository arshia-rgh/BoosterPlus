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
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierbinding"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// PublicProduct contains only published terms and indicative available capacity.
type PublicProduct struct {
	ID                string         `json:"id"`
	GameID            string         `json:"game_id"`
	GameSlug          string         `json:"game_slug"`
	ReleaseID         string         `json:"release_id"`
	Version           int            `json:"version"`
	Definition        Definition     `json:"definition"`
	Available         map[string]int `json:"available"`
	SupplierAvailable bool           `json:"supplier_available"`
}

// MarshalJSON hides staff artwork provenance only at the HTTP boundary. The
// full definition remains available internally for immutable purchase records.
func (p PublicProduct) MarshalJSON() ([]byte, error) {
	type customerProduct PublicProduct
	view := customerProduct(p)
	view.Definition.AssetSource = ""
	return json.Marshal(view)
}

// PublicPage is bounded by a stable product cursor. Filters apply before pagination.
type PublicPage struct {
	Items []PublicProduct `json:"items"`
	Next  string          `json:"next"`
}

// BrowseInput scopes discovery to one game and bounded release-backed filters.
type BrowseInput struct{ Slug, After, Search, Region, Category, Method string }

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
	if definition.Supplier != nil {
		binding, e := c.SupplierBinding.Get(ctx, release.ID)
		if e != nil {
			return PublicProduct{}, e
		}
		if binding.ShopProductID != row.ID || binding.ReleaseID == nil || *binding.ReleaseID != release.ID || !supplierMatches(definition, binding.Data) {
			return PublicProduct{}, ErrConflict
		}
		conn, e := c.SupplierConnection.Get(ctx, string(binding.Data.Connection))
		if e != nil {
			return PublicProduct{}, e
		}
		out.SupplierAvailable = conn.PurchasesEnabled && conn.MerchantID == binding.Data.MerchantID
		return out, nil
	}
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
	if allowed, e := s.visibleSupplier(ctx, row); e != nil || !allowed {
		return PublicProduct{}, ErrConflict
	}
	result, err := publicProduct(ctx, s.client, row, g)
	if err != nil {
		return result, err
	}
	result.SupplierAvailable = result.SupplierAvailable && s.supplierBuying(ctx, row)
	return result, nil
}

// Browse uses the immutable current release rather than mutable draft titles.
// All filters use released data and apply before stable keyset pagination.
func (s *Store) Browse(ctx context.Context, input BrowseInput) (PublicPage, error) {
	out := PublicPage{Items: []PublicProduct{}}
	if input.After != "" && !validID(input.After) || !text(input.Search, 0, 120) || !text(input.Region, 0, 80) || !text(input.Category, 0, 80) || !validDeliveryFilter(input.Method) {
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
		selector.Where(s.visibleSupplierProduct(selector))
		released := sql.Table(shopproductrelease.Table)
		selector.Join(released).On(selector.C(shopproduct.FieldCurrentRelease), released.C(shopproductrelease.FieldID))
		if search := strings.TrimSpace(input.Search); search != "" {
			selector.Where(sql.Or(sqljson.StringContains(released.C(shopproductrelease.FieldData), search, sqljson.Path("title")), sqljson.StringContains(released.C(shopproductrelease.FieldData), search, sqljson.Path("description"))))
		}
		if input.Category != "" {
			selector.Where(sqljson.ValueEQ(released.C(shopproductrelease.FieldData), input.Category, sqljson.Path("category")))
		}
		if input.Method == "manual" {
			selector.Where(sql.Or(sql.Not(sqljson.HasKey(released.C(shopproductrelease.FieldData), sqljson.Path("supplier"))), sqljson.ValueIsNull(released.C(shopproductrelease.FieldData), sqljson.Path("supplier"))))
		} else if input.Method != "" {
			selector.Where(sqljson.ValueEQ(released.C(shopproductrelease.FieldData), input.Method, sqljson.Path("supplier", "method")))
		}
		if input.Region != "" {
			stock := sql.Table(shopstock.Table)
			selector.Where(sql.Or(
				sqljson.ValueEQ(released.C(shopproductrelease.FieldData), input.Region, sqljson.Path("variants", "[0]", "region")),
				sql.In(selector.C(shopproduct.FieldID), sql.Select(stock.C(shopstock.FieldProductID)).From(stock).Where(sql.And(sql.EQ(stock.C(shopstock.FieldRegion), input.Region), sql.EQ(stock.C(shopstock.FieldEnabled), true), sql.ColumnsEQ(stock.C(shopstock.FieldReleaseID), selector.C(shopproduct.FieldCurrentRelease))))),
			))
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
		allowed, e := s.visibleSupplier(ctx, row)
		if e != nil {
			return PublicPage{}, e
		}
		if !allowed {
			continue
		}
		product, e := publicProduct(ctx, s.client, row, g)
		if e != nil {
			return PublicPage{}, e
		}
		product.SupplierAvailable = product.SupplierAvailable && s.supplierBuying(ctx, row)
		out.Items = append(out.Items, product)
	}
	return out, nil
}

// visibleSupplierProduct applies merchant/environment visibility before keyset
// pagination, so hidden old imports cannot displace current or manual offers.
func (s *Store) visibleSupplierProduct(product *sql.Selector) *sql.Predicate {
	binding := sql.Table(supplierbinding.Table)
	all := sql.Select(binding.C(supplierbinding.FieldID)).From(binding)
	allowed := []*sql.Predicate{sql.ExprP("FALSE")}
	if s.supplier != nil {
		for _, id := range []suppliers.Connection{suppliers.NexusSandbox, suppliers.NexusProduction} {
			if merchant := s.supplier.ConfiguredMerchant(id); merchant != "" {
				allowed = append(allowed, sql.And(sqljson.ValueEQ(binding.C(supplierbinding.FieldData), string(id), sqljson.Path("connection")), sqljson.ValueEQ(binding.C(supplierbinding.FieldData), merchant, sqljson.Path("merchant_id"))))
			}
		}
	}
	current := sql.Select(binding.C(supplierbinding.FieldID)).From(binding).Where(sql.And(sql.Or(allowed...), sql.ColumnsEQ(binding.C(supplierbinding.FieldShopProductID), product.C(shopproduct.FieldID))))
	return sql.Or(sql.NotIn(product.C(shopproduct.FieldCurrentRelease), all), sql.In(product.C(shopproduct.FieldCurrentRelease), current))
}

func (s *Store) visibleSupplier(ctx context.Context, row *ent.ShopProduct) (bool, error) {
	binding, err := s.client.SupplierBinding.Get(ctx, row.CurrentRelease)
	if ent.IsNotFound(err) {
		return true, nil
	}
	if err != nil {
		return false, err
	}
	if binding.Data == nil || s.supplier == nil {
		return false, nil
	}
	return s.supplier.MerchantConfigured(binding.Data.Connection, binding.Data.MerchantID), nil
}

func validDeliveryFilter(method string) bool {
	return method == "" || method == "manual" || method == "id" || method == "account" || method == "code"
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

func (s *Store) supplierBuying(ctx context.Context, row *ent.ShopProduct) bool {
	if s.supplier == nil {
		return false
	}
	binding, err := s.client.SupplierBinding.Get(ctx, row.CurrentRelease)
	return err == nil && binding.Data != nil && s.supplier.CanPurchase(binding.Data.Connection, binding.Data.MerchantID)
}
