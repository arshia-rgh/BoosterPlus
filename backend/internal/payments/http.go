package payments

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

func read(r *http.Request, target any) error {
	content := r.Header.Get("Content-Type")
	if content != "application/json" && !strings.HasPrefix(content, "application/json;") {
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
	status, code := 0, ""
	switch {
	case errors.Is(err, nowpayments.ErrBelowMinimum):
		status, code = http.StatusUnprocessableEntity, "payment_below_minimum"
	case errors.Is(err, ErrInvalid):
		status, code = http.StatusUnprocessableEntity, "payment_invalid"
	case errors.Is(err, ErrConflict):
		status, code = http.StatusConflict, "payment_conflict"
	case errors.Is(err, ErrUnavailable):
		status, code = http.StatusServiceUnavailable, "payments_unavailable"
	case errors.Is(err, nowpayments.ErrSignature):
		status, code = http.StatusBadRequest, "payment_signature_invalid"
	}
	if status == 0 {
		return err
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return write(w, map[string]string{"code": code})
}

// Register keeps customer operations behind identity/CSRF and provider callbacks behind HMAC.
func (s *Store) Register(mux *http.ServeMux) {
	s.registerCases(mux)
	routes := map[string]struct {
		capability string
		handle     func(http.ResponseWriter, *http.Request, *identity.Principal) error
	}{
		"GET /api/v1/orders/{id}/payments": {"account", s.history(false)}, "GET /api/v1/admin/orders/{id}/payments": {"admin", s.history(true)},
		"GET /api/v1/orders/{id}/payments/options": {"account", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			w.Header().Set("Cache-Control", "no-store")
			result, err := s.PaymentOptions(r.Context(), p, r.PathValue("id"))
			if err != nil {
				return err
			}
			return write(w, result)
		}},
		"POST /api/v1/orders/{id}/checkout": {"account", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			var input StartInput
			if err := read(r, &input); err != nil {
				return err
			}
			result, err := s.Start(r.Context(), p, r.PathValue("id"), input)
			if err != nil {
				return err
			}
			return write(w, result)
		}},
		"GET /api/v1/admin/finance":                {"admin", s.finance},
		"GET /api/v1/admin/finance/reconciliation": {"admin", s.inspectReconciliation},
		"GET /api/v1/admin/finance/policy": {"admin", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			result, err := s.Settings(r.Context(), p)
			if err != nil {
				return err
			}
			return write(w, result)
		}},
		"POST /api/v1/admin/finance/policy": {"admin", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			var input PolicyInput
			if err := read(r, &input); err != nil {
				return err
			}
			result, err := s.SavePolicy(r.Context(), p, input)
			if err != nil {
				return err
			}
			return write(w, result)
		}},
		"POST /api/v1/admin/finance/reconcile": {"admin", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			var input ReconcileInput
			if err := read(r, &input); err != nil {
				return err
			}
			if err := s.RequestReconciliation(r.Context(), p, input); err != nil {
				return err
			}
			return write(w, map[string]bool{"queued": true})
		}},
	}
	for pattern, route := range routes {
		handler := func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			return problem(w, route.handle(w, r, p))
		}
		if strings.HasPrefix(pattern, "GET ") {
			mux.HandleFunc(pattern, s.auth.ProtectRate(route.capability, "payments.read", 1800, time.Hour, handler))
		} else {
			mux.HandleFunc(pattern, s.auth.ProtectRate(route.capability, "payments.write", 60, time.Hour, handler))
		}
	}
	mux.HandleFunc("POST /api/v1/webhooks/payments/nowpayments", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		r.Body = http.MaxBytesReader(w, r.Body, 256<<10)
		body, err := io.ReadAll(r.Body)
		if err == nil && len(r.Header.Values("X-Nowpayments-Sig")) == 1 {
			err = s.Receive(ctx, body, r.Header.Get("X-Nowpayments-Sig"))
		} else {
			err = nowpayments.ErrSignature
		}
		if err != nil {
			if remaining := problem(w, err); remaining != nil {
				w.WriteHeader(http.StatusServiceUnavailable)
			}
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}
func (s *Store) history(admin bool) func(http.ResponseWriter, *http.Request, *identity.Principal) error {
	return func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		result, err := s.History(r.Context(), p, r.PathValue("id"), admin)
		if err != nil {
			return err
		}
		return write(w, result)
	}
}
