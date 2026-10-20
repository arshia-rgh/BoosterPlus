package shop

import (
	"net/http"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

func (s *Store) registerSupplierCheckout(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/v1/orders/{id}/shop/action", s.auth.ProtectRate("account", "supplier-action", 10, time.Minute, shopProblem(func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		if s.supplier == nil {
			return ErrConflict
		}
		var input struct{}
		if err := read(r, &input); err != nil {
			return err
		}
		out, err := s.supplier.PendingAction(r.Context(), s.auth, p, r.PathValue("id"))
		if err != nil {
			return err
		}
		return write(w, http.StatusOK, out)
	})))
	mux.HandleFunc("POST /api/v1/orders/{id}/shop/codes", s.auth.ProtectRate("account", "supplier-codes", 10, time.Minute, shopProblem(func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		if s.supplier == nil || !validID(r.PathValue("id")) {
			return ErrInvalid
		}
		var input struct{}
		if err := read(r, &input); err != nil {
			return err
		}
		var keys []suppliers.DeliveredKey
		ctx := r.Context()
		err := s.auth.AuthorizedTransaction(ctx, p, "account", true, func(tx *ent.Tx, current *identity.Principal) error {
			var e error
			keys, e = s.supplier.RevealCodesInTransaction(ctx, tx, current, r.PathValue("id"))
			return e
		})
		if err != nil {
			return err
		}
		return write(w, http.StatusOK, map[string]any{"keys": keys})
	})))
	mux.HandleFunc("POST /api/v1/games/{slug}/shop/{id}/quote", s.auth.ProtectRate("account", "supplier-quote", 20, time.Minute, shopProblem(func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input struct {
			ReleaseID string `json:"release_id"`
			Quantity  string `json:"quantity"`
		}
		r.Body = http.MaxBytesReader(w, r.Body, 4096)
		if err := read(r, &input); err != nil {
			return err
		}
		out, err := s.QuoteSupplier(r.Context(), p, r.PathValue("slug"), r.PathValue("id"), input.ReleaseID, input.Quantity)
		if err != nil {
			return err
		}
		return write(w, http.StatusOK, out)
	})))
	mux.HandleFunc("POST /api/v1/games/{slug}/shop/{id}/supplier-reserve", s.auth.ProtectRate("account", "supplier-reserve", 20, time.Hour, shopProblem(func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input SupplierAcceptance
		r.Body = http.MaxBytesReader(w, r.Body, 16<<10)
		if err := read(r, &input); err != nil {
			return err
		}
		defer clear(input.Recipient)
		out, err := s.ReserveSupplier(r.Context(), p, r.PathValue("slug"), r.PathValue("id"), input)
		if err != nil {
			return err
		}
		return write(w, http.StatusOK, out)
	})))
}
