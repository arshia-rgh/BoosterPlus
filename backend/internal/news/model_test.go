package news

import (
	"slices"
	"strings"
	"testing"
)

func validDefinition() Definition {
	return Definition{Title: "Fixture guide", Slug: "fixture-guide", Kind: "guide", Summary: "Synthetic guide summary.", Author: "Fixture editor", Source: "Original synthetic text.", Reviewed: true, Blocks: []Block{{Kind: "paragraph", Text: "Synthetic editorial content."}}}
}
func TestDefinitionValidation(t *testing.T) {
	if issues := Validate(validDefinition(), true); len(issues) != 0 {
		t.Fatal(issues)
	}
	for name, mutate := range map[string]func(*Definition){
		"script URL":     func(d *Definition) { d.SourceURL = "javascript:alert(1)" },
		"credential URL": func(d *Definition) { d.SourceURL = "https://user:password@example.com" },
		"remote image":   func(d *Definition) { d.Asset = "https://example.com/image.png" },
		"unsafe slug":    func(d *Definition) { d.Slug = "../admin" },
		"unreviewed":     func(d *Definition) { d.Reviewed = false },
		"raw html block": func(d *Definition) { d.Blocks = []Block{{Kind: "html", Text: "<script>bad()</script>"}} },
		"unsafe link":    func(d *Definition) { d.Blocks = []Block{{Kind: "link", Text: "Open", URL: "data:text/html,unsafe"}} },
		"image attribution": func(d *Definition) {
			d.Blocks = []Block{{Kind: "image", URL: "/catalog-assets/test.webp", Alt: "Fixture"}}
		},
		"invalid heading": func(d *Definition) { d.Blocks = []Block{{Kind: "heading", Text: "Fixture", Level: 1}} },
		"uneven table": func(d *Definition) {
			d.Blocks = []Block{{Kind: "table", Text: "Caption", Headers: []string{"Column"}, Rows: [][]string{{"one", "two"}}}}
		},
		"hidden field": func(d *Definition) { d.Blocks = []Block{{Kind: "paragraph", Text: "Text", URL: "https://example.com"}} },
	} {
		t.Run(name, func(t *testing.T) {
			d := validDefinition()
			mutate(&d)
			if len(Validate(d, true)) == 0 {
				t.Fatal("unsafe publication accepted")
			}
		})
	}
	d := validDefinition()
	d.Reviewed = false
	d.Title = ""
	if len(Validate(d, false)) != 0 {
		t.Fatal("incomplete safe draft rejected")
	}
}

func TestImageRowsValidationAndPreciseRepairPaths(t *testing.T) {
	t.Parallel()
	image := InlineImage{URL: "/catalog-assets/test.webp", Alt: "Rank example", Source: "Original synthetic image", Caption: "After the match"}
	definition := func() Definition {
		d := validDefinition()
		d.Blocks = append(d.Blocks, Block{Kind: "gallery", Images: []InlineImage{image, image, image, image}}, Block{Kind: "paragraph", Text: "Next section"})
		return d
	}
	if issues := Validate(definition(), true); len(issues) != 0 {
		t.Fatal(issues)
	}
	for _, tc := range []struct {
		name, path string
		mutate     func(*Definition)
	}{
		{"fifth image", "blocks.1", func(d *Definition) { d.Blocks[1].Images = append(d.Blocks[1].Images, image) }},
		{"empty row", "blocks.1.images", func(d *Definition) { d.Blocks[1].Images = nil }},
		{"remote image", "blocks.1.images.2.url", func(d *Definition) { d.Blocks[1].Images[2].URL = "https://untrusted.example/remote.jpg" }},
		{"description", "blocks.1.images.2.alt", func(d *Definition) { d.Blocks[1].Images[2].Alt = "" }},
		{"rights", "blocks.1.images.2.source", func(d *Definition) { d.Blocks[1].Images[2].Source = "" }},
		{"caption bounds", "blocks.1.images.2.caption", func(d *Definition) { d.Blocks[1].Images[2].Caption = strings.Repeat("x", 1001) }},
		{"wrong kind", "blocks.1.images", func(d *Definition) { d.Blocks[1].Kind = "paragraph"; d.Blocks[1].Text = "Text" }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			d := definition()
			tc.mutate(&d)
			if issues := Validate(d, true); !slices.ContainsFunc(issues, func(i Issue) bool { return i.Path == tc.path }) {
				t.Fatal(issues)
			}
		})
	}
	legacy := validDefinition()
	legacy.Blocks = append(legacy.Blocks, Block{Kind: "image", URL: image.URL, Alt: image.Alt, Source: image.Source})
	if issues := Validate(legacy, true); len(issues) != 0 {
		t.Fatal("legacy image changed", issues)
	}
}
