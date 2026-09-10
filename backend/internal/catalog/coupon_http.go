package catalog

import (
	"net/http"
	"strconv"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func (s *Store) listCoupons(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	result, err := s.ListCoupons(r.Context(), p, r.URL.Query().Get("after"))
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, result)
}
func (s *Store) saveCoupon(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var input struct {
		Version    int              `json:"version"`
		Definition CouponDefinition `json:"definition"`
	}
	if err := read(r, &input); err != nil {
		return err
	}
	result, err := s.SaveCoupon(r.Context(), p, r.PathValue("id"), input.Version, input.Definition)
	if err != nil {
		return err
	}
	status := http.StatusOK
	if r.PathValue("id") == "" {
		status = http.StatusCreated
	}
	return write(w, status, result)
}
func (s *Store) couponHistory(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	before := 0
	if raw := r.URL.Query().Get("before"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 1 {
			return &Invalid{[]Issue{{"before", "Use a positive coupon revision cursor."}}}
		}
		before = value
	}
	result, err := s.CouponHistory(r.Context(), p, r.PathValue("id"), before)
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, map[string]any{"coupons": result})
}
func (s *Store) checkCoupon(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	var input CouponCheck
	if err := read(r, &input); err != nil {
		return err
	}
	result, err := s.CheckCoupon(r.Context(), p, r.PathValue("slug"), input)
	if err != nil {
		return err
	}
	return write(w, http.StatusOK, result)
}
