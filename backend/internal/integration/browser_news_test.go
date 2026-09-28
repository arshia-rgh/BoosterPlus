//go:build integration && browsertest

package integration

import (
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/news"
)

func seedBrowserNews(t *testing.T, f *authFixture, fixtures map[string]string) {
	t.Helper()
	for _, project := range []string{"desktop", "mobile"} {
		c := catalogConfig()
		c.Name = "Editorial fixture game"
		c.Discovery = &catalog.Discovery{Capabilities: catalog.Capabilities(c, false)}
		for i := range c.Discovery.Capabilities {
			if c.Discovery.Capabilities[i].Service == "news" {
				c.Discovery.Capabilities[i].State = "active"
			}
		}
		g, e := f.client.Game.Create().SetSlug("editorial-" + project + "-" + uuid.NewString()).SetName(c.Name).SetConfiguration(fixtureDocument(t, c)).Save(t.Context())
		if e != nil {
			t.Fatal(e)
		}
		release, e := f.client.CatalogRelease.Create().SetGameID(g.ID).SetVersion(1).SetConfiguration(fixtureDocument(t, c)).SetCreatedBy(fixtures[project+"_newseditor_id"]).Save(t.Context())
		if e != nil {
			t.Fatal(e)
		}
		if _, e = f.client.Game.UpdateOne(g).SetPublished(true).SetCurrentRelease(release.ID).Save(t.Context()); e != nil {
			t.Fatal(e)
		}
		d := articleDefinition()
		d.Asset = "/catalog-assets/game-placeholder.svg"
		d.AssetAlt = "Synthetic editorial artwork"
		d.AssetSource = "Isolated fixture artwork."
		d.Blocks = append(d.Blocks, news.Block{Kind: "heading", Text: "Patch context", Level: 2}, news.Block{Kind: "table", Text: "Synthetic patch comparison", Headers: []string{"Ability", "Before", "After"}, Rows: [][]string{{"Fixture ability", "Example previous text", strings.Repeat("Long but bounded context. ", 8)}}}, news.Block{Kind: "code", Text: "<script>This remains literal, never executed.</script>"}, news.Block{Kind: "list", Items: []string{"Review the fixture notes.", "Keep your own game context."}}, news.Block{Kind: "image", URL: "/catalog-assets/game-placeholder.svg", Alt: "Synthetic article illustration", Source: "Isolated fixture only."})
		id := uuid.NewString()
		r, e := f.client.ArticleRevision.Create().SetArticleID(id).SetVersion(1).SetData(fixtureDocument(t, d)).SetTitle(d.Title).SetSlug(d.Slug).SetKind(d.Kind).SetAuthor(d.Author).Save(t.Context())
		if e != nil {
			t.Fatal(e)
		}
		row, e := f.client.Article.Create().SetID(id).SetGameID(g.ID).SetState("draft").SetDraftRevision(r.ID).SetTitle(d.Title).SetKind(d.Kind).SetAuthor(d.Author).Save(t.Context())
		if e != nil {
			t.Fatal(e)
		}
		if _, e = f.client.ArticleEvent.Create().SetArticleID(row.ID).SetVersion(1).SetAction("created").SetRevisionID(r.ID).SetActorID(fixtures[project+"_newseditor_id"]).Save(t.Context()); e != nil {
			t.Fatal(e)
		}
		fixtures[project+"_news_article"] = id
		fixtures[project+"_news_slug"] = g.Slug
		fixtures[project+"_news_game"] = g.ID
	}
}
