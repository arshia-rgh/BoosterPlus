package availability

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
		return write(w, map[string]string{"code": "availability_invalid"})
	}
	if errors.Is(err, ErrConflict) {
		w.WriteHeader(http.StatusConflict)
		return write(w, map[string]string{"code": "availability_conflict"})
	}
	return err
}

// Register uses live account authority and the same CSRF/Origin protection for signed links.
func (s *Store) Register(mux *http.ServeMux) {
	register := func(pattern, capability string, fn func(http.ResponseWriter, *http.Request, *identity.Principal) error) {
		mux.HandleFunc(pattern, s.auth.ProtectRate(capability, "availability", 120, time.Hour, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			w.Header().Set("Content-Type", "application/json")
			return failure(w, fn(w, r, p))
		}))
	}
	register("GET /api/v1/availability", "account", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		v, e := s.List(r.Context(), p, r.URL.Query().Get("after"))
		if e != nil {
			return e
		}
		return write(w, v)
	})
	register("POST /api/v1/availability", "account", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input SubscribeInput
		if e := read(r, &input); e != nil {
			return e
		}
		v, e := s.Subscribe(r.Context(), p, input)
		if e != nil {
			return e
		}
		return write(w, v)
	})
	register("POST /api/v1/availability/{id}", "account", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input ChangeInput
		if e := read(r, &input); e != nil {
			return e
		}
		v, e := s.Change(r.Context(), p, r.PathValue("id"), input)
		if e != nil {
			return e
		}
		return write(w, v)
	})
	for _, action := range []string{"inspect", "confirm"} {
		register("POST /api/v1/availability-link/"+action, "", func(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
			var input LinkInput
			if e := read(r, &input); e != nil {
				return e
			}
			v, e := s.Link(r.Context(), input, action == "confirm")
			if e != nil {
				return e
			}
			return write(w, v)
		})
	}
}
