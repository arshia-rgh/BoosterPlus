package artwork

import (
	"context"
	"errors"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
)

// Current publication pointers, never draft or historic revisions, grant access.
// Service capability predicates mirror the news/shop discovery requirements.
const publicReference = `SELECT 1 FROM games g JOIN catalog_releases c ON c.id=g.current_release AND c.game_id=g.id
 WHERE g.published=1 AND g.archived=0 AND JSON_UNQUOTE(JSON_EXTRACT(c.configuration,'$.asset'))=?
 UNION ALL
 SELECT 1 FROM games g JOIN catalog_releases c ON c.id=g.current_release AND c.game_id=g.id
 WHERE g.published=1 AND g.archived=0 AND g.paused=0
 AND (JSON_EXTRACT(c.configuration,'$.discovery') IS NULL OR JSON_CONTAINS(c.configuration,'{"service":"boost","state":"active"}','$.discovery.capabilities')=1)
 AND JSON_SEARCH(c.configuration,'one',?,NULL,'$.packages[*].asset') IS NOT NULL
 UNION ALL
 SELECT 1 FROM articles a JOIN article_revisions r ON r.id=a.current_revision AND r.article_id=a.id
 JOIN games g ON g.id=a.game_id JOIN catalog_releases c ON c.id=g.current_release AND c.game_id=g.id
 WHERE a.state IN ('published','scheduled') AND a.published_at IS NOT NULL AND a.public_updated_at IS NOT NULL
 AND g.published=1 AND g.archived=0 AND g.paused=0
 AND JSON_CONTAINS(c.configuration,'{"service":"news","state":"active"}','$.discovery.capabilities')=1
 AND (JSON_UNQUOTE(JSON_EXTRACT(r.data,'$.asset'))=? OR JSON_SEARCH(r.data,'one',?,NULL,'$.blocks[*].url','$.blocks[*].images[*].url') IS NOT NULL)
 UNION ALL
 SELECT 1 FROM shop_products p JOIN shop_product_releases r ON r.id=p.current_release AND r.product_id=p.id
 JOIN games g ON g.id=p.game_id JOIN catalog_releases c ON c.id=g.current_release AND c.game_id=g.id
 WHERE p.state IN ('published','paused') AND g.published=1 AND g.archived=0 AND g.paused=0
 AND JSON_CONTAINS(c.configuration,'{"service":"shop","state":"active"}','$.discovery.capabilities')=1
 AND JSON_UNQUOTE(JSON_EXTRACT(r.data,'$.asset'))=? LIMIT 1`

func (s *Store) public(ctx context.Context, path string) (result error) {
	rows, err := s.client.QueryContext(ctx, publicReference, path, path, path, path, path)
	if err != nil {
		return err
	}
	defer func() { result = errors.Join(result, rows.Close()) }()
	found := rows.Next()
	if err = rows.Err(); err != nil {
		return err
	}
	if !found {
		return media.ErrConflict
	}
	return nil
}
