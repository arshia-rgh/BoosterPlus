package news

import (
	"context"
	"errors"
	"time"
)

// SitemapEntry is a currently public canonical article URL and its correction time.
type SitemapEntry struct {
	Slug      string    `json:"slug"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Sitemap reads public canonical URLs in one bounded projection, never private slugs.
// The standard 50,000-URL bound fails closed instead of silently omitting content.
func (s *Store) Sitemap(ctx context.Context, slug string) (out []SitemapEntry, resultErr error) {
	out = []SitemapEntry{}
	g, err := publicGame(ctx, s.client, slug)
	if err != nil {
		return nil, err
	}
	rows, err := s.client.QueryContext(ctx, `SELECT r.slug,a.public_updated_at FROM articles a JOIN article_revisions r ON r.id=a.current_revision AND r.article_id=a.id WHERE a.game_id=? AND a.state IN ('published','scheduled') AND a.public_updated_at IS NOT NULL ORDER BY a.id LIMIT 50001`, g.ID)
	if err != nil {
		return nil, err
	}
	defer func() { resultErr = errors.Join(resultErr, rows.Close()) }()
	for rows.Next() {
		var item SitemapEntry
		if err = rows.Scan(&item.Slug, &item.UpdatedAt); err != nil {
			return nil, err
		}
		if !slugPattern.MatchString(item.Slug) {
			return nil, ErrConflict
		}
		out = append(out, item)
		if len(out) > 50000 {
			return nil, ErrConflict
		}
	}
	return out, rows.Err()
}
