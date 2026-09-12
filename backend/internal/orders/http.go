package orders

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

func read(r *http.Request, target any) error {
	if value := r.Header.Get("Content-Type"); value != "application/json" && !strings.HasPrefix(value, "application/json;") {
		return invalid("request", "Use application/json.")
	}
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return invalid("request", "Invalid or oversized request; unknown properties are not accepted.")
	}
	var extra any
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		return invalid("request", "Send one JSON document.")
	}
	return nil
}
func write(w http.ResponseWriter, value any) error {
	w.Header().Set("Content-Type", "application/json")
	return json.NewEncoder(w).Encode(value)
}
func cursor(r *http.Request, key string) (int, error) {
	raw := r.URL.Query().Get(key)
	if raw == "" {
		return 0, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 0 {
		return 0, ErrConflict
	}
	return value, nil
}

// Register attaches private order/customer/admin routes with shared security gates.
func (s *Store) Register(mux *http.ServeMux) {
	routes := map[string]struct {
		capability string
		handler    func(http.ResponseWriter, *http.Request, *identity.Principal) error
	}{
		"GET /api/v1/orders": {"account", s.list(false)}, "POST /api/v1/orders": {"account", s.create}, "GET /api/v1/orders/{id}": {"account", s.detail(false)},
		"GET /api/v1/orders/{id}/events": {"account", s.events(false)}, "GET /api/v1/orders/{id}/quotes": {"account", s.quotes(false)}, "POST /api/v1/orders/{id}/revise": {"account", s.revise}, "POST /api/v1/orders/{id}/validate": {"account", s.validateRevision}, "GET /api/v1/orders/{id}/reorder": {"account", s.reorder}, "POST /api/v1/orders/{id}/{action}": {"account", s.transition(false)},
		"GET /api/v1/admin/orders": {"admin", s.list(true)}, "GET /api/v1/admin/orders/{id}": {"admin", s.detail(true)}, "GET /api/v1/admin/orders/{id}/events": {"admin", s.events(true)}, "GET /api/v1/admin/orders/{id}/quotes": {"admin", s.quotes(true)}, "POST /api/v1/admin/orders/{id}/quote": {"admin", s.quote}, "POST /api/v1/admin/orders/{id}/{action}": {"admin", s.transition(true)},
		"GET /api/v1/me/favorites": {"account", s.favorites}, "POST /api/v1/me/favorites": {"account", s.saveFavorite}, "POST /api/v1/me/favorites/{id}/remove": {"account", s.removeFavorite},
	}
	for pattern, route := range routes {
		handler := func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			err := route.handler(w, r, p)
			var invalidOrder *Invalid
			var invalidCatalog *catalog.Invalid
			var issues []catalog.Issue
			if errors.As(err, &invalidOrder) {
				issues = invalidOrder.Issues
			}
			if errors.As(err, &invalidCatalog) {
				issues = invalidCatalog.Issues
			}
			if len(issues) > 0 {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnprocessableEntity)
				return write(w, map[string]any{"code": "order_invalid", "issues": issues[:min(len(issues), 100)]})
			}
			if errors.Is(err, ErrConflict) || errors.Is(err, catalog.ErrConflict) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusConflict)
				return write(w, map[string]string{"code": "order_conflict"})
			}
			return err
		}
		if pattern == "POST /api/v1/orders" {
			mux.HandleFunc(pattern, s.auth.ProtectRate(route.capability, "order-create", 20, time.Hour, handler))
		} else {
			mux.HandleFunc(pattern, s.auth.Protect(route.capability, handler))
		}
	}
}
func (s *Store) list(admin bool) func(http.ResponseWriter, *http.Request, *identity.Principal) error {
	return func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		result, err := s.List(r.Context(), p, admin, r.URL.Query().Get("after"), r.URL.Query().Get("state"), r.URL.Query().Get("search"), Filters{Game: r.URL.Query().Get("game"), Kind: r.URL.Query().Get("kind"), Customer: r.URL.Query().Get("customer"), Assigned: r.URL.Query().Get("assigned"), From: r.URL.Query().Get("from"), To: r.URL.Query().Get("to")})
		if err != nil {
			return err
		}
		return write(w, result)
	}
}
func (s *Store) detail(admin bool) func(http.ResponseWriter, *http.Request, *identity.Principal) error {
	return func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		result, err := s.Get(r.Context(), p, r.PathValue("id"), admin)
		if err != nil {
			return err
		}
		return write(w, result)
	}
}
func (s *Store) create(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var input CreateInput
	if err := read(r, &input); err != nil {
		return err
	}
	result, err := s.Create(r.Context(), p, input)
	if err != nil {
		return err
	}
	return write(w, result)
}
func (s *Store) quote(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var input QuoteInput
	if err := read(r, &input); err != nil {
		return err
	}
	result, err := s.IssueQuote(r.Context(), p, r.PathValue("id"), input)
	if err != nil {
		return err
	}
	return write(w, result)
}
func (s *Store) transition(admin bool) func(http.ResponseWriter, *http.Request, *identity.Principal) error {
	return func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input Action
		if err := read(r, &input); err != nil {
			return err
		}
		result, err := s.Transition(r.Context(), p, r.PathValue("id"), r.PathValue("action"), admin, input)
		if err != nil {
			return err
		}
		return write(w, result)
	}
}
func (s *Store) revise(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var input Revision
	if err := read(r, &input); err != nil {
		return err
	}
	result, err := s.Revise(r.Context(), p, r.PathValue("id"), input)
	if err != nil {
		return err
	}
	return write(w, result)
}
func (s *Store) events(admin bool) func(http.ResponseWriter, *http.Request, *identity.Principal) error {
	return func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		after, err := cursor(r, "after")
		if err != nil {
			return err
		}
		result, err := s.Events(r.Context(), p, r.PathValue("id"), admin, after)
		if err != nil {
			return err
		}
		return write(w, map[string]any{"events": result})
	}
}
func (s *Store) quotes(admin bool) func(http.ResponseWriter, *http.Request, *identity.Principal) error {
	return func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		before, err := cursor(r, "before")
		if err != nil {
			return err
		}
		result, err := s.Quotes(r.Context(), p, r.PathValue("id"), admin, before)
		if err != nil {
			return err
		}
		return write(w, map[string]any{"quotes": result})
	}
}
func (s *Store) reorder(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	result, err := s.Reorder(r.Context(), p, r.PathValue("id"))
	if err != nil {
		return err
	}
	return write(w, result)
}
func (s *Store) favorites(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	result, err := s.Favorites(r.Context(), p, r.URL.Query().Get("after"))
	if err != nil {
		return err
	}
	return write(w, result)
}
func (s *Store) saveFavorite(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var input FavoriteInput
	if err := read(r, &input); err != nil {
		return err
	}
	result, err := s.SaveFavorite(r.Context(), p, input)
	if err != nil {
		return err
	}
	return write(w, result)
}
func (s *Store) removeFavorite(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	if err := s.RemoveFavorite(r.Context(), p, r.PathValue("id")); err != nil {
		return err
	}
	w.WriteHeader(http.StatusNoContent)
	return nil
}

func (s *Store) validateRevision(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var input struct {
		ReleaseID string          `json:"release_id"`
		Service   string          `json:"service"`
		Stage     string          `json:"stage"`
		Package   string          `json:"package"`
		Variant   string          `json:"variant"`
		Answers   catalog.Answers `json:"answers"`
	}
	if err := read(r, &input); err != nil {
		return err
	}
	detail, err := s.Get(r.Context(), p, r.PathValue("id"), false)
	if err != nil {
		return err
	}
	if detail.Order.Kind != "custom" || detail.Contract != nil || input.ReleaseID != detail.Offer.ID || input.Service != detail.Order.Service || input.Stage != "order" || input.Package != "" || input.Variant != "" {
		return ErrConflict
	}
	return write(w, catalog.ValidateAnswers(detail.Offer.Configuration, input.Service, "order", input.Answers, nil))
}
