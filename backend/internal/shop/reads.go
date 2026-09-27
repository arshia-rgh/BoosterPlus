package shop

import (
	"context"
	"slices"
	"strings"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopproduct"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopproductrelease"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Filters bound staff search before stable keyset pagination.
type Filters struct{ After, Search, GameID, State string }

// Summary identifies an editor without private actor metadata.
type Summary struct {
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
	if filter.After != "" && !validID(filter.After) || filter.GameID != "" && !validID(filter.GameID) || !text(filter.Search, 0, 120) || !slices.Contains([]string{"", "draft", "published", "paused", "archived"}, filter.State) {
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
		rows, e := q.All(ctx)
		if e != nil {
			return e
		}
		if len(rows) > 50 {
			out.Next = rows[49].ID
			rows = rows[:50]
		}
		for _, row := range rows {
			out.Items = append(out.Items, Summary{row.ID, row.GameID, row.GameName, row.Slug, row.Title, row.Version, row.State, row.UpdatedAt})
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
func (s *Store) Preview(ctx context.Context, p *identity.Principal, id string) (Preview, error) {
	value, err := s.Draft(ctx, p, id)
	if err != nil {
		return Preview{}, err
	}
	return Preview{value, Validate(value.Definition, true)}, nil
}
