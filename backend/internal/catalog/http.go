package catalog

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"slices"
	"strconv"
	"strings"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Register attaches catalog handlers to the application's authenticated transport.
func (s *Store) Register(mux *http.ServeMux) {
	routes := map[string]struct {
		capability string
		endpoint   func(http.ResponseWriter, *http.Request, *identity.Principal) error
	}{
		"GET /api/v1/catalog/games":                              {"", s.list(false)},
		"GET /api/v1/catalog/games/{slug}":                       {"", s.published},
		"POST /api/v1/catalog/games/{slug}/validate":             {"", s.validate},
		"GET /api/v1/admin/catalog/games":                        {"admin", s.list(true)},
		"POST /api/v1/admin/catalog/games":                       {"admin", s.create},
		"GET /api/v1/admin/catalog/games/{id}":                   {"admin", s.getDraft},
		"POST /api/v1/admin/catalog/games/{id}/validate-preview": {"admin", s.validatePreview},
		"GET /api/v1/admin/catalog/games/{id}/preview":           {"admin", s.preview},
		"GET /api/v1/admin/catalog/games/{id}/history":           {"admin", s.history},
		"POST /api/v1/admin/catalog/games/{id}/{action}":         {"admin", s.mutate},
	}
	for pattern, route := range routes {
		mux.HandleFunc(pattern, s.auth.Protect(route.capability, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			err := route.endpoint(w, r, p)
			var invalid *Invalid
			if errors.As(err, &invalid) {
				return write(w, http.StatusUnprocessableEntity, map[string]any{"code": "catalog_invalid", "issues": invalid.Issues[:min(len(invalid.Issues), 100)]})
			}
			if errors.Is(err, ErrConflict) {
				return write(w, http.StatusConflict, map[string]string{"code": "catalog_conflict"})
			}
			return err
		}))
	}
}

func read(r *http.Request, v any) error {
	if value := r.Header.Get("Content-Type"); value != "application/json" && !strings.HasPrefix(value, "application/json;") {
		return &Invalid{[]Issue{{"request", "Use application/json."}}}
	}
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(v); err != nil {
		return &Invalid{[]Issue{{"request", "Invalid or oversized JSON; unknown properties are not accepted."}}}
	}
	var trailing any
	if err := decoder.Decode(&trailing); !errors.Is(err, io.EOF) {
		return &Invalid{[]Issue{{"request", "Send one JSON document."}}}
	}
	return nil
}
func write(w http.ResponseWriter, status int, v any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(v)
}
func (s *Store) list(admin bool) func(http.ResponseWriter, *http.Request, *identity.Principal) error {
	return func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		result, err := s.List(r.Context(), p, admin, r.URL.Query().Get("after"))
		if err != nil {
			return err
		}
		return write(w, http.StatusOK, result)
	}
}
func (s *Store) getDraft(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	result, err := s.Draft(r.Context(), p, r.PathValue("id"))
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, result)
}
func (s *Store) create(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var input struct {
		Slug          string        `json:"slug"`
		Configuration Configuration `json:"configuration"`
	}
	if err := read(r, &input); err != nil {
		return err
	}
	result, err := s.Create(r.Context(), p, input.Slug, input.Configuration)
	if err != nil {
		return err
	}
	return write(w, http.StatusCreated, result)
}
func (s *Store) mutate(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var input Change
	if err := read(r, &input); err != nil {
		return err
	}
	result, err := s.Mutate(r.Context(), p, r.PathValue("id"), r.PathValue("action"), input)
	if err != nil {
		return err
	}
	if r.PathValue("action") == "delete" {
		w.WriteHeader(http.StatusNoContent)
		return nil
	}
	return write(w, http.StatusOK, result)
}
func (s *Store) preview(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	result, err := s.Draft(r.Context(), p, r.PathValue("id"))
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, map[string]any{"draft": result, "issues": ValidateConfiguration(result.Configuration, true)})
}
func (s *Store) history(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	before := 0
	if raw := r.URL.Query().Get("before"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 1 {
			return &Invalid{[]Issue{{"before", "Use a positive revision cursor."}}}
		}
		before = value
	}
	result, err := s.History(r.Context(), p, r.PathValue("id"), before)
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, map[string]any{"releases": result})
}
func (s *Store) published(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
	result, err := s.Published(r.Context(), r.PathValue("slug"))
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, result)
}
func (s *Store) validate(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
	var input struct {
		ReleaseID string  `json:"release_id"`
		Service   string  `json:"service"`
		Stage     string  `json:"stage"`
		Package   string  `json:"package"`
		Variant   string  `json:"variant"`
		Answers   Answers `json:"answers"`
	}
	if err := read(r, &input); err != nil {
		return err
	}
	release, err := s.Published(r.Context(), r.PathValue("slug"))
	if err != nil {
		return err
	}
	if input.ReleaseID != release.ID || release.Paused {
		return ErrConflict
	}
	// Anonymous catalog validation never collects post-payment identifiers or secrets.
	if input.Stage != "estimate" && input.Stage != "order" {
		return &Invalid{[]Issue{{"stage", "Use estimate or order validation for catalog browsing."}}}
	}
	var variant *Variant
	if input.Package != "" || input.Variant != "" {
		i := slices.IndexFunc(release.Configuration.Packages, func(pack Package) bool { return pack.Key == input.Package && pack.Service == input.Service })
		if i < 0 {
			return &Invalid{[]Issue{{"package", "Choose an available package."}}}
		}
		pack := release.Configuration.Packages[i]
		j := slices.IndexFunc(pack.Variants, func(v Variant) bool { return v.Key == input.Variant })
		if j < 0 {
			return &Invalid{[]Issue{{"variant", "Choose an available variant."}}}
		}
		variant = &pack.Variants[j]
		if variant.Capacity != nil && *variant.Capacity == 0 {
			return &Invalid{[]Issue{{"capacity", "This package is currently unavailable."}}}
		}
	}
	result := ValidateAnswers(release.Configuration, input.Service, input.Stage, input.Answers, variant)
	return write(w, http.StatusOK, result)
}

func (s *Store) validatePreview(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var input struct {
		ReleaseID string  `json:"release_id"`
		Service   string  `json:"service"`
		Stage     string  `json:"stage"`
		Package   string  `json:"package"`
		Variant   string  `json:"variant"`
		Answers   Answers `json:"answers"`
	}
	if err := read(r, &input); err != nil {
		return err
	}
	draft, err := s.Draft(r.Context(), p, r.PathValue("id"))
	if err != nil {
		return err
	}
	if input.ReleaseID != strconv.Itoa(draft.Revision) {
		return ErrConflict
	}
	c := draft.Configuration
	c.Reviewed = true
	if issues := ValidateConfiguration(c, true); len(issues) > 0 {
		return &Invalid{issues}
	}
	return write(w, http.StatusOK, ValidateAnswers(c, input.Service, input.Stage, input.Answers, nil))
}
