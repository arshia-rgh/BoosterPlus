package conversations

import (
	"net/http"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func (s *Store) registerForms(mux *http.ServeMux) {
	for _, admin := range []bool{false, true} {
		base := "/api/v1/conversations/{id}/forms"
		if admin {
			base = "/api/v1/admin/conversations/{id}/forms"
		}
		routes := map[string]endpoint{
			"GET " + base + "/legacy": func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				v, e := s.LegacyForms(r.Context(), p, r.PathValue("id"), admin)
				if e != nil {
					return e
				}
				return write(w, map[string]any{"links": v})
			},
			"GET " + base + "/{form}": func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				v, e := s.Form(r.Context(), p, r.PathValue("id"), r.PathValue("form"), admin)
				if e != nil {
					return e
				}
				return write(w, v)
			},
			"POST " + base + "/{form}/reveal": func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				var input struct{}
				if e := read(r, &input); e != nil {
					return e
				}
				value, e := s.RevealForm(r.Context(), p, r.PathValue("id"), r.PathValue("form"), admin)
				if e != nil {
					return e
				}
				defer clear(value)
				w.Header().Set("Cache-Control", "no-store")
				return write(w, map[string][]byte{"value": value})
			},
		}
		if admin {
			routes["GET "+base+"/options"] = func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				v, e := s.FormOptions(r.Context(), p, r.PathValue("id"))
				if e != nil {
					return e
				}
				return write(w, v)
			}
			routes["POST "+base] = func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				var input FormCreate
				if e := read(r, &input); e != nil {
					return e
				}
				v, e := s.CreateForm(r.Context(), p, r.PathValue("id"), input)
				if e != nil {
					return e
				}
				return write(w, v)
			}
			routes["POST "+base+"/{form}/cancel"] = func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				var input struct {
					Version int `json:"version"`
				}
				if e := read(r, &input); e != nil {
					return e
				}
				v, e := s.CancelForm(r.Context(), p, r.PathValue("id"), r.PathValue("form"), input.Version)
				if e != nil {
					return e
				}
				return write(w, v)
			}
		} else {
			routes["POST "+base+"/{form}/reply"] = func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				var input FormReply
				if e := read(r, &input); e != nil {
					return e
				}
				v, e := s.ReplyForm(r.Context(), p, r.PathValue("id"), r.PathValue("form"), input)
				if e != nil {
					return e
				}
				return write(w, v)
			}
		}
		for pattern, handler := range routes {
			mux.HandleFunc(pattern, s.auth.ProtectRate(capability(admin), "conversation-form", 90, time.Minute, problem(handler)))
		}
	}
}
