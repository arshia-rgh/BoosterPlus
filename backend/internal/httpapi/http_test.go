package httpapi

import (
	"bytes"
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestOperationalRoutesAndPrivacy(t *testing.T) {
	for _, scenario := range []struct {
		path        string
		status      int
		unavailable bool
	}{{"/health/live", 200, true}, {"/health/ready", 200, false}, {"/health/ready", 503, true}, {"/api/v1/status", 200, false}, {"/missing?token=secret-marker", 404, false}} {
		t.Run(scenario.path, func(t *testing.T) {
			var logs bytes.Buffer
			handler := New(func(ctx context.Context) error {
				if _, ok := ctx.Deadline(); !ok {
					t.Error("readiness has no deadline")
				}
				if scenario.unavailable {
					return errors.New("secret-marker")
				}
				return nil
			}, slog.New(slog.NewJSONHandler(&logs, nil)), true)
			recorder := httptest.NewRecorder()
			request := httptest.NewRequestWithContext(t.Context(), http.MethodGet, scenario.path, nil)
			request.Header.Set("Authorization", "secret-marker")
			request.Header.Set("X-Request-ID", "secret-marker")
			handler.ServeHTTP(recorder, request)
			if recorder.Code != scenario.status {
				t.Fatalf("status %d: %s", recorder.Code, recorder.Body.String())
			}
			for _, header := range []string{"X-Request-ID", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Cache-Control", "Content-Security-Policy", "Strict-Transport-Security"} {
				if recorder.Header().Get(header) == "" {
					t.Errorf("missing %s", header)
				}
			}
			if strings.Contains(recorder.Body.String()+logs.String()+recorder.Header().Get("X-Request-ID"), "secret-marker") {
				t.Fatal("private input leaked")
			}
		})
	}
}

func TestPanicAndBodyLimit(t *testing.T) {
	logger := slog.New(slog.DiscardHandler)
	t.Run("panic", func(t *testing.T) {
		handler := security(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { panic("secret") }), logger, false)
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/", nil))
		if response.Code != 500 || strings.Contains(response.Body.String(), "secret") {
			t.Fatal(response)
		}
	})
	t.Run("oversized", func(t *testing.T) {
		handler := security(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if _, err := io.Copy(io.Discard, r.Body); err == nil {
				t.Error("body was unbounded")
			}
			w.WriteHeader(http.StatusRequestEntityTooLarge)
		}), logger, false)
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/", strings.NewReader(strings.Repeat("x", (1<<20)+1))))
		if response.Code != 413 {
			t.Fatal(response.Code)
		}
	})
}

func TestUnsupportedMethods(t *testing.T) {
	handler := New(func(context.Context) error { return nil }, slog.New(slog.DiscardHandler), false)
	for _, method := range []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions} {
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, httptest.NewRequestWithContext(t.Context(), method, "/api/v1/status", nil))
		if recorder.Code != http.StatusMethodNotAllowed || recorder.Header().Get("Allow") != "GET, HEAD" {
			t.Fatal("unsupported method accepted", method, recorder.Code)
		}
	}
}
