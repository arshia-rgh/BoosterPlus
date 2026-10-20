package shop

import (
	"context"
	"errors"
	"slices"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// PublicFilters contains only facets from visible published shop releases.
type PublicFilters struct {
	Regions    []string `json:"regions"`
	Categories []string `json:"categories"`
}

// PublicFilters projects distinct released facets, never private imported rows.
func (s *Store) PublicFilters(ctx context.Context, slug string) (out PublicFilters, err error) {
	out = PublicFilters{Regions: []string{}, Categories: []string{}}
	game, err := publicGame(ctx, s.client, slug)
	if err != nil {
		return out, err
	}
	sandbox, production := "", ""
	if s.supplier != nil {
		sandbox = s.supplier.ConfiguredMerchant(suppliers.NexusSandbox)
		production = s.supplier.ConfiguredMerchant(suppliers.NexusProduction)
	}
	tx, err := s.client.Tx(ctx)
	if err != nil {
		return out, err
	}
	defer func() {
		if err != nil {
			err = errors.Join(err, tx.Rollback())
		}
	}()
	rows, err := tx.QueryContext(ctx, `WITH visible AS (
 SELECT p.id, p.current_release, r.data FROM shop_products p
 JOIN shop_product_releases r ON r.id=p.current_release AND r.product_id=p.id
 LEFT JOIN supplier_bindings b ON b.id=r.id
 WHERE p.game_id=? AND p.state='published' AND (
 b.id IS NULL OR (JSON_UNQUOTE(JSON_EXTRACT(b.data,'$.connection'))='nexus-sandbox' AND JSON_UNQUOTE(JSON_EXTRACT(b.data,'$.merchant_id'))=?)
 OR (JSON_UNQUOTE(JSON_EXTRACT(b.data,'$.connection'))='nexus-production' AND JSON_UNQUOTE(JSON_EXTRACT(b.data,'$.merchant_id'))=?)))
 SELECT 'category' kind, JSON_UNQUOTE(JSON_EXTRACT(data,'$.category')) value FROM visible
 UNION SELECT 'region', s.region FROM visible v JOIN shop_stocks s ON s.product_id=v.id AND s.release_id=v.current_release WHERE s.enabled=1
 UNION SELECT 'region', JSON_UNQUOTE(JSON_EXTRACT(data,'$.variants[0].region')) FROM visible WHERE JSON_EXTRACT(data,'$.supplier') IS NOT NULL
 LIMIT 1001`, game.ID, sandbox, production)
	if err != nil {
		return out, err
	}
	count := 0
	for rows.Next() {
		var kind, value string
		if err = rows.Scan(&kind, &value); err != nil {
			break
		}
		count++
		if value == "" {
			continue
		}
		if kind == "region" {
			out.Regions = append(out.Regions, value)
		} else {
			out.Categories = append(out.Categories, value)
		}
	}
	err = errors.Join(err, rows.Err(), rows.Close())
	if err != nil {
		return out, err
	}
	if count > 1000 {
		return out, ErrConflict
	}
	slices.Sort(out.Regions)
	slices.Sort(out.Categories)
	return out, tx.Commit()
}
