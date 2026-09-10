package reports

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func read(r *http.Request, v any) error {
	if ct := r.Header.Get("Content-Type"); ct != "application/json" && !strings.HasPrefix(ct, "application/json;") {
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
func write(w http.ResponseWriter, v any) error { return json.NewEncoder(w).Encode(v) }
func failure(w http.ResponseWriter, err error) error {
	if errors.Is(err, ErrInvalid) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		return write(w, map[string]string{"code": "report_invalid"})
	}
	if errors.Is(err, ErrConflict) {
		w.WriteHeader(http.StatusConflict)
		return write(w, map[string]string{"code": "report_conflict"})
	}
	return err
}

// Register protects report previews and audited downloads with current staff authority.
func (s *Store) Register(mux *http.ServeMux) {
	register := func(pattern string, fn func(http.ResponseWriter, *http.Request, *identity.Principal) error) {
		mux.HandleFunc(pattern, s.auth.ProtectRate("admin", "reports", 120, time.Hour, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			w.Header().Set("Content-Type", "application/json")
			return failure(w, fn(w, r, p))
		}))
	}
	register("POST /api/v1/admin/reports/preview", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input Query
		if e := read(r, &input); e != nil {
			return e
		}
		v, e := s.Preview(r.Context(), p, input)
		if e != nil {
			return e
		}
		return write(w, v)
	})
	register("POST /api/v1/admin/reports/export", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input ExportInput
		if e := read(r, &input); e != nil {
			return e
		}
		v, e := s.Download(r.Context(), p, input)
		if e != nil {
			return e
		}
		raw, e := json.Marshal(v)
		if e != nil {
			return e
		}
		w.Header().Set("Content-Disposition", `attachment; filename="boosterplus-`+v.Report.Kind+`-report.json"`)
		w.Header().Set("X-Content-Type-Options", "nosniff")
		_, e = w.Write(raw)
		return e
	})
}
