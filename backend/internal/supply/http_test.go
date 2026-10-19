package supply

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestPrivateRequestBoundsAndTypes(t *testing.T) {
	for _, body := range []string{"null", "[]", `{\"version\":1}`, `{"version":1} {}`, `{"version":1,"unexpected":true}`, `{"version":1}` + strings.Repeat(" ", 16<<10), `{"version":"1"}`} {
		r := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/", strings.NewReader(body))
		r.Header.Set("Content-Type", "application/json")
		var input struct {
			Version int `json:"version"`
		}
		if read(r, &input) == nil {
			t.Fatal("invalid private body accepted")
		}
	}
	r := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/", strings.NewReader(`{"version":1}`))
	r.Header.Set("Content-Type", "application/json; charset=utf-8")
	var input struct {
		Version int `json:"version"`
	}
	if read(r, &input) != nil || input.Version != 1 {
		t.Fatal("valid private input rejected")
	}
}
