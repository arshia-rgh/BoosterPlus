package wanted

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

type endpoint func(http.ResponseWriter, *http.Request, *identity.Principal) error

// Register attaches administrator management and the public per-game list.
func (s *Store) Register(mux *http.ServeMux) {
	staff := map[string]endpoint{
		"GET /api/v1/admin/wanted-accounts": func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			out, e := s.List(r.Context(), p, r.URL.Query().Get("game"))
			return respond(w, out, e)
		},
		"POST /api/v1/admin/wanted-accounts": func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			var in CreateInput
			if e := read(r, &in); e != nil {
				return e
			}
			out, e := s.Create(r.Context(), p, in)
			return respond(w, out, e)
		},
		"POST /api/v1/admin/wanted-accounts/{id}": func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			var in UpdateInput
			if e := read(r, &in); e != nil {
				return e
			}
			out, e := s.Update(r.Context(), p, r.PathValue("id"), in)
			return respond(w, out, e)
		},
		"POST /api/v1/admin/wanted-accounts/{id}/move": func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			var in MoveInput
			if e := read(r, &in); e != nil {
				return e
			}
			out, e := s.Move(r.Context(), p, r.PathValue("id"), in)
			return respond(w, out, e)
		},
		"POST /api/v1/admin/wanted-accounts/{id}/delete": func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			var in VersionInput
			if e := read(r, &in); e != nil {
				return e
			}
			e := s.Delete(r.Context(), p, r.PathValue("id"), in)
			return respond(w, map[string]bool{"deleted": true}, e)
		},
	}
	for pattern, next := range staff {
		mux.HandleFunc(pattern, s.auth.Protect("admin", handle(next, false)))
	}
	mux.HandleFunc("GET /api/v1/games/{slug}/wanted-accounts", s.auth.Protect("", handle(func(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
		out, e := s.Public(r.Context(), r.PathValue("slug"))
		return respond(w, out, e)
	}, true)))
}

func handle(next endpoint, public bool) endpoint {
	return func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		w.Header().Set("Cache-Control", "no-store")
		if !public {
			w.Header().Set("X-Robots-Tag", "noindex, nofollow")
		}
		err := next(w, r, p)
		var invalid *catalog.Invalid
		switch {
		case err == nil:
			return nil
		case errors.Is(err, ErrUnavailable), public && ent.IsNotFound(err):
			return write(w, http.StatusNotFound, map[string]string{"code": "wanted_accounts_unavailable"})
		case ent.IsNotFound(err):
			return write(w, http.StatusNotFound, map[string]string{"code": "wanted_account_not_found"})
		case errors.As(err, &invalid):
			return write(w, http.StatusUnprocessableEntity, map[string]any{"code": "wanted_account_invalid", "issues": invalid.Issues})
		case errors.Is(err, ErrInvalid):
			return write(w, http.StatusUnprocessableEntity, map[string]string{"code": "wanted_account_invalid"})
		case errors.Is(err, ErrConflict):
			return write(w, http.StatusConflict, map[string]string{"code": "wanted_account_conflict"})
		default:
			return err
		}
	}
}

func respond(w http.ResponseWriter, value any, err error) error {
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, value)
}

func read(r *http.Request, v any) error {
	if c := r.Header.Get("Content-Type"); c != "application/json" && !strings.HasPrefix(c, "application/json;") {
		return ErrInvalid
	}
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if e := d.Decode(v); e != nil {
		return ErrInvalid
	}
	var extra any
	if e := d.Decode(&extra); !errors.Is(e, io.EOF) {
		return ErrInvalid
	}
	return nil
}

func write(w http.ResponseWriter, status int, v any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(v)
}
