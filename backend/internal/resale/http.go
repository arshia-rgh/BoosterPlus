package resale

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

func read(r *http.Request, target any) error {
	if content := r.Header.Get("Content-Type"); content != "application/json" && !strings.HasPrefix(content, "application/json;") {
		return ErrInvalid
	}
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
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
func problem(w http.ResponseWriter, err error) error {
	var invalid *catalog.Invalid
	if errors.As(err, &invalid) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		return write(w, map[string]any{"code": "resale_invalid", "issues": invalid.Issues})
	}
	switch {
	case errors.Is(err, ErrInvalid), errors.Is(err, vault.ErrInvalid):
		w.WriteHeader(http.StatusUnprocessableEntity)
		return write(w, map[string]string{"code": "resale_invalid"})
	case errors.Is(err, ErrConflict), errors.Is(err, vault.ErrConflict):
		w.WriteHeader(http.StatusConflict)
		return write(w, map[string]string{"code": "resale_conflict"})
	case errors.Is(err, vault.ErrUnavailable):
		w.WriteHeader(http.StatusServiceUnavailable)
		return write(w, map[string]string{"code": "protected_transfer_unavailable"})
	default:
		return err
	}
}

type endpoint func(http.ResponseWriter, *http.Request, *identity.Principal) error

func inputJSON[T, R any](fn func(context.Context, *identity.Principal, string, T) (R, error)) endpoint {
	return func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input T
		if err := read(r, &input); err != nil {
			return err
		}
		value, err := fn(r.Context(), p, r.PathValue("id"), input)
		if err != nil {
			return err
		}
		return write(w, value)
	}
}
func secretInput(fn func(context.Context, *identity.Principal, string, SecretInput) (SecretView, error)) endpoint {
	return func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input SecretInput
		defer func() { clear(input.Value) }()
		if err := read(r, &input); err != nil {
			return err
		}
		value, err := fn(r.Context(), p, r.PathValue("id"), input)
		if err != nil {
			return err
		}
		return write(w, value)
	}
}
func reveal(fn func(context.Context, *identity.Principal, string) ([]byte, error)) endpoint {
	return func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input struct{}
		if err := read(r, &input); err != nil {
			return err
		}
		value, err := fn(r.Context(), p, r.PathValue("id"))
		defer clear(value)
		if err != nil {
			return err
		}
		return write(w, map[string][]byte{"value": value})
	}
}

