package catalog

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/article"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/articlerevision"
)

func articlePromotionTarget(ctx context.Context, c *ent.Client, r Release, p Promotion, v PromotionView) (PromotionView, bool, error) {
	if !Available(r.Configuration, r.Paused, "news") {
		return v, false, nil
	}
	a, e := c.Article.Query().Where(article.IDEQ(p.ArticleID), article.GameIDEQ(r.GameID), article.CurrentRevisionEQ(p.ReleaseID), article.StateIn("published", "scheduled")).Only(ctx)
	if ent.IsNotFound(e) {
		return v, false, nil
	}
	if e != nil {
		return v, false, e
	}
	revision, e := c.ArticleRevision.Query().Where(articlerevision.IDEQ(a.CurrentRevision), articlerevision.ArticleIDEQ(a.ID), articlerevision.SlugEQ(p.ArticleSlug)).Only(ctx)
	if ent.IsNotFound(e) {
		return v, false, nil
	}
	if e != nil {
		return v, false, e
	}
	v.Service = "news"
	v.ArticleID = a.ID
	v.ArticleSlug = revision.Slug
	v.ReleaseID = revision.ID
	v.Indicative = false
	return v, true, nil
}
