package notifications

import (
	"encoding/json"
	"net/http"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Register protects notice access with the shared session and CSRF gates.
func (s *Store) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/admin/notifications/deliveries", s.auth.Protect("admin", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		result, err := s.Deliveries(r.Context(), p)
		if err != nil {
			return err
		}
		w.Header().Set("Content-Type", "application/json")
		return json.NewEncoder(w).Encode(map[string]any{"deliveries": result})
	}))
	mux.HandleFunc("POST /api/v1/admin/notifications/deliveries/{id}/retry", s.auth.Protect("admin", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		if err := s.Retry(r.Context(), p, r.PathValue("id")); err != nil {
			return err
		}
		w.WriteHeader(http.StatusNoContent)
		return nil
	}))

	mux.HandleFunc("GET /api/v1/me/notifications", s.auth.Protect("self", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		result, err := s.List(r.Context(), p, r.URL.Query().Get("after"))
		if err != nil {
			return err
		}
		w.Header().Set("Content-Type", "application/json")
		return json.NewEncoder(w).Encode(result)
	}))
	mux.HandleFunc("POST /api/v1/me/notifications/{id}/read", s.auth.Protect("self", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		if err := s.Read(r.Context(), p, r.PathValue("id")); err != nil {
			return err
		}
		w.WriteHeader(http.StatusNoContent)
		return nil
	}))
}
