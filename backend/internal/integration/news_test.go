//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/articleevent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/news"
)

func articleDefinition() news.Definition {
	return news.Definition{Title: "Synthetic guide", Slug: "synthetic-guide", Kind: "guide", Summary: "Isolated editorial test; never public commercial content.", Author: "Fixture editor", Source: "Original fixture content.", Reviewed: true, Blocks: []news.Block{{Kind: "heading", Text: "Fixture section", Level: 2}, {Kind: "paragraph", Text: "Synthetic body."}}}
}
func articleStore(f *orderFixture) *news.Store {
	return news.New(f.auth.client, f.auth.service, func() time.Time { return time.Unix(f.auth.clock.Load(), 0) })
}
func TestArticleRevisionsAuthorityAndPublication(t *testing.T) {
	f := orderDB(t)
	s := articleStore(f)
	ctx := t.Context()
	d := articleDefinition()
	for _, p := range []*identity.Principal{nil, f.buyer, f.other, {User: f.admin.User, Session: f.buyer.Session}} {
		if _, e := s.Create(ctx, p, f.game.ID, d); e == nil {
			t.Fatal("unprivileged editorial write")
		}
	}
	row, e := s.Create(ctx, f.admin, f.game.ID, d)
	if e != nil {
		t.Fatal(e)
	}
	first := row.RevisionID
	if row.CurrentRevision != "" {
		t.Fatal("draft published")
	}
	if _, e = s.Preview(ctx, f.buyer, row.ID, first); e == nil {
		t.Fatal("customer read draft")
	}
	row, e = s.Change(ctx, f.admin, row.ID, "publish", news.Change{Version: row.Version, RevisionID: first})
	if e != nil {
		t.Fatal(e)
	}
	d.Title = "Private corrected title"
	row, e = s.Save(ctx, f.admin, row.ID, row.Version, d)
	if e != nil {
		t.Fatal(e)
	}
	if row.CurrentRevision != first || row.RevisionID == first {
		t.Fatal("working draft replaced release")
	}
	preview, e := s.Preview(ctx, f.admin, row.ID, first)
	if e != nil || preview.Title == d.Title {
		t.Fatal("history mutated", e)
	}
	if _, e = s.Save(ctx, f.admin, row.ID, row.Version-1, d); !errors.Is(e, news.ErrConflict) {
		t.Fatal("stale save", e)
	}
	if _, e = s.Change(ctx, f.admin, row.ID, "publish", news.Change{Version: row.Version, RevisionID: first}); !errors.Is(e, news.ErrConflict) {
		t.Fatal("old review published", e)
	}
	row, e = s.Change(ctx, f.admin, row.ID, "publish", news.Change{Version: row.Version, RevisionID: row.RevisionID})
	if e != nil {
		t.Fatal(e)
	}
	second := row.CurrentRevision
	row, e = s.Change(ctx, f.admin, row.ID, "unpublish", news.Change{Version: row.Version})
	if e != nil || row.CurrentRevision != "" {
		t.Fatal("unpublish", e)
	}
	row, e = s.Change(ctx, f.admin, row.ID, "archive", news.Change{Version: row.Version})
	if e != nil {
		t.Fatal(e)
	}
	if _, e = s.Save(ctx, f.admin, row.ID, row.Version, d); !errors.Is(e, news.ErrConflict) {
		t.Fatal("archived edit", e)
	}
	row, e = s.Change(ctx, f.admin, row.ID, "restore", news.Change{Version: row.Version})
	if e != nil || row.State != "draft" || row.CurrentRevision != "" {
		t.Fatal("restore activated public content", e)
	}
	if _, e = s.Preview(ctx, f.admin, row.ID, second); e != nil {
		t.Fatal("lost correction history", e)
	}
	history, e := s.History(ctx, f.admin, row.ID, 0)
	if e != nil || len(history.Items) != 7 {
		t.Fatal("history", len(history.Items), e)
	}
}
func TestArticleSchedulePinnedRevisionCancellationAndReplay(t *testing.T) {
	f := orderDB(t)
	s := articleStore(f)
	ctx := t.Context()
	d := articleDefinition()
	row, e := s.Create(ctx, f.admin, f.game.ID, d)
	if e != nil {
		t.Fatal(e)
	}
	at := time.Unix(f.auth.clock.Load(), 0).Add(2 * time.Minute).UTC().Format(time.RFC3339)
	row, e = s.Change(ctx, f.admin, row.ID, "schedule", news.Change{Version: row.Version, RevisionID: row.RevisionID, At: at})
	if e != nil {
		t.Fatal(e)
	}
	scheduled := row.ScheduledRevision
	job := articleJob(t, f, row.ID)
	if e = s.PublishHandler()(ctx, job); !errors.Is(e, news.ErrConflict) {
		t.Fatal("published early", e)
	}
	d.Title = "Newer private text"
	row, e = s.Save(ctx, f.admin, row.ID, row.Version, d)
	if e != nil {
		t.Fatal(e)
	}
	f.auth.clock.Add(121)
	if e = s.PublishHandler()(ctx, job); e != nil {
		t.Fatal(e)
	}
	if e = s.PublishHandler()(ctx, job); e != nil {
		t.Fatal("replay", e)
	}
	row, e = s.Draft(ctx, f.admin, row.ID)
	if e != nil || row.CurrentRevision != scheduled || row.RevisionID == scheduled {
		t.Fatal("scheduled revision drifted", e)
	}
	count, e := f.auth.client.ArticleEvent.Query().Where(articleevent.ArticleIDEQ(row.ID), articleevent.ActionEQ("scheduled_published")).Count(ctx)
	if e != nil || count != 1 {
		t.Fatal("duplicate scheduled publication", e)
	}
	at = time.Unix(f.auth.clock.Load(), 0).Add(2 * time.Minute).UTC().Format(time.RFC3339)
	row, e = s.Change(ctx, f.admin, row.ID, "schedule", news.Change{Version: row.Version, RevisionID: row.RevisionID, At: at})
	if e != nil {
		t.Fatal(e)
	}
	obsolete := articleJob(t, f, row.ID)
	row, e = s.Change(ctx, f.admin, row.ID, "unschedule", news.Change{Version: row.Version})
	if e != nil {
		t.Fatal(e)
	}
	f.auth.clock.Add(121)
	if e = s.PublishHandler()(ctx, obsolete); e != nil {
		t.Fatal(e)
	}
	actual, e := s.Draft(ctx, f.admin, row.ID)
	if e != nil || actual.Version != row.Version || actual.CurrentRevision != scheduled {
		t.Fatal("cancelled job published", e)
	}
}
func articleJob(t *testing.T, f *orderFixture, id string) jobs.Job {
	t.Helper()
	row, e := f.auth.client.Article.Get(t.Context(), id)
	if e != nil {
		t.Fatal(e)
	}
	raw, e := json.Marshal(map[string]string{"article_id": id, "token": row.ScheduleToken})
	if e != nil {
		t.Fatal(e)
	}
	return jobs.Job{Kind: "news.publish", Payload: raw}
}
func TestArticleScheduleRevocationAndSlugCollision(t *testing.T) {
	f := orderDB(t)
	s := articleStore(f)
	ctx := t.Context()
	d := articleDefinition()
	one, e := s.Create(ctx, f.admin, f.game.ID, d)
	if e != nil {
		t.Fatal(e)
	}
	one, e = s.Change(ctx, f.admin, one.ID, "publish", news.Change{Version: one.Version, RevisionID: one.RevisionID})
	if e != nil {
		t.Fatal(e)
	}
	two, e := s.Create(ctx, f.admin, f.game.ID, d)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = s.Change(ctx, f.admin, two.ID, "publish", news.Change{Version: two.Version, RevisionID: two.RevisionID}); e == nil {
		t.Fatal("slug stolen")
	}
	d.Slug = "different-guide"
	two, e = s.Save(ctx, f.admin, two.ID, two.Version, d)
	if e != nil {
		t.Fatal(e)
	}
	at := time.Unix(f.auth.clock.Load(), 0).Add(2 * time.Minute).UTC().Format(time.RFC3339)
	two, e = s.Change(ctx, f.admin, two.ID, "schedule", news.Change{Version: two.Version, RevisionID: two.RevisionID, At: at})
	if e != nil {
		t.Fatal(e)
	}
	job := articleJob(t, f, two.ID)
	if _, e = f.auth.client.User.UpdateOneID(f.admin.User.ID).SetSuspended(true).Save(ctx); e != nil {
		t.Fatal(e)
	}
	f.auth.clock.Add(121)
	if e = s.PublishHandler()(ctx, job); !errors.Is(e, identity.ErrForbidden) {
		t.Fatal("revoked staff published", e)
	}
	actual, e := f.auth.client.Article.Get(ctx, two.ID)
	if e != nil || actual.CurrentRevision != "" {
		t.Fatal("revoked job changed release", e)
	}
	if _, e = s.Preview(ctx, f.buyer, one.ID, uuid.NewString()); e == nil {
		t.Fatal("unauthorized revision lookup")
	}
}
func TestArticleConcurrentSaveAndAuditRollback(t *testing.T) {
	f := orderDB(t)
	s := articleStore(f)
	ctx := t.Context()
	d := articleDefinition()
	row, e := s.Create(ctx, f.admin, f.game.ID, d)
	if e != nil {
		t.Fatal(e)
	}
	var wins atomic.Int32
	var wg sync.WaitGroup
	for range 4 {
		wg.Go(func() {
			_, err := s.Save(ctx, f.admin, row.ID, row.Version, d)
			if err == nil {
				wins.Add(1)
			} else if !errors.Is(err, news.ErrConflict) {
				t.Error(err)
			}
		})
	}
	wg.Wait()
	if wins.Load() != 1 {
		t.Fatal("concurrent editor lost updates", wins.Load())
	}
	// A duplicate event key forces rollback after the article update and revision insert.
	current, e := s.Draft(ctx, f.admin, row.ID)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = f.auth.client.ArticleEvent.Create().SetArticleID(row.ID).SetVersion(current.Version + 1).SetAction("fixture_conflict").SetActorID(f.admin.User.ID).Save(ctx); e != nil {
		t.Fatal(e)
	}
	if _, e = s.Save(ctx, f.admin, row.ID, current.Version, d); e == nil {
		t.Fatal("missing atomic event constraint")
	}
	after, e := s.Draft(ctx, f.admin, row.ID)
	if e != nil || after.Version != current.Version || after.RevisionID != current.RevisionID {
		t.Fatal("failed audit changed draft", e)
	}
}

