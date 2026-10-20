package shop

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"entgo.io/ent/dialect/sql"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopproduct"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopproductrelease"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopstock"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Filters bound staff search before stable keyset pagination.
type Filters struct{ After, Search, GameID, State, Availability string }

// Summary identifies an editor without private actor metadata.
type Summary struct {
	Supplier  bool      `json:"supplier,omitempty"`
	ID        string    `json:"id"`
	GameID    string    `json:"game_id"`
	Game      string    `json:"game"`
	Slug      string    `json:"slug"`
	Title     string    `json:"title"`
	Version   int       `json:"version"`
	State     string    `json:"state"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Products is a bounded staff catalog page.
type Products struct {
	Items []Summary `json:"items"`
	Next  string    `json:"next"`
}

// List exposes draft titles only to currently authorized administrators.
func (s *Store) List(ctx context.Context, p *identity.Principal, filter Filters) (out Products, err error) {
	out.Items = []Summary{}
	if filter.After != "" && !validID(filter.After) || filter.GameID != "" && !validID(filter.GameID) || !text(filter.Search, 0, 120) || !slices.Contains([]string{"", "draft", "published", "paused", "archived"}, filter.State) || !slices.Contains([]string{"", "available", "unavailable"}, filter.Availability) {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, _ *identity.Principal) error {
		q := tx.ShopProduct.Query().Order(ent.Asc(shopproduct.FieldID)).Limit(51)
		if filter.After != "" {
			q.Where(shopproduct.IDGT(filter.After))
		}
		if filter.GameID != "" {
			q.Where(shopproduct.GameIDEQ(filter.GameID))
		}
		if filter.State != "" {
			q.Where(shopproduct.StateEQ(filter.State))
		}
		if search := strings.TrimSpace(filter.Search); search != "" {
			q.Where(shopproduct.Or(shopproduct.TitleContainsFold(search), shopproduct.IDEQ(search)))
		}
		if filter.Availability != "" {
			q.Where(func(selector *sql.Selector) {
				available := s.purchasableProduct(selector)
				if filter.Availability == "available" {
					selector.Where(available)
				} else {
					selector.Where(sql.Not(available))
				}
			})
		}
		rows, e := q.All(ctx)
		if e != nil {
			return e
		}
		if len(rows) > 50 {
			out.Next = rows[49].ID
			rows = rows[:50]
		}
		for _, row := range rows {
			out.Items = append(out.Items, Summary{row.Draft["supplier"] != nil, row.ID, row.GameID, row.GameName, row.Slug, row.Title, row.Version, row.State, row.UpdatedAt})
		}
		return nil
	})
	return out, err
}

// Release preserves an immutable published customer contract.
type Release struct {
	ID         string     `json:"id"`
	ProductID  string     `json:"product_id"`
	Version    int        `json:"version"`
	Definition Definition `json:"definition"`
	CreatedAt  time.Time  `json:"created_at"`
}

// History pages saved publications newest-first by revision.
type History struct {
	Items []Release `json:"items"`
	Next  int       `json:"next"`
}

// Releases never substitutes a working draft for a historical publication.
func (s *Store) Releases(ctx context.Context, p *identity.Principal, id string, after int) (out History, err error) {
	out.Items = []Release{}
	if !validID(id) || after < 0 || after >= 2147483645 {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, _ *identity.Principal) error {
		if _, e := tx.ShopProduct.Get(ctx, id); e != nil {
			return e
		}
		q := tx.ShopProductRelease.Query().Where(shopproductrelease.ProductIDEQ(id)).Order(ent.Desc(shopproductrelease.FieldVersion)).Limit(51)
		if after > 0 {
			q.Where(shopproductrelease.VersionLT(after))
		}
		rows, e := q.All(ctx)
		if e != nil {
			return e
		}
		if len(rows) > 50 {
			out.Next = rows[49].Version
			rows = rows[:50]
		}
		for _, row := range rows {
			value, decodeErr := definition(row.Data)
			if decodeErr != nil {
				return decodeErr
			}
			out.Items = append(out.Items, Release{row.ID, row.ProductID, row.Version, value, row.CreatedAt})
		}
		return nil
	})
	return out, err
}

// Preview retains staff context and names saved-publication blockers.
type Preview struct {
	Draft  Draft   `json:"draft"`
	Issues []Issue `json:"issues"`
}

// Preview reads only the saved revision; unsaved local input cannot publish implicitly.
func (s *Store) Preview(ctx context.Context, p *identity.Principal, id string) (out Preview, err error) {
	if !validID(id) {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, _ *identity.Principal) error {
		row, e := tx.ShopProduct.Get(ctx, id)
		if e != nil {
			return e
		}
		out.Draft, e = draft(ctx, tx, row)
		if e != nil {
			return e
		}
		out.Issues = validateCurrentPublication(out.Draft.Definition)
		if out.Draft.Definition.Supplier != nil {
			if e = s.supplierPublication(ctx, tx, row, out.Draft.Definition, ""); e != nil {
				out.Issues = append(out.Issues, Issue{Path: "supplier", Message: "Refresh the supplier binding from the current configured merchant before publishing."})
			}
			return nil
		}
		for i, variant := range out.Draft.Definition.Variants {
			current, e := tx.ShopStock.Query().Where(shopstock.ProductIDEQ(id), shopstock.VariantKeyEQ(variant.Key)).Only(ctx)
			if ent.IsNotFound(e) {
				continue
			}
			if e != nil {
				return e
			}
			if incompatible(current, variant) {
				out.Issues = append(out.Issues, Issue{Path: fmt.Sprintf("variants.%d.key", i), Message: "Published variant keys keep their region, platform and server. Use a new key for different compatibility."})
			}
		}
		return nil
	})
	return out, err
}
