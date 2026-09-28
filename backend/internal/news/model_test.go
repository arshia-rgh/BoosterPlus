package news

import "testing"

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
