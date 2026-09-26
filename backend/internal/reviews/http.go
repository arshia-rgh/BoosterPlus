package reviews

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func read(r *http.Request, value any) error {
	if content := r.Header.Get("Content-Type"); content != "application/json" && !strings.HasPrefix(content, "application/json;") {
		return ErrInvalid
	}
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if err := d.Decode(value); err != nil {
		return ErrInvalid
	}
	var extra any
	if err := d.Decode(&extra); !errors.Is(err, io.EOF) {
		return ErrInvalid
	}
	return nil
}
func write(w http.ResponseWriter, value any) error { return json.NewEncoder(w).Encode(value) }
func failure(w http.ResponseWriter, err error) error {
	var invalid *catalog.Invalid
	if errors.As(err, &invalid) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		return write(w, map[string]any{"code": "review_invalid", "issues": invalid.Issues})
	}
	if errors.Is(err, ErrInvalid) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		return write(w, map[string]string{"code": "review_invalid"})
	}
	if errors.Is(err, ErrConflict) {
		w.WriteHeader(http.StatusConflict)
		return write(w, map[string]string{"code": "review_conflict"})
	}
	return err
}

// Register protects private routes and rate-bounds public review browsing with the shared transport.
func (s *Store) Register(mux *http.ServeMux) {
	register := func(pattern, access string, handler func(http.ResponseWriter, *http.Request, *identity.Principal) error) {
		mux.HandleFunc(pattern, s.auth.ProtectRate(access, "reviews-"+access, 600, time.Hour, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			w.Header().Set("Content-Type", "application/json")
			return failure(w, handler(w, r, p))
		}))
	}
	register("GET /api/v1/public/reviews", "", func(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
		w.Header().Set("Cache-Control", "no-store")
		v, e := s.Showcase(r.Context())
		if e != nil {
			return e
		}
		return write(w, v)
	})
	register("GET /api/v1/public/reviews/{slug}", "", func(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
		v, e := s.Public(r.Context(), r.PathValue("slug"), r.URL.Query().Get("service"), r.URL.Query().Get("package"), r.URL.Query().Get("after"))
		if e != nil {
			return e
		}
		return write(w, v)
	})
	register("GET /api/v1/orders/{id}/review", "account", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		v, e := s.ForOrder(r.Context(), p, r.PathValue("id"))
		if e != nil {
			return e
		}
		return write(w, v)
	})
	register("POST /api/v1/orders/{id}/review", "account", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input Input
		if e := read(r, &input); e != nil {
			return e
		}
		v, e := s.Save(r.Context(), p, r.PathValue("id"), input)
		if e != nil {
			return e
		}
		return write(w, v)
	})
	register("POST /api/v1/orders/{id}/review/withdraw", "account", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input struct {
			Version int `json:"version"`
		}
		if e := read(r, &input); e != nil {
			return e
		}
		v, e := s.Withdraw(r.Context(), p, r.PathValue("id"), input.Version)
		if e != nil {
			return e
		}
		return write(w, v)
	})
	for _, admin := range []bool{false, true} {
		prefix := "/api/v1/reviews"
		if admin {
			prefix = "/api/v1/admin/reviews"
		}
		register("GET "+prefix, capability(admin), func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			v, e := s.List(r.Context(), p, admin, r.URL.Query().Get("after"), r.URL.Query().Get("state"))
			if e != nil {
				return e
			}
			return write(w, v)
		})
		register("GET "+prefix+"/{id}", capability(admin), func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			v, e := s.Get(r.Context(), p, r.PathValue("id"), admin)
			if e != nil {
				return e
			}
			return write(w, v)
		})
		register("GET "+prefix+"/{id}/history", capability(admin), func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			after := 0
			if raw := r.URL.Query().Get("after"); raw != "" {
				n, e := strconv.Atoi(raw)
				if e != nil {
					return ErrInvalid
				}
				after = n
			}
			v, e := s.History(r.Context(), p, r.PathValue("id"), admin, after)
			if e != nil {
				return e
			}
			return write(w, map[string]any{"revisions": v})
		})
	}
	register("POST /api/v1/admin/reviews/{id}/{action}", "admin", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input Action
		if e := read(r, &input); e != nil {
			return e
		}
		v, e := s.Moderate(r.Context(), p, r.PathValue("id"), r.PathValue("action"), input)
		if e != nil {
			return e
		}
		return write(w, v)
	})
}
