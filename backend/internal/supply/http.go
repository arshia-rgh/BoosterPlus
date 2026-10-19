package supply

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// Register attaches private supplier management with ordinary admin portal checks.
func (s *Store) Register(mux *http.ServeMux) {
	routes := map[string]func(http.ResponseWriter, *http.Request, *identity.Principal) error{
		"GET /api/v1/admin/shop/suppliers":                       s.connectionsHTTP,
		"GET /api/v1/admin/shop/suppliers/{connection}/library":  s.libraryHTTP,
		"POST /api/v1/admin/shop/suppliers/{connection}/imports": s.importHTTP,
		"POST /api/v1/admin/shop/suppliers/{connection}/markup":  s.markupHTTP,
		"POST /api/v1/admin/shop/suppliers/{connection}/prices":  s.priceHTTP,
		"GET /api/v1/admin/shop/supplier-imports/{id}":           s.importStateHTTP,
		"POST /api/v1/admin/shop/supplier-imports/{id}/cancel":   s.cancelHTTP,
	}
	for route, endpoint := range routes {
		mux.HandleFunc(route, s.auth.Protect("admin", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			err := endpoint(w, r, p)
			switch {
			case errors.Is(err, ErrInvalid):
				return write(w, http.StatusUnprocessableEntity, map[string]string{"code": "supplier_invalid"})
			case errors.Is(err, ErrConflict):
				return write(w, http.StatusConflict, map[string]string{"code": "supplier_conflict"})
			case errors.Is(err, ErrUnavailable):
				return write(w, http.StatusServiceUnavailable, map[string]string{"code": "supplier_unavailable"})
			case ent.IsNotFound(err):
				return write(w, http.StatusNotFound, map[string]string{"code": "supplier_not_found"})
			default:
				return err
			}
		}))
	}
}

func read(r *http.Request, value any) error {
	mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mediaType != "application/json" {
		return ErrInvalid
	}
	raw, err := io.ReadAll(io.LimitReader(r.Body, (16<<10)+1))
	if err != nil || len(raw) > 16<<10 {
		return ErrInvalid
	}
	raw = bytes.TrimSpace(raw)
	if len(raw) == 0 || raw[0] != '{' {
		return ErrInvalid
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if decoder.Decode(value) != nil {
		return ErrInvalid
	}
	var extra any
	if err = decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		return ErrInvalid
	}
	return nil
}
func write(w http.ResponseWriter, status int, value any) error {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(value)
}
func (s *Store) connectionsHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	out, err := s.Connections(r.Context(), p)
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, map[string]any{"items": out})
}
func (s *Store) libraryHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	q := r.URL.Query()
	out, err := s.Library(r.Context(), p, suppliers.Connection(r.PathValue("connection")), Filters{ImportID: q.Get("import"), After: q.Get("after"), Search: q.Get("q"), GameID: q.Get("game"), CategoryID: q.Get("category")})
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, out)
}
func (s *Store) importHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var input struct {
		RequestID string `json:"request_id"`
	}
	if err := read(r, &input); err != nil {
		return err
	}
	out, err := s.RequestImport(r.Context(), p, suppliers.Connection(r.PathValue("connection")), input.RequestID)
	if err != nil {
		return err
	}
	return write(w, http.StatusAccepted, out)
}
func (s *Store) importStateHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	out, err := s.Import(r.Context(), p, r.PathValue("id"))
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, out)
}
func (s *Store) cancelHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var input struct{}
	if err := read(r, &input); err != nil {
		return err
	}
	if err := s.CancelImport(r.Context(), p, r.PathValue("id")); err != nil {
		return err
	}
	return s.importStateHTTP(w, r, p)
}
func (s *Store) markupHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var input struct {
		Version   int  `json:"version"`
		MarkupBPS *int `json:"markup_bps"`
	}
	if err := read(r, &input); err != nil {
		return err
	}
	if input.MarkupBPS == nil {
		return ErrInvalid
	}
	out, err := s.SetMarkup(r.Context(), p, suppliers.Connection(r.PathValue("connection")), input.Version, *input.MarkupBPS)
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, out)
}
func (s *Store) priceHTTP(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var input struct {
		ProductID string     `json:"product_id"`
		OfferID   string     `json:"offer_id"`
		Settings  PriceInput `json:"settings"`
	}
	if err := read(r, &input); err != nil {
		return err
	}
	out, err := s.SetPrice(r.Context(), p, suppliers.Connection(r.PathValue("connection")), input.ProductID, input.OfferID, input.Settings)
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, out)
}
