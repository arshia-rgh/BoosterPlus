// Package news implements bounded staff-managed editorial revisions.
package news

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"slices"
	"strings"
	"unicode"
	"unicode/utf8"
)

// ErrInvalid rejects malformed editorial input.
var ErrInvalid = errors.New("article input invalid")

// ErrConflict requires refreshing an outdated editorial state.
var ErrConflict = errors.New("article revision or publication changed")
var slugPattern = regexp.MustCompile(`^[a-z][a-z0-9-]{0,99}$`)
var assetPattern = regexp.MustCompile(`^/catalog-assets/[a-z0-9][a-z0-9_-]{0,79}\.(png|jpg|webp|avif|svg)$`)

// Definition contains public editorial content, never arbitrary markup.
type Definition struct {
	Title       string  `json:"title"`
	Slug        string  `json:"slug"`
	Kind        string  `json:"kind"`
	Summary     string  `json:"summary"`
	Author      string  `json:"author"`
	Source      string  `json:"source"`
	SourceURL   string  `json:"source_url"`
	GameVersion string  `json:"game_version"`
	Asset       string  `json:"asset"`
	AssetAlt    string  `json:"asset_alt"`
	AssetSource string  `json:"asset_source"`
	Reviewed    bool    `json:"reviewed"`
	Blocks      []Block `json:"blocks"`
}

// Block is a typed plain-text document element; HTML and embedded scripts are not supported.
type Block struct {
	Kind    string     `json:"kind"`
	Text    string     `json:"text"`
	Level   int        `json:"level"`
	URL     string     `json:"url"`
	Alt     string     `json:"alt"`
	Source  string     `json:"source"`
	Items   []string   `json:"items"`
	Headers []string   `json:"headers"`
	Rows    [][]string `json:"rows"`
}

// Issue identifies a field without echoing untrusted editor content.
type Issue struct {
	Path    string `json:"path"`
	Message string `json:"message"`
}

// Invalid returns actionable validation findings.
type Invalid struct{ Issues []Issue }

func (e *Invalid) Error() string { return "article validation failed" }
func text(v string, minimum, maximum int) bool {
	return utf8.ValidString(v) && utf8.RuneCountInString(strings.TrimSpace(v)) >= minimum && utf8.RuneCountInString(v) <= maximum && !strings.ContainsFunc(v, func(r rune) bool { return unicode.IsControl(r) && r != '\n' && r != '\t' && r != '\r' })
}
func safeURL(v string) bool {
	u, e := url.Parse(v)
	return e == nil && text(v, 1, 1000) && u.Scheme == "https" && u.Hostname() != "" && u.User == nil && u.Opaque == "" && !strings.ContainsAny(v, "\r\n\t\\")
}

// Validate bounds incomplete drafts and requires explicit accuracy/rights review for publication.
func Validate(d Definition, publish bool) []Issue {
	out := []Issue{}
	raw, encodeErr := json.Marshal(d)
	if encodeErr != nil || len(raw) > 220<<10 {
		return []Issue{{"blocks", "Keep the complete article below 220 KiB."}}
	}
	add := func(p, m string) { out = append(out, Issue{p, m}) }
	minimum := 0
	if publish {
		minimum = 1
	}
	for _, v := range []struct {
		k, v string
		n    int
	}{{"title", d.Title, 160}, {"summary", d.Summary, 600}, {"author", d.Author, 120}, {"source", d.Source, 1000}} {
		if !text(v.v, minimum, v.n) {
			add(v.k, "Supply bounded plain text before publication.")
		}
	}
	if d.Slug != "" && !slugPattern.MatchString(d.Slug) || publish && d.Slug == "" {
		add("slug", "Use lowercase letters, digits and hyphens, starting with a letter.")
	}
	if !slices.Contains([]string{"update", "patch", "guide"}, d.Kind) {
		add("kind", "Choose an update, patch note or guide.")
	}
	if !text(d.GameVersion, 0, 80) {
		add("game_version", "Keep version context within 80 characters.")
	}
	if d.SourceURL != "" && !safeURL(d.SourceURL) {
		add("source_url", "Use a complete HTTPS source link without credentials.")
	}
	if d.Asset != "" && (!assetPattern.MatchString(d.Asset) || !text(d.AssetAlt, minimum, 300) || !text(d.AssetSource, minimum, 1000)) {
		add("asset", "Use a local catalog asset with alt text and attribution.")
	}
	if d.Asset == "" && (d.AssetAlt != "" || d.AssetSource != "") {
		add("asset", "Choose artwork or clear its unused metadata.")
	}
	if publish && !d.Reviewed {
		add("reviewed", "Review accuracy, attribution and media rights before publication.")
	}
	if len(d.Blocks) > 100 || publish && len(d.Blocks) == 0 {
		add("blocks", "Use between 1 and 100 structured blocks for publication.")
	}
	for i, b := range d.Blocks {
		if i >= 100 {
			break
		}
		validateBlock(b, fmt.Sprintf("blocks.%d", i), add)
	}
	return out
}
func validateBlock(b Block, path string, add func(string, string)) {
	if !text(b.Text, 0, 10000) || !text(b.Alt, 0, 300) || !text(b.Source, 0, 1000) || len(b.Items) > 50 || len(b.Headers) > 10 || len(b.Rows) > 100 {
		add(path, "Block exceeds its supported content limits.")
		return
	}
	if b.Kind != "heading" && b.Level != 0 || b.Kind != "link" && b.Kind != "image" && b.URL != "" || b.Kind != "image" && (b.Alt != "" || b.Source != "") || b.Kind != "list" && len(b.Items) > 0 || b.Kind != "table" && (len(b.Headers) > 0 || len(b.Rows) > 0) {
		add(path, "Remove fields that do not belong to this block type.")
	}
	switch b.Kind {
	case "paragraph", "quote", "code":
		if !text(b.Text, 1, 10000) {
			add(path, "Enter block text.")
		}
	case "heading":
		if !text(b.Text, 1, 160) || (b.Level != 2 && b.Level != 3) {
			add(path, "Use a titled section or subsection heading.")
		}
	case "link":
		if !text(b.Text, 1, 300) || !safeURL(b.URL) {
			add(path, "Use descriptive link text and a safe HTTPS URL.")
		}
	case "image":
		if !assetPattern.MatchString(b.URL) || !text(b.Alt, 1, 300) || !text(b.Source, 1, 1000) {
			add(path, "Images need a local asset, alt text and attribution.")
		}
	case "list":
		if len(b.Items) == 0 {
			add(path, "Add list items.")
		}
		for _, v := range b.Items {
			if !text(v, 1, 1000) {
				add(path, "Use nonempty list items up to 1000 characters.")
				break
			}
		}
	case "table":
		if !text(b.Text, 1, 300) || len(b.Headers) == 0 || len(b.Rows) == 0 {
			add(path, "Tables need a caption, column headings and rows.")
		}
		for _, v := range b.Headers {
			if !text(v, 1, 160) {
				add(path, "Use descriptive column headings.")
				break
			}
		}
		for _, row := range b.Rows {
			if len(row) != len(b.Headers) {
				add(path, "Every row must match the column count.")
				break
			}
			for _, v := range row {
				if !text(v, 0, 1000) {
					add(path, "Keep table cells within 1000 characters.")
					break
				}
			}
		}
	default:
		add(path, "Choose a supported structured block.")
	}
}
