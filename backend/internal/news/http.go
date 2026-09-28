package news

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Register attaches staff editorial endpoints; public access remains capability gated.
func (s *Store) Register(mux *http.ServeMux) {
	staff := map[string]func(http.ResponseWriter, *http.Request, *identity.Principal) error{
		"GET /api/v1/admin/news": s.listHTTP, "POST /api/v1/admin/news": s.createHTTP,
		"GET /api/v1/admin/news/{id}": s.draftHTTP, "POST /api/v1/admin/news/{id}/draft": s.saveHTTP,
		"GET /api/v1/admin/news/{id}/history": s.historyHTTP, "GET /api/v1/admin/news/{id}/preview": s.previewHTTP,
		"POST /api/v1/admin/news/{id}/{action}": s.changeHTTP,
	}
	for pattern, next := range staff {
		mux.HandleFunc(pattern, s.auth.Protect("admin", s.handle(next, false)))
	}
	mux.HandleFunc("GET /api/v1/games/{slug}/news-sitemap", s.auth.Protect("", s.handle(s.sitemapHTTP, true)))
	mux.HandleFunc("GET /api/v1/games/{slug}/news", s.auth.Protect("", s.handle(s.browseHTTP, true)))
	mux.HandleFunc("GET /api/v1/games/{slug}/news/{article}", s.auth.Protect("", s.handle(s.readHTTP, true)))
}
func (s *Store) handle(next func(http.ResponseWriter, *http.Request, *identity.Principal) error, public bool) func(http.ResponseWriter, *http.Request, *identity.Principal) error {
	return func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		w.Header().Set("Cache-Control", "no-store")
		if !public {
			w.Header().Set("X-Robots-Tag", "noindex, nofollow")
		}
		err := next(w, r, p)
		var invalid *Invalid
		if public && IsUnavailable(err) {
			return write(w, http.StatusNotFound, map[string]string{"code": "article_unavailable"})
		}
		switch {
		case errors.As(err, &invalid):
			return write(w, http.StatusUnprocessableEntity, map[string]any{"code": "article_invalid", "issues": invalid.Issues[:min(len(invalid.Issues), 200)]})
		case errors.Is(err, ErrInvalid):
			return write(w, http.StatusUnprocessableEntity, map[string]string{"code": "article_invalid"})
		case errors.Is(err, ErrConflict):
			return write(w, http.StatusConflict, map[string]string{"code": "article_conflict"})
		default:
			return err
		}
	}
}
func read(r *http.Request, v any) error {
	if c := r.Header.Get("Content-Type"); c != "application/json" && !strings.HasPrefix(c, "application/json;") {
		return ErrInvalid
	}
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if e := d.Decode(v); e != nil {
		return ErrInvalid
	}
	var extra any
	if e := d.Decode(&extra); !errors.Is(e, io.EOF) {
		return ErrInvalid
	}
	return nil
}
func write(w http.ResponseWriter, status int, v any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(v)
}
func (s *Store) listHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	q := r.URL.Query()
	v, e := s.List(r.Context(), p, Filters{After: q.Get("after"), Search: q.Get("q"), GameID: q.Get("game"), State: q.Get("state"), Kind: q.Get("kind"), Author: q.Get("author")})
	if e != nil {
		return e
	}
	return write(w, 200, v)
}
func (s *Store) createHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var v struct {
		GameID     string     `json:"game_id"`
		Definition Definition `json:"definition"`
	}
	if e := read(r, &v); e != nil {
		return e
	}
	out, e := s.Create(r.Context(), p, v.GameID, v.Definition)
	if e != nil {
		return e
	}
	return write(w, 200, out)
}
func (s *Store) draftHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	out, e := s.Draft(r.Context(), p, r.PathValue("id"))
	if e != nil {
		return e
	}
	return write(w, 200, out)
}
func (s *Store) saveHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var v struct {
		Version    int        `json:"version"`
		Definition Definition `json:"definition"`
	}
	if e := read(r, &v); e != nil {
		return e
	}
	out, e := s.Save(r.Context(), p, r.PathValue("id"), v.Version, v.Definition)
	if e != nil {
		return e
	}
	return write(w, 200, out)
}
func (s *Store) changeHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var v Change
	if e := read(r, &v); e != nil {
		return e
	}
	out, e := s.Change(r.Context(), p, r.PathValue("id"), r.PathValue("action"), v)
	if e != nil {
		return e
	}
	return write(w, 200, out)
}
func (s *Store) historyHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	before := 0
	if v := r.URL.Query().Get("before"); v != "" {
		var e error
		before, e = strconv.Atoi(v)
		if e != nil {
			return ErrInvalid
		}
	}
	out, e := s.History(r.Context(), p, r.PathValue("id"), before)
	if e != nil {
		return e
	}
	return write(w, 200, out)
}
func (s *Store) previewHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	out, e := s.Preview(r.Context(), p, r.PathValue("id"), r.URL.Query().Get("revision"))
	if e != nil {
		return e
	}
	return write(w, 200, map[string]any{"definition": out, "issues": Validate(out, true)})
}
func (s *Store) browseHTTP(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
	q := r.URL.Query()
	out, e := s.Browse(r.Context(), r.PathValue("slug"), Filters{After: q.Get("after"), Search: q.Get("q"), Kind: q.Get("kind")})
	if e != nil {
		return e
	}
	return write(w, 200, out)
}
func (s *Store) readHTTP(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
	out, e := s.Read(r.Context(), r.PathValue("slug"), r.PathValue("article"))
	if e != nil {
		return e
	}
	return write(w, 200, out)
}

func (s *Store) sitemapHTTP(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
	out, e := s.Sitemap(r.Context(), r.PathValue("slug"))
	if e != nil {
		return e
	}
	return write(w, 200, map[string]any{"items": out})
}
