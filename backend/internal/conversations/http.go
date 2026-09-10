package conversations

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func read(r *http.Request, value any) error {
	if content := r.Header.Get("Content-Type"); content != "application/json" && !strings.HasPrefix(content, "application/json;") {
		return invalid("request", "Use application/json.")
	}
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(value); err != nil {
		return invalid("request", "Invalid or oversized request.")
	}
	var extra any
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		return invalid("request", "Send one JSON document.")
	}
	return nil
}
func write(w http.ResponseWriter, value any) error {
	w.Header().Set("Content-Type", "application/json")
	return json.NewEncoder(w).Encode(value)
}
func cursor(raw string) (int, error) {
	if raw == "" {
		return 0, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 0 || value > 2147483646 {
		return 0, ErrConflict
	}
	return value, nil
}

type endpoint func(http.ResponseWriter, *http.Request, *identity.Principal) error

func problem(next endpoint) endpoint {
	return func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		err := next(w, r, p)
		var invalidInput *Invalid
		if errors.As(err, &invalidInput) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnprocessableEntity)
			return write(w, map[string]any{"code": "conversation_invalid", "issues": invalidInput.Issues})
		}
		if errors.Is(err, ErrConflict) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusConflict)
			return write(w, map[string]string{"code": "conversation_conflict"})
		}
		return err
	}
}

// Register attaches separate customer and administrative capabilities.
func (s *Store) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/v1/admin/fulfillment/{id}/conversation", s.auth.ProtectRate("admin", "fulfillment-sharing", 60, time.Hour, problem(func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input struct {
			Version int `json:"version"`
		}
		if err := read(r, &input); err != nil {
			return err
		}
		value, err := s.OpenCoordination(r.Context(), p, r.PathValue("id"), input.Version)
		if err != nil {
			return err
		}
		return write(w, value)
	})))
	for _, admin := range []bool{false, true} {
		base := "/api/v1/conversations"
		if admin {
			base = "/api/v1/admin/conversations"
		}
		routes := map[string]endpoint{
			"GET " + base: func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				result, err := s.List(r.Context(), p, admin, r.URL.Query().Get("after"), r.URL.Query().Get("state"), r.URL.Query().Get("assigned"), r.URL.Query().Get("order_id"))
				if err != nil {
					return err
				}
				return write(w, result)
			},
			"POST " + base: func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				var input CreateInput
				if err := read(r, &input); err != nil {
					return err
				}
				result, err := s.Create(r.Context(), p, admin, input)
				if err != nil {
					return err
				}
				return write(w, result)
			},
			"GET " + base + "/{id}": func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				result, err := s.Get(r.Context(), p, r.PathValue("id"), admin)
				if err != nil {
					return err
				}
				return write(w, result)
			},
			"GET " + base + "/{id}/messages": func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				if r.URL.Query().Has("before") {
					if r.URL.Query().Has("after") {
						return ErrConflict
					}
					before, err := cursor(r.URL.Query().Get("before"))
					if err != nil {
						return err
					}
					result, err := s.History(r.Context(), p, r.PathValue("id"), admin, before)
					if err != nil {
						return err
					}
					return write(w, result)
				}
				after, err := cursor(r.URL.Query().Get("after"))
				if err != nil {
					return err
				}
				result, err := s.Messages(r.Context(), p, r.PathValue("id"), admin, after)
				if err != nil {
					return err
				}
				return write(w, result)
			},
			"POST " + base + "/{id}/messages": func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				var input SendInput
				if err := read(r, &input); err != nil {
					return err
				}
				result, err := s.Send(r.Context(), p, r.PathValue("id"), admin, input)
				if err != nil {
					return err
				}
				return write(w, result)
			},
			"POST " + base + "/{id}/read": func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				var input struct {
					Sequence int `json:"sequence"`
				}
				if err := read(r, &input); err != nil {
					return err
				}
				if err := s.Read(r.Context(), p, r.PathValue("id"), admin, input.Sequence); err != nil {
					return err
				}
				w.WriteHeader(http.StatusNoContent)
				return nil
			},
			"GET " + base + "/{id}/stream": s.stream(admin),
		}
		if admin {
			routes["POST "+base+"/{id}/{action}"] = func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				var input Change
				if err := read(r, &input); err != nil {
					return err
				}
				result, err := s.Change(r.Context(), p, r.PathValue("id"), r.PathValue("action"), input)
				if err != nil {
					return err
				}
				return write(w, result)
			}
		}
		for pattern, handler := range routes {
			wrapped := problem(handler)
			switch {
			case pattern == "POST "+base:
				mux.HandleFunc(pattern, s.auth.ProtectRate(capability(admin), "conversation-create", 20, time.Hour, wrapped))
			case strings.HasSuffix(pattern, "/{id}/messages") && strings.HasPrefix(pattern, "POST "):
				mux.HandleFunc(pattern, s.auth.ProtectRate(capability(admin), "conversation-send", 60, time.Minute, wrapped))
			case strings.HasSuffix(pattern, "/stream"):
				mux.HandleFunc(pattern, s.auth.ProtectRate(capability(admin), "conversation-stream", 60, time.Minute, wrapped))
			default:
				mux.HandleFunc(pattern, s.auth.Protect(capability(admin), wrapped))
			}
		}
	}
}
func (s *Store) stream(admin bool) endpoint {
	return func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		after, err := cursor(r.URL.Query().Get("after"))
		if err != nil {
			return err
		}
		if last := r.Header.Get("Last-Event-ID"); last != "" {
			after, err = cursor(last)
			if err != nil {
				return err
			}
		}
		version, err := s.Tick(r.Context(), p, r.PathValue("id"), admin)
		if err != nil {
			return err
		}
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Accel-Buffering", "no")
		control := http.NewResponseController(w)
		send := func() bool {
			if version != after {
				if _, writeErr := fmt.Fprintf(w, "id: %d\nevent: change\ndata: {\"cursor\":%d}\n\n", version, version); writeErr != nil {
					return false
				}
				after = version
			} else {
				if _, writeErr := io.WriteString(w, ": heartbeat\n\n"); writeErr != nil {
					return false
				}
			}
			return control.Flush() == nil
		}
		if !send() {
			return nil
		}
		tick := time.NewTicker(2 * time.Second)
		defer tick.Stop()
		finish := time.NewTimer(StreamDuration)
		defer finish.Stop()
		for {
			select {
			case <-r.Context().Done():
				return nil
			case <-finish.C:
				return nil
			case <-tick.C:
				version, err = s.Tick(r.Context(), p, r.PathValue("id"), admin)
				if err != nil {
					return nil
				}
				if !send() {
					return nil
				}
			}
		}
	}
}
