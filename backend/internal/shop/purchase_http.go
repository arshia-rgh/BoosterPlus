package shop

import (
	"errors"
	"net/http"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func (s *Store) registerPurchase(mux *http.ServeMux) {
	for _, admin := range []bool{false, true} {
		base, capability := "/api/v1/orders/", "account"
		if admin {
			base, capability = "/api/v1/admin/orders/", "admin"
		}
		mux.HandleFunc("GET "+base+"{id}/shop", s.auth.Protect(capability, shopProblem(func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			out, err := s.Delivery(r.Context(), p, r.PathValue("id"), admin)
			if err != nil {
				return err
			}
			return write(w, http.StatusOK, out)
		})))
		mux.HandleFunc("POST "+base+"{id}/shop/recipient", s.auth.ProtectRate(capability, "shop-recipient", 20, time.Minute, shopProblem(func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			var input struct{}
			if err := read(r, &input); err != nil {
				return err
			}
			out, err := s.RevealRecipient(r.Context(), p, r.PathValue("id"), admin)
			if err != nil {
				return err
			}
			return write(w, http.StatusOK, out)
		})))
	}
	mux.HandleFunc("POST /api/v1/admin/orders/{id}/shop/{action}", s.auth.ProtectRate("admin", "shop-delivery", 40, time.Minute, shopProblem(func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input DeliveryChange
		if err := read(r, &input); err != nil {
			return err
		}
		out, err := s.ChangeDelivery(r.Context(), p, r.PathValue("id"), r.PathValue("action"), input)
		if err != nil {
			return err
		}
		return write(w, http.StatusOK, out)
	})))
	mux.HandleFunc("GET /api/v1/games/{slug}/shop", s.auth.Protect("", shopProblem(func(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
		q := r.URL.Query()
		out, err := s.Browse(r.Context(), BrowseInput{Slug: r.PathValue("slug"), After: q.Get("after"), Search: q.Get("q"), Region: q.Get("region"), Category: q.Get("category")})
		if err != nil {
			return err
		}
		return write(w, http.StatusOK, out)
	})))
	mux.HandleFunc("GET /api/v1/games/{slug}/shop/{id}", s.auth.Protect("", shopProblem(func(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
		out, err := s.Published(r.Context(), r.PathValue("slug"), r.PathValue("id"))
		if err != nil {
			return err
		}
		return write(w, http.StatusOK, out)
	})))
	mux.HandleFunc("POST /api/v1/games/{slug}/shop/{id}/reserve", s.auth.ProtectRate("account", "shop-reserve", 20, time.Hour, shopProblem(func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input ReserveInput
		if err := read(r, &input); err != nil {
			return err
		}
		out, err := s.Reserve(r.Context(), p, r.PathValue("slug"), r.PathValue("id"), input)
		if err != nil {
			return err
		}
		return write(w, http.StatusOK, out)
	})))
}
func shopProblem(next func(http.ResponseWriter, *http.Request, *identity.Principal) error) func(http.ResponseWriter, *http.Request, *identity.Principal) error {
	return func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		w.Header().Set("Cache-Control", "no-store")
		err := next(w, r, p)
		switch {
		case errors.Is(err, ErrInvalid):
			return write(w, http.StatusUnprocessableEntity, map[string]string{"code": "shop_invalid"})
		case errors.Is(err, ErrConflict):
			return write(w, http.StatusConflict, map[string]string{"code": "shop_conflict"})
		default:
			return err
		}
	}
}
