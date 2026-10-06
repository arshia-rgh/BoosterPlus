package artwork

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
)

// Register separates authenticated upload/preview from publication-gated delivery.
func (s *Store) Register(mux *http.ServeMux) {
	mux.HandleFunc("PUT /api/v1/admin/artwork/{id}/bytes", s.auth.ProtectUpload("admin", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		x, e := strconv.Atoi(r.URL.Query().Get("focus_x"))
		if e != nil {
			return problem(w, media.ErrInvalid)
		}
		y, e := strconv.Atoi(r.URL.Query().Get("focus_y"))
		if e != nil {
			return problem(w, media.ErrInvalid)
		}
		data, e := io.ReadAll(io.LimitReader(r.Body, media.MaxBytes+1))
		if e != nil || len(data) > media.MaxBytes {
			return problem(w, media.ErrInvalid)
		}
		// Extend only this authenticated, bounded upload response; normal API
		// writes and slow request bodies retain the server's short deadlines.
		if e = http.NewResponseController(w).SetWriteDeadline(time.Now().Add(60 * time.Second)); e != nil && !errors.Is(e, http.ErrNotSupported) {
			return e
		}
		value, e := s.Upload(r.Context(), p, r.PathValue("id"), r.Header.Get("Content-Type"), r.URL.Query().Get("purpose"), x, y, data)
		if e != nil {
			return problem(w, e)
		}
		w.Header().Set("Content-Type", "application/json")
		return json.NewEncoder(w).Encode(value)
	}))
	for _, admin := range []bool{false, true} {
		base, capability := "/api/v1/artwork/", ""
		if admin {
			base, capability = "/api/v1/admin/artwork/", "admin"
		}
		mux.HandleFunc("GET "+base+"{id}/{variant}", s.auth.ProtectRate(capability, "artwork-read", 1800, time.Hour, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			data, v, e := s.Content(r.Context(), p, r.PathValue("id"), r.PathValue("variant"), admin)
			if e != nil {
				if ent.IsNotFound(e) || errors.Is(e, media.ErrInvalid) || errors.Is(e, media.ErrConflict) {
					w.WriteHeader(http.StatusNotFound)
					return nil
				}
				return e
			}
			w.Header().Set("Content-Type", v.ContentType)
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("Content-Security-Policy", "default-src 'none'; sandbox")
			w.Header().Set("Content-Length", strconv.Itoa(len(data)))
			w.Header().Set("Content-Disposition", `inline; filename="artwork"`)
			w.Header().Set("Cache-Control", "private, no-cache")
			w.Header().Set("ETag", `"`+v.Checksum+`"`)
			if r.Header.Get("If-None-Match") == `"`+v.Checksum+`"` {
				w.Header().Del("Content-Length")
				w.WriteHeader(http.StatusNotModified)
				return nil
			}
			// #nosec G705 -- Content only returns checksum-verified, scanned and re-encoded JPEG/PNG; nosniff and sandbox prevent active content.
			_, e = w.Write(data)
			return e
		}))
	}
}
func problem(w http.ResponseWriter, err error) error {
	code, status := "", 0
	switch {
	case errors.Is(err, media.ErrInvalid):
		code, status = "artwork_invalid", http.StatusUnprocessableEntity
	case errors.Is(err, media.ErrConflict) || ent.IsConstraintError(err):
		code, status = "artwork_conflict", http.StatusConflict
	case errors.Is(err, media.ErrInfected):
		code, status = "artwork_rejected", http.StatusUnprocessableEntity
	}
	if code == "" {
		return err
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(map[string]string{"code": code})
}
