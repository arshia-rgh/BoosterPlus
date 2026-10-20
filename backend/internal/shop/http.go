package shop

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Register attaches staff authoring and release-backed public purchase routes.
func (s *Store) Register(mux *http.ServeMux) {
	s.registerPurchase(mux)
	routes := map[string]func(http.ResponseWriter, *http.Request, *identity.Principal) error{
		"GET /api/v1/admin/shop/products": s.listHTTP, "POST /api/v1/admin/shop/products": s.createHTTP,
		"POST /api/v1/admin/shop/supplier-listings": s.supplierPrepareHTTP,
		"GET /api/v1/admin/shop/products/{id}":      s.draftHTTP, "POST /api/v1/admin/shop/products/{id}/draft": s.saveHTTP,
		"GET /api/v1/admin/shop/products/{id}/preview": s.previewHTTP, "GET /api/v1/admin/shop/products/{id}/releases": s.releasesHTTP,
		"POST /api/v1/admin/shop/products/{id}/stock": s.stockHTTP, "POST /api/v1/admin/shop/products/{id}/{action}": s.changeHTTP,
	}
	for pattern, endpoint := range routes {
		mux.HandleFunc(pattern, s.auth.Protect("admin", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			err := endpoint(w, r, p)
			var invalid *Invalid
			switch {
			case errors.As(err, &invalid):
				return write(w, http.StatusUnprocessableEntity, map[string]any{"code": "shop_invalid", "issues": invalid.Issues[:min(len(invalid.Issues), 200)]})
			case errors.Is(err, ErrInvalid):
				return write(w, http.StatusUnprocessableEntity, map[string]string{"code": "shop_invalid"})
			case errors.Is(err, ErrConflict):
				return write(w, http.StatusConflict, map[string]string{"code": "shop_conflict"})
			default:
				return err
			}
		}))
	}
}

func (s *Store) supplierPrepareHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var input SupplierPreparation
	if err := read(r, &input); err != nil {
		return err
	}
	out, err := s.PrepareSupplier(r.Context(), p, input)
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, out)
}
func read(r *http.Request, value any) error {
	content := r.Header.Get("Content-Type")
	if content != "application/json" && !strings.HasPrefix(content, "application/json;") {
		return ErrInvalid
	}
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(value); err != nil {
		return ErrInvalid
	}
	var trailing any
	if err := decoder.Decode(&trailing); !errors.Is(err, io.EOF) {
		return ErrInvalid
	}
	return nil
}
func write(w http.ResponseWriter, status int, value any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(value)
}
func (s *Store) listHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	q := r.URL.Query()
	out, err := s.List(r.Context(), p, Filters{After: q.Get("after"), Search: q.Get("q"), GameID: q.Get("game"), State: q.Get("state"), Availability: q.Get("availability")})
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, out)
}
func (s *Store) createHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var input struct {
		GameID     string     `json:"game_id"`
		Definition Definition `json:"definition"`
	}
	if err := read(r, &input); err != nil {
		return err
	}
	out, err := s.Create(r.Context(), p, input.GameID, input.Definition)
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, out)
}
func (s *Store) draftHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	out, err := s.Draft(r.Context(), p, r.PathValue("id"))
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, out)
}
func (s *Store) saveHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var input struct {
		Version    int        `json:"version"`
		Definition Definition `json:"definition"`
	}
	if err := read(r, &input); err != nil {
		return err
	}
	out, err := s.Save(r.Context(), p, r.PathValue("id"), input.Version, input.Definition)
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, out)
}
func (s *Store) previewHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	out, err := s.Preview(r.Context(), p, r.PathValue("id"))
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, out)
}
func (s *Store) releasesHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	after := 0
	if raw := r.URL.Query().Get("after"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil {
			return ErrInvalid
		}
		after = value
	}
	out, err := s.Releases(r.Context(), p, r.PathValue("id"), after)
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, out)
}
func (s *Store) stockHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var input StockChange
	if err := read(r, &input); err != nil {
		return err
	}
	out, err := s.SetStock(r.Context(), p, r.PathValue("id"), input)
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, out)
}
func (s *Store) changeHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var input struct {
		Version int `json:"version"`
	}
	if err := read(r, &input); err != nil {
		return err
	}
	out, err := s.Change(r.Context(), p, r.PathValue("id"), input.Version, r.PathValue("action"))
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, out)
}
