package sitecontent

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func write(w http.ResponseWriter, v any) error {
	w.Header().Set("Content-Type", "application/json")
	return json.NewEncoder(w).Encode(v)
}
func read(r *http.Request, v any) error {
	if ct := r.Header.Get("Content-Type"); ct != "application/json" && !strings.HasPrefix(ct, "application/json;") {
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
func failure(w http.ResponseWriter, e error) error {
	w.Header().Set("Content-Type", "application/json")
	if errors.Is(e, ErrInvalid) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		return write(w, map[string]string{"code": "content_invalid"})
	}
	if errors.Is(e, ErrConflict) {
		w.WriteHeader(http.StatusConflict)
		return write(w, map[string]string{"code": "content_conflict"})
	}
	return e
}

// Register exposes published read-only content and guarded draft/publication commands.
func (s *Store) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/site/metrics", s.auth.ProtectRate("", "site-metrics", 60, time.Minute, s.metrics))
	mux.HandleFunc("GET /api/v1/site/{kind}/versions/{label}", s.auth.Protect("", func(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
		v, e := s.Version(r.Context(), r.PathValue("kind"), r.PathValue("label"))
		if e != nil {
			return failure(w, e)
		}
		return write(w, v)
	}))

	mux.HandleFunc("GET /api/v1/site/{kind}", s.auth.Protect("", func(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
		v, e := s.Public(r.Context(), r.PathValue("kind"))
		if e != nil {
			return failure(w, e)
		}
		return write(w, v)
	}))
	mux.HandleFunc("GET /api/v1/admin/site/{kind}", s.auth.Protect("admin", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		v, e := s.Draft(r.Context(), p, r.PathValue("kind"))
		if e != nil {
			return failure(w, e)
		}
		return write(w, v)
	}))
	mux.HandleFunc("GET /api/v1/admin/site/{kind}/history", s.auth.Protect("admin", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		v, e := s.History(r.Context(), p, r.PathValue("kind"), r.URL.Query().Get("after"))
		if e != nil {
			return failure(w, e)
		}
		next := ""
		if len(v) == 50 {
			next = v[49].ReleaseID
		}
		return write(w, map[string]any{"releases": v, "next": next})
	}))
	mux.HandleFunc("POST /api/v1/admin/site/{kind}", s.auth.ProtectRate("admin", "content-edit", 60, time.Hour, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input Input
		if e := read(r, &input); e != nil {
			return failure(w, e)
		}
		v, e := s.Save(r.Context(), p, r.PathValue("kind"), input)
		if e != nil {
			return failure(w, e)
		}
		return write(w, v)
	}))
}
