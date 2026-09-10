package fulfillment

import (
	"net/http"
	"strconv"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func (s *Store) registerCalendar(mux *http.ServeMux) {
	for _, admin := range []bool{false, true} {
		base := "/api/v1/booster/calendar"
		if admin {
			base = "/api/v1/admin/staff/{staff}/calendar"
		}
		target := func(r *http.Request, p *identity.Principal) string {
			if admin {
				return r.PathValue("staff")
			}
			return p.User.ID
		}
		register := func(pattern string, handler func(http.ResponseWriter, *http.Request, *identity.Principal) error) {
			mux.HandleFunc(pattern, s.auth.ProtectRate(staffCapability(admin), "staff-calendar", 300, time.Hour, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				w.Header().Set("Content-Type", "application/json")
				return handleError(w, handler(w, r, p))
			}))
		}
		register("GET "+base, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			value, err := s.Calendar(r.Context(), p, target(r, p), admin, r.URL.Query().Get("after"))
			if err != nil {
				return err
			}
			return write(w, value)
		})
		register("POST "+base, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			var input StaffCalendarProfile
			if err := read(r, &input); err != nil {
				return err
			}
			value, err := s.SaveCalendarProfile(r.Context(), p, target(r, p), admin, input)
			if err != nil {
				return err
			}
			return write(w, value)
		})
		register("POST "+base+"/windows", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			var input WindowInput
			if err := read(r, &input); err != nil {
				return err
			}
			value, err := s.AddAvailability(r.Context(), p, target(r, p), admin, input)
			if err != nil {
				return err
			}
			return write(w, value)
		})
		register("POST "+base+"/windows/{window}/remove", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			var input struct {
				Version int `json:"version"`
			}
			if err := read(r, &input); err != nil {
				return err
			}
			if err := s.RemoveAvailability(r.Context(), p, target(r, p), r.PathValue("window"), admin, input.Version); err != nil {
				return err
			}
			w.WriteHeader(http.StatusNoContent)
			return nil
		})
	}
	for _, audience := range []string{"account", "admin", "booster"} {
		base := "/api/v1/fulfillment/{id}"
		if audience != "account" {
			base = "/api/v1/" + audience + "/fulfillment/{id}"
		}
		register := func(pattern string, handler func(http.ResponseWriter, *http.Request, *identity.Principal) error) {
			mux.HandleFunc(pattern, s.auth.ProtectRate(audience, "order-scheduling-"+audience, 300, time.Hour, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				w.Header().Set("Content-Type", "application/json")
				return handleError(w, handler(w, r, p))
			}))
		}
		register("GET "+base+"/bookings", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			value, err := s.Bookings(r.Context(), p, r.PathValue("id"), audience, r.URL.Query().Get("after"))
			if err != nil {
				return err
			}
			return write(w, value)
		})
		register("GET "+base+"/slots", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			week := 0
			var err error
			if raw := r.URL.Query().Get("week"); raw != "" {
				week, err = strconv.Atoi(raw)
				if err != nil {
					return ErrInvalid
				}
			}
			value, err := s.Slots(r.Context(), p, r.PathValue("id"), audience, r.URL.Query().Get("after"), week)
			if err != nil {
				return err
			}
			return write(w, value)
		})
		register("POST "+base+"/bookings/{booking}/{action}", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			var input BookingAction
			if err := read(r, &input); err != nil {
				return err
			}
			value, err := s.ChangeBooking(r.Context(), p, r.PathValue("id"), r.PathValue("booking"), audience, r.PathValue("action"), input)
			if err != nil {
				return err
			}
			return write(w, value)
		})
		if audience == "account" {
			register("POST "+base+"/bookings", func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
				var input BookingInput
				if err := read(r, &input); err != nil {
					return err
				}
				value, err := s.ProposeBooking(r.Context(), p, r.PathValue("id"), input)
				if err != nil {
					return err
				}
				return write(w, value)
			})
		}
	}
}
