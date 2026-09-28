package news

import (
	"context"
	"slices"
	"strings"
	"time"

	"entgo.io/ent/dialect/sql"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/article"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/articleevent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/articlerevision"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/articleslug"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/game"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Filters are applied before bounded keyset pagination.
type Filters struct{ After, Search, GameID, State, Kind, Author string }

// Summary identifies a private editor without exposing document contents.
type Summary struct {
	GameName    string     `json:"game_name"`
	ID          string     `json:"id"`
	GameID      string     `json:"game_id"`
	Title       string     `json:"title"`
	Kind        string     `json:"kind"`
	Author      string     `json:"author"`
	State       string     `json:"state"`
	Version     int        `json:"version"`
	UpdatedAt   time.Time  `json:"updated_at"`
	ScheduledAt *time.Time `json:"scheduled_at"`
}

// Page is one staff list page.
type Page struct {
	Items []Summary `json:"items"`
	Next  string    `json:"next"`
}

func validFilters(f Filters) bool {
	return (f.After == "" || validID(f.After)) && (f.GameID == "" || validID(f.GameID)) && text(f.Search, 0, 160) && text(f.Author, 0, 120) && slices.Contains([]string{"", "update", "patch", "guide"}, f.Kind) && slices.Contains([]string{"", "draft", "scheduled", "published", "unpublished", "archived"}, f.State)
}

// List checks current administrator authority and applies search before pagination.
func (s *Store) List(ctx context.Context, p *identity.Principal, f Filters) (out Page, err error) {
	out.Items = []Summary{}
	if !validFilters(f) {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, _ *identity.Principal) error {
		q := tx.Article.Query().Order(ent.Asc(article.FieldID)).Limit(51)
		if f.After != "" {
			q.Where(article.IDGT(f.After))
		}
		if f.GameID != "" {
			q.Where(article.GameIDEQ(f.GameID))
		}
		if f.State != "" {
			q.Where(article.StateEQ(f.State))
		}
		if f.Kind != "" {
			q.Where(article.KindEQ(f.Kind))
		}
		if f.Author != "" {
			q.Where(article.AuthorContainsFold(f.Author))
		}
		if v := strings.TrimSpace(f.Search); v != "" {
			q.Where(article.Or(article.TitleContainsFold(v), article.IDEQ(v)))
		}
		rows, e := q.All(ctx)
		if e != nil {
			return e
		}
		if len(rows) > 50 {
			out.Next = rows[49].ID
			rows = rows[:50]
		}
		ids := make([]string, 0, len(rows))
		for _, r := range rows {
			ids = append(ids, r.GameID)
		}
		games, e := tx.Game.Query().Where(game.IDIn(ids...)).All(ctx)
		if e != nil {
			return e
		}
		names := map[string]string{}
		for _, g := range games {
			names[g.ID] = g.Name
		}
		for _, r := range rows {
			out.Items = append(out.Items, Summary{names[r.GameID], r.ID, r.GameID, r.Title, r.Kind, r.Author, r.State, r.Version, r.UpdatedAt, r.ScheduledAt})
		}
		return nil
	})
	return out, err
}

// HistoryEntry records a versioned editorial action and immutable revision reference.
type HistoryEntry struct {
	Version    int       `json:"version"`
	Action     string    `json:"action"`
	RevisionID string    `json:"revision_id"`
	At         time.Time `json:"at"`
}

// History is bounded and omits internal actor identifiers from editorial content.
type History struct {
	Items []HistoryEntry `json:"items"`
	Next  int            `json:"next"`
}

// History returns actions in descending version order.
func (s *Store) History(ctx context.Context, p *identity.Principal, id string, before int) (out History, err error) {
	out.Items = []HistoryEntry{}
	if !validID(id) || before < 0 || before > 2147483645 {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, _ *identity.Principal) error {
		if _, e := tx.Article.Get(ctx, id); e != nil {
			return e
		}
		q := tx.ArticleEvent.Query().Where(articleevent.ArticleIDEQ(id)).Order(ent.Desc(articleevent.FieldVersion)).Limit(51)
		if before > 0 {
			q.Where(articleevent.VersionLT(before))
		}
		rows, e := q.All(ctx)
		if e != nil {
			return e
		}
		if len(rows) > 50 {
			out.Next = rows[49].Version
			rows = rows[:50]
		}
		for _, r := range rows {
			out.Items = append(out.Items, HistoryEntry{r.Version, r.Action, r.RevisionID, r.CreatedAt})
		}
		return nil
	})
	return out, err
}

// Preview returns an exact authorized revision, never a public endpoint.
func (s *Store) Preview(ctx context.Context, p *identity.Principal, id, revisionID string) (out Definition, err error) {
	if !validID(id) || !validID(revisionID) {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, _ *identity.Principal) error {
		row, e := tx.ArticleRevision.Get(ctx, revisionID)
		if e != nil {
			return e
		}
		if row.ArticleID != id {
			return ErrConflict
		}
		out, e = decode(row.Data)
		return e
	})
	return out, err
}

