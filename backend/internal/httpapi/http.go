// Package httpapi provides bounded HTTP transport and operational endpoints.
package httpapi

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"
)

// Ready checks critical dependencies without changing application state.
type Ready func(context.Context) error

// New builds the API. Business routes are added in their implementation phases.
func New(ready Ready, logger *slog.Logger, production bool, register ...func(*http.ServeMux)) http.Handler {
	mux := http.NewServeMux()
	for _, routes := range register {
		routes(mux)
	}
	mux.HandleFunc("GET /health/live", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(r.Context(), logger, w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /health/ready", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := ready(ctx); err != nil {
			writeJSON(ctx, logger, w, http.StatusServiceUnavailable, map[string]string{"status": "not_ready"})
			return
		}
		writeJSON(ctx, logger, w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /api/v1/status", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(r.Context(), logger, w, http.StatusOK, map[string]string{"service": "booster-plus", "release": "0.1.0", "catalog": "prelaunch"})
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/health/live", "/health/ready", "/api/v1/status":
			w.Header().Set("Allow", "GET, HEAD")
			problem(r.Context(), logger, w, http.StatusMethodNotAllowed, "Method not allowed")
		default:
			problem(r.Context(), logger, w, http.StatusNotFound, "Not found")
		}
	})
	return security(mux, logger, production)
}

type response struct {
	http.ResponseWriter
	status int
}

func (w *response) WriteHeader(status int) {
	if w.status == 0 {
		w.status = status
		w.ResponseWriter.WriteHeader(status)
	}
}
func (w *response) Write(data []byte) (int, error) {
	if w.status == 0 {
		w.WriteHeader(http.StatusOK)
	}
	return w.ResponseWriter.Write(data)
}
func (w *response) Unwrap() http.ResponseWriter { return w.ResponseWriter }

func security(next http.Handler, logger *slog.Logger, production bool) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		started := time.Now()
		requestID := rand.Text()
		w.Header().Set("X-Request-ID", requestID)
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
		if production {
			w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		wrapped := &response{ResponseWriter: w}
		defer func() {
			if recover() != nil {
				logger.ErrorContext(ctx, "request panic", "request_id", requestID)
				if wrapped.status == 0 {
					problem(ctx, logger, wrapped, http.StatusInternalServerError, "Internal server error")
				}
			}
			logger.InfoContext(ctx, "request completed", "request_id", requestID, "method", r.Method, "status", wrapped.status, "duration_ms", time.Since(started).Milliseconds())
		}()
		r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
		next.ServeHTTP(wrapped, r)
	})
}

func writeJSON(ctx context.Context, logger *slog.Logger, w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		logger.ErrorContext(ctx, "response write failed")
	}
}

func problem(ctx context.Context, logger *slog.Logger, w http.ResponseWriter, status int, title string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(map[string]any{"type": "about:blank", "title": title, "status": status}); err != nil {
		logger.ErrorContext(ctx, "problem response write failed")
	}
}
