package submissions

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
func write(w http.ResponseWriter, value any) error {
	w.Header().Set("Content-Type", "application/json")
	return json.NewEncoder(w).Encode(value)
}
func failure(w http.ResponseWriter, err error) error {
	var invalid *catalog.Invalid
	if errors.As(err, &invalid) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		return write(w, map[string]any{"code": "submission_invalid", "issues": invalid.Issues})
	}
	if errors.Is(err, ErrInvalid) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		return write(w, map[string]string{"code": "submission_invalid"})
	}
	if errors.Is(err, ErrConflict) {
		w.WriteHeader(http.StatusConflict)
		return write(w, map[string]string{"code": "submission_conflict"})
	}
	return err
}

// Register attaches private seller and administrator routes with shared rate and CSRF guards.
func (s *Store) Register(mux *http.ServeMux) {
	for _, admin := range []bool{false, true} {
		prefix := "/api/v1/submissions"
		if admin {
			prefix = "/api/v1/admin/submissions"
		}
		register := func(pattern string, handler func(http.ResponseWriter, *http.Request, *identity.Principal) error) {
			mux.HandleFunc(pattern, s.auth.ProtectRate(capability(admin), "submissions-"+capability(admin), 300, time.Hour, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				w.Header().Set("Content-Type", "application/json")
				return failure(w, handler(w, r, p))
			}))
		}
		register("GET "+prefix, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			value, err := s.List(r.Context(), p, admin, r.URL.Query().Get("after"), r.URL.Query().Get("state"))
			if err != nil {
				return err
			}
			return write(w, value)
		})
		register("GET "+prefix+"/{id}", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			value, err := s.Get(r.Context(), p, r.PathValue("id"), admin)
			if err != nil {
				return err
			}
			return write(w, value)
		})
		register("GET "+prefix+"/{id}/history", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			after := 0
			if raw := r.URL.Query().Get("after"); raw != "" {
				parsed, err := strconv.Atoi(raw)
				if err != nil {
					return ErrInvalid
				}
				after = parsed
			}
			value, err := s.Events(r.Context(), p, r.PathValue("id"), admin, after)
			if err != nil {
				return err
			}
			return write(w, map[string]any{"events": value})
		})
		register("POST "+prefix+"/{id}/{action}", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			var input Action
			if err := read(r, &input); err != nil {
				return err
			}
			value, err := s.Transition(r.Context(), p, r.PathValue("id"), admin, r.PathValue("action"), input)
			if err != nil {
				return err
			}
			return write(w, value)
		})
		if !admin {
			register("POST "+prefix, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				var input CreateInput
				if err := read(r, &input); err != nil {
					return err
				}
				value, err := s.Create(r.Context(), p, input)
				if err != nil {
					return err
				}
				return write(w, value)
			})
			register("POST "+prefix+"/{id}/edit", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				var input Edit
				if err := read(r, &input); err != nil {
					return err
				}
				value, err := s.Edit(r.Context(), p, r.PathValue("id"), input)
				if err != nil {
					return err
				}
				return write(w, value)
			})
		}
	}
}
