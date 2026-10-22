package wanted

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func TestValidatePlainTextBounds(t *testing.T) {
	cases := []struct {
		name   string
		in     Input
		issues []string
	}{
		{"valid", Input{Title: "Mythical Glory account", Description: "Europe.\nTwo Collector skins."}, nil},
		{"empty description", Input{Title: "Any Legend account"}, nil},
		{"markup stays text", Input{Title: "<b>Legend</b>", Description: "<script>alert(1)</script>"}, nil},
		{"blank title", Input{Title: "   "}, []string{"title"}},
		{"multiline title", Input{Title: "Legend\naccount"}, []string{"title"}},
		{"long title", Input{Title: strings.Repeat("é", 81)}, []string{"title"}},
		{"title at limit", Input{Title: strings.Repeat("é", 80), Description: strings.Repeat("ü", 300)}, nil},
		{"four line breaks", Input{Title: "Legend", Description: "a\nb\nc\nd\ne"}, nil},
		{"five line breaks", Input{Title: "Legend", Description: "a\nb\nc\nd\ne\nf"}, []string{"description"}},
		{"long description", Input{Title: "Legend", Description: strings.Repeat("a", 301)}, []string{"description"}},
		{"control character", Input{Title: "Legend\x00", Description: "tab\tkept out"}, []string{"title", "description"}},
		{"invalid utf8", Input{Title: "Legend", Description: string([]byte{0xff})}, []string{"description"}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := []string{}
			for _, issue := range Validate(c.in) {
				got = append(got, issue.Path)
			}
			if fmt.Sprint(got) != fmt.Sprint(append([]string{}, c.issues...)) {
				t.Fatalf("issues = %v, want %v", got, c.issues)
			}
		})
	}
}

func TestNormalizeTrimsAndUnifiesLineEndings(t *testing.T) {
	got := normalize(Input{Title: "  Legend  ", Description: "\r\n first\r\nsecond \r\n", Visible: true})
	if got.Title != "Legend" || got.Description != "first\nsecond" || !got.Visible {
		t.Fatalf("normalize = %#v", got)
	}
}

func TestRequestHashBindsGameAndContent(t *testing.T) {
	base := requestHash("game-a", Input{Title: "Legend", Description: "x", Visible: true})
	for _, other := range []string{
		requestHash("game-b", Input{Title: "Legend", Description: "x", Visible: true}),
		requestHash("game-a", Input{Title: "Legend", Description: "x", Visible: false}),
		requestHash("game-a", Input{Title: "Legend\x00x", Description: ""}),
		requestHash("game-a", Input{Title: "Legendx", Description: "", Visible: true}),
	} {
		if other == base {
			t.Fatal("request hash ignores a changed field")
		}
	}
	if requestHash("game-a", Input{Title: "Legend", Description: "x", Visible: true}) != base || len(base) != 64 {
		t.Fatal("request hash must be deterministic SHA-256 hex")
	}
}

func TestShownCountExcludesHiddenAndEditedEntry(t *testing.T) {
	rows := []*ent.WantedAccount{{ID: "a", Visible: true}, {ID: "b"}, {ID: "c", Visible: true}}
	if shown(rows, "") != 2 || shown(rows, "a") != 1 || shown(nil, "") != 0 {
		t.Fatal("shown count")
	}
	if issue := shownLimit().Issues[0]; issue.Path != "visible" || !strings.Contains(issue.Message, "Up to 6") {
		t.Fatal("shown limit issue", issue)
	}
}

func TestIdentifierAndSlugValidation(t *testing.T) {
	if !validID("00000000-0000-4000-8000-000000004801") || validID("00000000-0000-4000-8000-00000000480") || validID("00000000-0000-4000-8000-000000004801 ") {
		t.Fatal("identifier validation")
	}
	if validVersion(0) || !validVersion(1) || validVersion(2147483645) {
		t.Fatal("version validation")
	}
	for slug, ok := range map[string]bool{"mobile-legends": true, "wow2": true, "": false, "2wow": false, "Mobile": false, "a/b": false, strings.Repeat("a", 81): false} {
		if slugPattern(slug) != ok {
			t.Fatalf("slug %q", slug)
		}
	}
}

func TestHandlerMapsErrorsWithoutLeakingDetails(t *testing.T) {
	cases := []struct {
		err    error
		public bool
		status int
		code   string
	}{
		{ErrUnavailable, true, http.StatusNotFound, "wanted_accounts_unavailable"},
		{&ent.NotFoundError{}, true, http.StatusNotFound, "wanted_accounts_unavailable"},
		{&ent.NotFoundError{}, false, http.StatusNotFound, "wanted_account_not_found"},
		{&catalog.Invalid{Issues: []catalog.Issue{{Path: "title", Message: "Enter a title."}}}, false, http.StatusUnprocessableEntity, `"path":"title"`},
		{ErrInvalid, false, http.StatusUnprocessableEntity, "wanted_account_invalid"},
		{fmt.Errorf("wrapped: %w", ErrConflict), false, http.StatusConflict, "wanted_account_conflict"},
	}
	for _, c := range cases {
		w := httptest.NewRecorder()
		err := handle(func(http.ResponseWriter, *http.Request, *identity.Principal) error { return c.err }, c.public)(w, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/", nil), nil)
		if err != nil || w.Code != c.status || !strings.Contains(w.Body.String(), c.code) || w.Header().Get("Cache-Control") != "no-store" {
			t.Fatalf("%v: %d %s %v", c.err, w.Code, w.Body.String(), err)
		}
		if robots := w.Header().Get("X-Robots-Tag"); (robots == "") != c.public {
			t.Fatal("staff responses must not be indexed")
		}
	}
	unexpected := errors.New("database offline")
	if err := handle(func(http.ResponseWriter, *http.Request, *identity.Principal) error { return unexpected }, true)(httptest.NewRecorder(), httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/", nil), nil); !errors.Is(err, unexpected) {
		t.Fatal("unexpected errors must reach the shared safe error handler")
	}
}

func TestReadRejectsUnknownTrailingAndNonJSON(t *testing.T) {
	for _, c := range []struct {
		content, body string
		ok            bool
	}{
		{"application/json", `{"version":2}`, true},
		{"application/json; charset=utf-8", `{"version":2}`, true},
		{"text/plain", `{"version":2}`, false},
		{"application/json", `{"version":2,"extra":1}`, false},
		{"application/json", `{"version":2}{"version":3}`, false},
		{"application/json", `{"version":"2"}`, false},
	} {
		r := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/", strings.NewReader(c.body))
		r.Header.Set("Content-Type", c.content)
		var in VersionInput
		if err := read(r, &in); (err == nil) != c.ok {
			t.Fatalf("%s %s: %v", c.content, c.body, err)
		}
	}
}
