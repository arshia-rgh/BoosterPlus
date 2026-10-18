package resale

import (
	"slices"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

func TestAccountSummaryValidationAndSnapshots(t *testing.T) {
	t.Parallel()
	heroes := 125
	p := Product{HeroCount: &heroes, SellingPoint: "Rare collector skins with a versatile roster.", SkinCollection: &catalog.CosmeticCollection{Groups: []catalog.CosmeticGroup{{Category: "Collector", Count: "2", Names: []string{"Aldous", "Yu Zhong"}}}}}
	for _, issue := range productIssues(p) {
		if slices.Contains([]string{"product.hero_count", "product.selling_point", "product.skin_collection"}, issue.Path) {
			t.Fatal(issue)
		}
	}
	saved, err := document(p)
	if err != nil {
		t.Fatal(err)
	}
	p.HeroCount = nil
	p.SkinCollection.Groups[0].Names[0] = "changed draft"
	decoded, err := decode[Product](saved)
	if err != nil {
		t.Fatal(err)
	}
	if decoded.HeroCount == nil || *decoded.HeroCount != 125 || decoded.SkinCollection.Groups[0].Names[0] != "Aldous" {
		t.Fatal("summary snapshot changed")
	}
	legacy, err := decode[Product](map[string]any{"title": "Historical listing"})
	if err != nil || legacy.HeroCount != nil || legacy.SkinCollection != nil || legacy.SellingPoint != "" {
		t.Fatal("invented legacy facts")
	}
	negative := -1
	decoded.HeroCount = &negative
	decoded.SkinCollection.Groups[0].Count = "3"
	issues := productIssues(decoded)
	for _, path := range []string{"product.hero_count", "product.skin_collection.groups.0.count"} {
		if !slices.ContainsFunc(issues, func(i catalog.Issue) bool { return i.Path == path }) {
			t.Fatal("missing repair path", path, issues)
		}
	}
}
