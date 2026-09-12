package media

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

type endpoint func(http.ResponseWriter, *http.Request, *identity.Principal) error

func write(w http.ResponseWriter, v any) error {
	w.Header().Set("Content-Type", "application/json")
	return json.NewEncoder(w).Encode(v)
}
func problem(next endpoint) endpoint {
	return func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		err := next(w, r, p)
		if errors.Is(err, ErrInvalid) || errors.Is(err, ErrConflict) {
			code, status := "media_invalid", http.StatusUnprocessableEntity
			if errors.Is(err, ErrConflict) {
				code, status = "media_conflict", http.StatusConflict
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(status)
			return write(w, map[string]string{"code": code})
		}
		return err
	}
}

// Register exposes scoped intents, bounded bytes, scan state and signed downloads.
func (s *Store) Register(mux *http.ServeMux) {
	s.registerListingImages(mux)
	s.registerDirectory(mux)
	for _, admin := range []bool{false, true} {
		base := "/api/v1/media"
		if admin {
			base = "/api/v1/admin/media"
		}
		mux.HandleFunc("POST "+base, s.auth.ProtectRate(capFor(admin), "media-intent", 20, time.Hour, problem(func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			if kind := r.Header.Get("Content-Type"); kind != "application/json" && !strings.HasPrefix(kind, "application/json;") {
				return ErrInvalid
			}
			var input Intent
			d := json.NewDecoder(r.Body)
			d.DisallowUnknownFields()
			if err := d.Decode(&input); err != nil {
				return ErrInvalid
			}
			var extra any
			if err := d.Decode(&extra); !errors.Is(err, io.EOF) {
				return ErrInvalid
			}
			v, err := s.Create(r.Context(), p, admin, input)
			if err != nil {
				return err
			}
			return write(w, v)
		})))
		mux.HandleFunc("PUT "+base+"/{id}/bytes", s.auth.ProtectUpload(capFor(admin), problem(func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			if r.Header.Get("Content-Type") != "application/octet-stream" {
				return ErrInvalid
			}
			data, err := io.ReadAll(io.LimitReader(r.Body, MaxBytes+1))
			if err != nil || len(data) > MaxBytes {
				return ErrInvalid
			}
			if err = s.Upload(r.Context(), p, r.PathValue("id"), admin, data); err != nil {
				return err
			}
			w.WriteHeader(http.StatusNoContent)
			return nil
		})))
		mux.HandleFunc("GET "+base+"/{id}", s.auth.Protect(capFor(admin), problem(func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			v, err := s.Get(r.Context(), p, r.PathValue("id"), admin)
			if err != nil {
				return err
			}
			return write(w, v)
		})))
		mux.HandleFunc("POST "+base+"/{id}/{action}", s.auth.ProtectRate(capFor(admin), "media-action", 40, time.Hour, problem(func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			id := r.PathValue("id")
			switch r.PathValue("action") {
			case "finalize":
				v, err := s.Finalize(r.Context(), p, id, admin)
				if err != nil {
					return err
				}
				return write(w, v)
			case "grant":
				url, err := s.Grant(r.Context(), p, id, admin)
				if err != nil {
					return err
				}
				return write(w, map[string]string{"url": url})
			case "retry":
				if err := s.Retry(r.Context(), p, id, admin); err != nil {
					return err
				}
			case "remove":
				if err := s.Remove(r.Context(), p, id, admin); err != nil {
					return err
				}
			default:
				return ErrInvalid
			}
			w.WriteHeader(http.StatusNoContent)
			return nil
		})))
		mux.HandleFunc("GET "+base+"/{id}/content", s.auth.Protect(capFor(admin), problem(func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			data, kind, err := s.Content(r.Context(), p, r.PathValue("id"), admin, r.URL.Query().Get("expires"), r.URL.Query().Get("signature"))
			if err != nil {
				return err
			}
			w.Header().Set("Content-Type", kind)
			w.Header().Set("Cache-Control", "no-store")
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("Referrer-Policy", "no-referrer")
			filename := "proof.png"
			if kind == "image/jpeg" {
				filename = "proof.jpg"
			}
			w.Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)
			_, err = w.Write(data)
			return err
		})))
	}
}