func TestArticlePublicSearchCorrectionsAndUnpublish(t *testing.T) {
	f := orderDB(t)
	s := articleStore(f)
	ctx := t.Context()
	d := articleDefinition()
	config := f.game.Configuration
	config.Discovery = &catalog.Discovery{Capabilities: catalog.Capabilities(config, false)}
	for i := range config.Discovery.Capabilities {
		if config.Discovery.Capabilities[i].Service == "news" {
			config.Discovery.Capabilities[i].State = "active"
		}
	}
	saveDiscovery(t, f, config)
	row, e := s.Create(ctx, f.admin, f.game.ID, d)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = s.Read(ctx, f.game.Slug, d.Slug); e == nil {
		t.Fatal("draft public")
	}
	row, e = s.Change(ctx, f.admin, row.ID, "publish", news.Change{Version: row.Version, RevisionID: row.RevisionID})
	if e != nil {
		t.Fatal(e)
	}
	public, e := s.Read(ctx, f.game.Slug, d.Slug)
	if e != nil || public.Definition.Title != d.Title || public.Redirect {
		t.Fatal("published reader", e)
	}
	d.Title = "Private revised title"
	d.Slug = "new-guide-slug"
	row, e = s.Save(ctx, f.admin, row.ID, row.Version, d)
	if e != nil {
		t.Fatal(e)
	}
	page, e := s.Browse(ctx, f.game.Slug, news.Filters{Search: "Private revised"})
	if e != nil || len(page.Items) != 0 {
		t.Fatal("draft leaked through search", e)
	}
	page, e = s.Browse(ctx, f.game.Slug, news.Filters{Kind: "guide", Search: "Synthetic"})
	if e != nil || len(page.Items) != 1 || len(page.Items[0].Definition.Blocks) != 0 {
		t.Fatal("public summaries", e)
	}
	row, e = s.Change(ctx, f.admin, row.ID, "publish", news.Change{Version: row.Version, RevisionID: row.RevisionID})
	if e != nil {
		t.Fatal(e)
	}
	redirected, e := s.Read(ctx, f.game.Slug, "synthetic-guide")
	if e != nil || !redirected.Redirect || redirected.Definition.Slug != d.Slug {
		t.Fatal("same-game correction redirect", e)
	}
	_, e = s.Change(ctx, f.admin, row.ID, "unpublish", news.Change{Version: row.Version})
	if e != nil {
		t.Fatal(e)
	}
	for _, slug := range []string{"synthetic-guide", d.Slug} {
		if _, e = s.Read(ctx, f.game.Slug, slug); e == nil {
			t.Fatal("unpublished reader or redirect leaked")
		}
	}
	page, e = s.Browse(ctx, f.game.Slug, news.Filters{})
	if e != nil || len(page.Items) != 0 {
		t.Fatal("unpublished discovery", e)
	}
	if _, e = s.Browse(ctx, f.game.Slug, news.Filters{After: "invalid"}); !errors.Is(e, news.ErrInvalid) {
		t.Fatal("cursor bounds", e)
	}
	if _, e = s.Read(ctx, "another-game", d.Slug); e == nil {
		t.Fatal("cross-game lookup")
	}
}

