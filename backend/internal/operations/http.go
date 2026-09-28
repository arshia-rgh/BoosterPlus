package operations

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

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
func write(w http.ResponseWriter, v any) error { return json.NewEncoder(w).Encode(v) }
func failure(w http.ResponseWriter, err error) error {
	if errors.Is(err, ErrInvalid) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		return write(w, map[string]string{"code": "operations_invalid"})
	}
	if errors.Is(err, ErrConflict) {
		w.WriteHeader(http.StatusConflict)
		return write(w, map[string]string{"code": "operations_conflict"})
	}
	return err
}

// Register restricts every operational endpoint to live administrator authority.
func (s *Store) Register(mux *http.ServeMux) {
	register := func(pattern string, fn func(http.ResponseWriter, *http.Request, *identity.Principal) error) {
		mux.HandleFunc(pattern, s.auth.ProtectRate("admin", "operations", 300, time.Hour, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			w.Header().Set("Content-Type", "application/json")
			return failure(w, fn(w, r, p))
		}))
	}
	register("GET /api/v1/admin/operations", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		v, e := s.Overview(r.Context(), p)
		if e != nil {
			return e
		}
		return write(w, v)
	})
	register("GET /api/v1/admin/jobs", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		state := r.URL.Query().Get("state")
		if state == "" {
			state = "failed"
		}
		v, e := s.ListJobs(r.Context(), p, state, r.URL.Query().Get("kind"), r.URL.Query().Get("after"))
		if e != nil {
			return e
		}
		return write(w, v)
	})
	register("GET /api/v1/admin/jobs/{id}/attempts", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		v, e := s.Attempts(r.Context(), p, r.PathValue("id"), r.URL.Query().Get("after"))
		if e != nil {
			return e
		}
		return write(w, v)
	})
	register("POST /api/v1/admin/jobs/{id}/retry", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input RetryInput
		if e := read(r, &input); e != nil {
			return e
		}
		v, e := s.Retry(r.Context(), p, r.PathValue("id"), input)
		if e != nil {
			return e
		}
		return write(w, v)
	})
}
