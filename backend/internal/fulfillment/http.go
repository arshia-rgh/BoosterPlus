package fulfillment

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/scheduling"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

func read(r *http.Request, value any) error {
	if content := r.Header.Get("Content-Type"); content != "application/json" && !strings.HasPrefix(content, "application/json;") {
		return ErrInvalid
	}
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(value); err != nil {
		return ErrInvalid
	}
	var extra any
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		return ErrInvalid
	}
	return nil
}
func write(w http.ResponseWriter, value any) error {
	w.Header().Set("Content-Type", "application/json")
	return json.NewEncoder(w).Encode(value)
}
func handleError(w http.ResponseWriter, err error) error {
	if errors.Is(err, scheduling.ErrTime) {
		err = &catalog.Invalid{Issues: []catalog.Issue{{Path: "time", Message: "Use a valid IANA time zone and local date/time. A skipped clock hour is unavailable; for a repeated hour choose its first or second occurrence."}}}
	}
	var invalid *catalog.Invalid
	if errors.As(err, &invalid) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		return write(w, map[string]any{"code": "fulfillment_invalid", "issues": invalid.Issues})
	}
	if errors.Is(err, ErrInvalid) || errors.Is(err, vault.ErrInvalid) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		return write(w, map[string]string{"code": "fulfillment_invalid"})
	}
	if errors.Is(err, ErrConflict) || errors.Is(err, vault.ErrConflict) || errors.Is(err, vault.ErrUnavailable) || errors.Is(err, catalog.ErrFulfillmentPolicy) {
		w.WriteHeader(http.StatusConflict)
		return write(w, map[string]string{"code": "fulfillment_conflict"})
	}
	return err
}

// Register attaches separate customer, assigned-booster and administrative routes.
func (s *Store) Register(mux *http.ServeMux) {
	s.registerCalendar(mux)
	for _, audience := range []string{"account", "booster", "admin"} {
		prefix := "/api/v1/fulfillment"
		if audience != "account" {
			prefix = "/api/v1/" + audience + "/fulfillment"
		}
		register := func(pattern string, handler func(http.ResponseWriter, *http.Request, *identity.Principal) error) {
			wrapped := func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				w.Header().Set("Content-Type", "application/json")
				return handleError(w, handler(w, r, p))
			}
			mux.HandleFunc(pattern, s.auth.ProtectRate(audience, "fulfillment-"+audience, 300, time.Hour, wrapped))
		}
		register("GET "+prefix+"/{id}", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			value, err := s.Get(r.Context(), p, r.PathValue("id"), audience)
			if err != nil {
				return err
			}
			return write(w, value)
		})
		if audience == "account" {
			register("POST "+prefix+"/{id}/handoff", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				var input Handoff
				if err := read(r, &input); err != nil {
					return err
				}
				value, err := s.SaveHandoff(r.Context(), p, r.PathValue("id"), input)
				if err != nil {
					return err
				}
				return write(w, value)
			})
			register("GET "+prefix+"/{id}/secret", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				value, err := s.SecretStatus(r.Context(), p, r.PathValue("id"))
				if err != nil {
					return err
				}
				return write(w, value)
			})
			register("POST "+prefix+"/{id}/secret", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				var input SecretInput
				if err := read(r, &input); err != nil {
					clear(input.Value)
					return err
				}
				value, err := s.SubmitSecret(r.Context(), p, r.PathValue("id"), input)
				if err != nil {
					return err
				}
				return write(w, value)
			})
			register("POST "+prefix+"/{id}/secret/revoke", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				var input struct {
					Version int `json:"version"`
				}
				if err := read(r, &input); err != nil {
					return err
				}
				if err := s.RevokeSecret(r.Context(), p, r.PathValue("id"), input.Version); err != nil {
					return err
				}
				w.WriteHeader(http.StatusNoContent)
				return nil
			})
		} else {
			register("GET "+prefix, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				value, err := s.List(r.Context(), p, audience, r.URL.Query().Get("after"))
				if err != nil {
					return err
				}
				return write(w, value)
			})
			register("POST "+prefix+"/{id}/{action}", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				var input Update
				if err := read(r, &input); err != nil {
					return err
				}
				value, err := s.Transition(r.Context(), p, r.PathValue("id"), audience, r.PathValue("action"), input)
				if err != nil {
					return err
				}
				return write(w, value)
			})
			register("POST "+prefix+"/{id}/secret/reveal", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				var input struct{}
				if err := read(r, &input); err != nil {
					return err
				}
				if audience == "booster" {
					if _, err := s.Get(r.Context(), p, r.PathValue("id"), "booster"); err != nil {
						return err
					}
				}
				value, err := s.RevealSecret(r.Context(), p, r.PathValue("id"), audience)
				if err != nil {
					return err
				}
				defer clear(value)
				return write(w, map[string][]byte{"value": value})
			})
		}
		if audience == "admin" {
			register("GET "+prefix+"/staff", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				value, err := s.Directory(r.Context(), p)
				if err != nil {
					return err
				}
				return write(w, map[string]any{"staff": value})
			})
			register("POST "+prefix+"/{id}/assign", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				var input Assignment
				if err := read(r, &input); err != nil {
					return err
				}
				value, err := s.Assign(r.Context(), p, r.PathValue("id"), input)
				if err != nil {
					return err
				}
				return write(w, value)
			})
		}
	}
}