func TestArticlePromotionAndSitemapOnlyUseCurrentPublication(t *testing.T) {
	f := orderDB(t)
	s := articleStore(f)
	ctx := t.Context()
	d := articleDefinition()
	config := f.game.Configuration
	config.Discovery = &catalog.Discovery{Capabilities: catalog.Capabilities(config, false)}
	for i := range config.Discovery.Capabilities {
		if config.Discovery.Capabilities[i].Service == "news" {
			config.Discovery.Capabilities[i].State = "active"
		}
	}
	saveDiscovery(t, f, config)
	row, e := s.Create(ctx, f.admin, f.game.ID, d)
	if e != nil {
		t.Fatal(e)
	}
	row, e = s.Change(ctx, f.admin, row.ID, "publish", news.Change{Version: row.Version, RevisionID: row.RevisionID})
	if e != nil {
		t.Fatal(e)
	}
	now := time.Unix(f.auth.clock.Load(), 0)
	config = f.game.Configuration
	config.Discovery.Promotions = []catalog.Promotion{{Key: "featured_guide", Title: "Reviewed fixture guide", Enabled: true, Target: "news", ArticleID: row.ID, ArticleSlug: d.Slug, ReleaseID: row.CurrentRevision, StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour)}}
	saveDiscovery(t, f, config)
	projection, e := f.catalog.DiscoveryProjection(ctx, f.game.Slug, now)
	if e != nil || len(projection.Promotions) != 1 {
		t.Fatal("editorial promotion", e)
	}
	p := projection.Promotions[0]
	if p.Currency != "" || p.AmountMinor != "" || p.Remaining != nil || p.Indicative || p.ArticleSlug != d.Slug {
		t.Fatal("fabricated editorial commerce", p)
	}
	sitemap, e := s.Sitemap(ctx, f.game.Slug)
	if e != nil || len(sitemap) != 1 || sitemap[0].Slug != d.Slug {
		t.Fatal("sitemap", e)
	}
	d.Slug = "corrected-public-guide"
	row, e = s.Save(ctx, f.admin, row.ID, row.Version, d)
	if e != nil {
		t.Fatal(e)
	}
	sitemap, e = s.Sitemap(ctx, f.game.Slug)
	if e != nil || sitemap[0].Slug == d.Slug {
		t.Fatal("private slug in sitemap", e)
	}
	row, e = s.Change(ctx, f.admin, row.ID, "publish", news.Change{Version: row.Version, RevisionID: row.RevisionID})
	if e != nil {
		t.Fatal(e)
	}
	projection, e = f.catalog.DiscoveryProjection(ctx, f.game.Slug, now)
	if e != nil || len(projection.Promotions) != 0 {
		t.Fatal("stale featured article persisted", e)
	}
	sitemap, e = s.Sitemap(ctx, f.game.Slug)
	if e != nil || len(sitemap) != 1 || sitemap[0].Slug != d.Slug {
		t.Fatal("correction sitemap", e)
	}
	if _, e = s.Change(ctx, f.admin, row.ID, "unpublish", news.Change{Version: row.Version}); e != nil {
		t.Fatal(e)
	}
	sitemap, e = s.Sitemap(ctx, f.game.Slug)
	if e != nil || len(sitemap) != 0 {
		t.Fatal("unpublished sitemap leak", e)
	}
}