// PublicArticle contains only a released editorial revision and public dates.
type PublicArticle struct {
	ID          string     `json:"id"`
	GameSlug    string     `json:"game_slug"`
	RevisionID  string     `json:"revision_id"`
	Definition  Definition `json:"definition"`
	PublishedAt time.Time  `json:"published_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	Redirect    bool       `json:"redirect"`
}

// PublicPage lists released summaries, without article bodies.
type PublicPage struct {
	Items []PublicArticle `json:"items"`
	Next  string          `json:"next"`
}

func publicGame(ctx context.Context, c *ent.Client, slug string) (*ent.Game, error) {
	if !slugPattern.MatchString(slug) {
		return nil, ErrInvalid
	}
	g, e := c.Game.Query().Where(game.SlugEQ(slug), game.PublishedEQ(true), game.ArchivedEQ(false), game.PausedEQ(false)).Only(ctx)
	if e != nil {
		return nil, e
	}
	available, e := catalog.GameAvailable(ctx, c, g, "news")
	if e != nil {
		return nil, e
	}
	if !available {
		return nil, ErrConflict
	}
	return g, nil
}
func publicArticle(ctx context.Context, c *ent.Client, r *ent.Article, g *ent.Game, body bool) (PublicArticle, error) {
	if r.CurrentRevision == "" || r.PublishedAt == nil || r.PublicUpdatedAt == nil || !slices.Contains([]string{"published", "scheduled"}, r.State) {
		return PublicArticle{}, ErrConflict
	}
	rev, e := c.ArticleRevision.Query().Where(articlerevision.IDEQ(r.CurrentRevision), articlerevision.ArticleIDEQ(r.ID)).Only(ctx)
	if e != nil {
		return PublicArticle{}, e
	}
	return projectArticle(r, rev, g, body)
}

func projectArticle(r *ent.Article, rev *ent.ArticleRevision, g *ent.Game, body bool) (PublicArticle, error) {
	if rev == nil || rev.ID != r.CurrentRevision || rev.ArticleID != r.ID || r.PublishedAt == nil || r.PublicUpdatedAt == nil || !slices.Contains([]string{"published", "scheduled"}, r.State) {
		return PublicArticle{}, ErrConflict
	}
	d, e := decode(rev.Data)
	if e != nil {
		return PublicArticle{}, e
	}
	if len(Validate(d, true)) > 0 {
		return PublicArticle{}, ErrConflict
	}
	if !body {
		d.Blocks = []Block{}
	}
	return PublicArticle{r.ID, g.Slug, rev.ID, d, *r.PublishedAt, *r.PublicUpdatedAt, false}, nil
}

// Browse searches released metadata only; unpublished edits cannot leak into discovery.
func (s *Store) Browse(ctx context.Context, slug string, f Filters) (out PublicPage, err error) {
	out.Items = []PublicArticle{}
	if !validFilters(f) || f.State != "" || f.GameID != "" || f.Author != "" {
		return out, ErrInvalid
	}
	g, err := publicGame(ctx, s.client, slug)
	if err != nil {
		return out, err
	}
	q := s.client.Article.Query().Where(article.GameIDEQ(g.ID), article.CurrentRevisionNEQ(""), article.StateIn("published", "scheduled")).Order(ent.Asc(article.FieldID)).Limit(25)
	if f.After != "" {
		q.Where(article.IDGT(f.After))
	}
	if f.Kind != "" || strings.TrimSpace(f.Search) != "" {
		q.Where(func(sel *sql.Selector) {
			r := sql.Table(articlerevision.Table)
			sub := sql.Select(r.C(articlerevision.FieldID)).From(r)
			if f.Kind != "" {
				sub.Where(sql.EQ(r.C(articlerevision.FieldKind), f.Kind))
			}
			if v := strings.TrimSpace(f.Search); v != "" {
				sub.Where(sql.ContainsFold(r.C(articlerevision.FieldTitle), v))
			}
			sel.Where(sql.In(sel.C(article.FieldCurrentRevision), sub))
		})
	}
	rows, err := q.All(ctx)
	if err != nil {
		return out, err
	}
	if len(rows) > 24 {
		out.Next = rows[23].ID
		rows = rows[:24]
	}
	ids := make([]string, 0, len(rows))
	for _, r := range rows {
		ids = append(ids, r.CurrentRevision)
	}
	revisions, err := s.client.ArticleRevision.Query().Where(articlerevision.IDIn(ids...)).Limit(24).All(ctx)
	if err != nil {
		return out, err
	}
	byID := make(map[string]*ent.ArticleRevision, len(revisions))
	for _, rev := range revisions {
		byID[rev.ID] = rev
	}
	for _, r := range rows {
		v, e := projectArticle(r, byID[r.CurrentRevision], g, false)
		if e != nil {
			return out, e
		}
		out.Items = append(out.Items, v)
	}
	return out, nil
}

// Read resolves only known same-game slug claims to the currently public revision.
func (s *Store) Read(ctx context.Context, gameSlug, slug string) (PublicArticle, error) {
	if !slugPattern.MatchString(slug) {
		return PublicArticle{}, ErrInvalid
	}
	g, e := publicGame(ctx, s.client, gameSlug)
	if e != nil {
		return PublicArticle{}, e
	}
	claim, e := s.client.ArticleSlug.Query().Where(articleslug.GameIDEQ(g.ID), articleslug.SlugEQ(slug)).Only(ctx)
	if e != nil {
		return PublicArticle{}, e
	}
	row, e := s.client.Article.Query().Where(article.IDEQ(claim.ArticleID), article.GameIDEQ(g.ID)).Only(ctx)
	if e != nil {
		return PublicArticle{}, e
	}
	v, e := publicArticle(ctx, s.client, row, g, true)
	if e != nil {
		return v, e
	}
	v.Redirect = v.Definition.Slug != slug
	return v, nil
}