// Register exposes distinct seller, staff, public listing and private buyer delivery routes.
func (s *Store) Register(mux *http.ServeMux) {
	register := func(pattern, capability string, fn endpoint) {
		bucket, limit := "resale.read", 1800
		if strings.HasPrefix(pattern, "POST ") {
			bucket, limit = "resale.write", 60
		}
		mux.HandleFunc(pattern, s.auth.ProtectRate(capability, bucket, limit, time.Hour, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			w.Header().Set("Content-Type", "application/json")
			return problem(w, fn(w, r, p))
		}))
	}
	register("GET /api/v1/admin/account-agreement-defaults", "admin", func(w http.ResponseWriter, _ *http.Request, _ *identity.Principal) error {
		return write(w, agreementDefaults)
	})
	register("GET /api/v1/accounts", "", func(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
		q := r.URL.Query()
		rows, next, err := s.BrowseFiltered(r.Context(), BrowseFilters{After: q.Get("after"), Slug: q.Get("slug"), Region: q.Get("region"), Rank: q.Get("rank"), Search: q.Get("search"), Currency: q.Get("currency"), MaxMinor: q.Get("max_minor"), Sort: q.Get("sort")})
		if err != nil {
			return err
		}
		return write(w, map[string]any{"items": rows, "next": next})
	})
	register("GET /api/v1/accounts/games", "", func(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
		games, next, err := s.MarketGames(r.Context(), r.URL.Query().Get("after"))
		if err != nil {
			return err
		}
		return write(w, map[string]any{"games": games, "next": next})
	})
	register("GET /api/v1/accounts/{id}", "", func(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
		value, err := s.Published(r.Context(), r.PathValue("id"))
		if err != nil {
			return err
		}
		return write(w, value)
	})
	register("POST /api/v1/accounts/{id}/reserve", "account", inputJSON[ReserveInput, orders.Detail](s.Reserve))
	for _, admin := range []bool{false, true} {
		prefix, capability := "/api/v1", "account"
		if admin {
			prefix += "/admin"
			capability = "admin"
		}
		register("GET "+prefix+"/submissions/{id}/selling-progress", capability, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			value, err := s.Progress(r.Context(), p, r.PathValue("id"), admin)
			if err != nil {
				return err
			}
			return write(w, value)
		})
		register("GET "+prefix+"/submissions/{id}/offers", capability, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			values, err := s.Offers(r.Context(), p, r.PathValue("id"), admin)
			if err != nil {
				return err
			}
			return write(w, map[string]any{"offers": values})
		})
		register("GET "+prefix+"/seller-offers/{id}/events", capability, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			after := 0
			if raw := r.URL.Query().Get("after"); raw != "" {
				var e error
				after, e = strconv.Atoi(raw)
				if e != nil {
					return ErrInvalid
				}
			}
			events, err := s.OfferHistory(r.Context(), p, r.PathValue("id"), admin, after)
			if err != nil {
				return err
			}
			return write(w, map[string]any{"events": events})
		})
		register("POST "+prefix+"/seller-offers/{id}/{action}", capability, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			var input OfferChange
			if err := read(r, &input); err != nil {
				return err
			}
			value, err := s.ChangeOffer(r.Context(), p, r.PathValue("id"), r.PathValue("action"), admin, input)
			if err != nil {
				return err
			}
			return write(w, value)
		})
		register("GET "+prefix+"/account-orders/{id}/delivery", capability, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			value, err := s.Delivery(r.Context(), p, r.PathValue("id"), admin)
			if err != nil {
				return err
			}
			return write(w, value)
		})
		register("POST "+prefix+"/account-orders/{id}/delivery/{action}", capability, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			var input DeliveryChange
			if err := read(r, &input); err != nil {
				return err
			}
			value, err := s.ChangeDelivery(r.Context(), p, r.PathValue("id"), r.PathValue("action"), admin, input)
			if err != nil {
				return err
			}
			return write(w, value)
		})
	}
	register("POST /api/v1/admin/submissions/{id}/offers", "owner", inputJSON[OfferInput, OfferView](s.ProposeOffer))
	register("GET /api/v1/seller-offers/{id}/secret", "account", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		value, err := s.SellerSecretStatus(r.Context(), p, r.PathValue("id"))
		if err != nil {
			return err
		}
		return write(w, value)
	})
	register("POST /api/v1/seller-offers/{id}/secret", "account", secretInput(s.SubmitSellerSecret))
	register("POST /api/v1/admin/seller-offers/{id}/secret/reveal", "owner", reveal(s.RevealSellerSecret))
	register("POST /api/v1/admin/account-orders/{id}/secret", "admin", secretInput(s.SubmitDeliverySecret))
	register("POST /api/v1/account-orders/{id}/secret/reveal", "account", reveal(s.RevealDelivery))
	register("POST /api/v1/admin/seller-offers/{id}/listing", "admin", inputJSON(func(ctx context.Context, p *identity.Principal, id string, _ struct{}) (ListingView, error) {
		return s.CreateListing(ctx, p, id)
	}))
	register("GET /api/v1/admin/account-listings", "admin", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		rows, next, err := s.Inventory(r.Context(), p, r.URL.Query().Get("after"), r.URL.Query().Get("state"))
		if err != nil {
			return err
		}
		return write(w, map[string]any{"items": rows, "next": next})
	})
	register("GET /api/v1/admin/account-listings/{id}", "admin", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		value, err := s.Listing(r.Context(), p, r.PathValue("id"))
		if err != nil {
			return err
		}
		return write(w, value)
	})
	register("POST /api/v1/admin/account-listings/{id}/{action}", "admin", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input ListingInput
		if err := read(r, &input); err != nil {
			return err
		}
		value, err := s.ChangeListing(r.Context(), p, r.PathValue("id"), r.PathValue("action"), input)
		if err != nil {
			return err
		}
		return write(w, value)
	})
}
