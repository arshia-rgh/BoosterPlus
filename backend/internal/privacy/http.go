package privacy

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
		return write(w, map[string]string{"code": "privacy_invalid"})
	}
	if errors.Is(e, ErrConflict) {
		w.WriteHeader(http.StatusConflict)
		return write(w, map[string]string{"code": "privacy_conflict"})
	}
	return e
}

// Register exposes self-owned exports/requests and owner-only reviewed erasure.
func (s *Store) Register(mux *http.ServeMux) {
	for _, admin := range []bool{false, true} {
		base, capability := "/api/v1/privacy/requests", "account"
		if admin {
			base = "/api/v1/admin/privacy/requests"
			capability = "owner"
		}
		mux.HandleFunc("GET "+base, s.auth.ProtectRate(capability, "privacy-read", 120, time.Hour, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			v, e := s.List(r.Context(), p, admin, r.URL.Query().Get("after"))
			if e != nil {
				return failure(w, e)
			}
			return write(w, v)
		}))
		mux.HandleFunc("POST "+base+"/{id}", s.auth.ProtectRate(capability, "privacy-change", 30, time.Hour, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			var input Change
			if e := read(r, &input); e != nil {
				return failure(w, e)
			}
			v, e := s.Update(r.Context(), p, r.PathValue("id"), admin, input)
			if e != nil {
				return failure(w, e)
			}
			return write(w, v)
		}))
	}
	mux.HandleFunc("POST /api/v1/privacy/requests", s.auth.ProtectRate("account", "privacy-request", 5, time.Hour, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input RequestInput
		if e := read(r, &input); e != nil {
			return failure(w, e)
		}
		v, e := s.Request(r.Context(), p, input)
		if e != nil {
			return failure(w, e)
		}
		return write(w, v)
	}))
	mux.HandleFunc("POST /api/v1/privacy/export", s.auth.ProtectRate("account", "privacy-export", 240, time.Hour, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input ExportInput
		if e := read(r, &input); e != nil {
			return failure(w, e)
		}
		v, e := s.Export(r.Context(), p, input)
		if e != nil {
			return failure(w, e)
		}
		w.Header().Set("Content-Disposition", `attachment; filename="boosterplus-personal-data.json"`)
		w.Header().Set("X-Content-Type-Options", "nosniff")
		return write(w, v)
	}))
}
