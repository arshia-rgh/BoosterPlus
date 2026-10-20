package supply

import (
	"context"
	"errors"
	"io"
	"mime"
	"net/http"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// RegisterCallbacks installs only explicitly configured environments. No
// callback contains authority to create an order or settle customer payment.
func (s *Purchaser) RegisterCallbacks(mux *http.ServeMux) {
	for connection := range s.providers {
		mux.HandleFunc("POST /api/v1/webhooks/suppliers/"+string(connection), statusCallback(func(ctx context.Context, raw []byte, signatures []string) error {
			return s.RecordStatusSignal(ctx, connection, raw, signatures)
		}))
	}
}

func statusCallback(receive func(context.Context, []byte, []string) error) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
		if err != nil || mediaType != "application/json" || r.Header.Get("Content-Encoding") != "" {
			w.WriteHeader(http.StatusUnsupportedMediaType)
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, 256<<10)
		raw, err := io.ReadAll(r.Body)
		defer clear(raw)
		if err != nil {
			w.WriteHeader(http.StatusRequestEntityTooLarge)
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		err = receive(ctx, raw, r.Header.Values("Sign"))
		switch {
		case err == nil:
			w.WriteHeader(http.StatusNoContent)
		case errors.Is(err, suppliers.ErrSignature):
			w.WriteHeader(http.StatusForbidden)
		case errors.Is(err, suppliers.ErrEvidence):
			w.WriteHeader(http.StatusUnprocessableEntity)
		default:
			// Includes unknown attempts and interactive events not yet connected.
			// A successful acknowledgement would otherwise discard their delivery.
			w.WriteHeader(http.StatusServiceUnavailable)
		}
	}
}
