package catalog

import (
	"context"
	"encoding/json"
	"slices"
	"strings"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/coupon"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/couponclaim"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/couponrevision"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// CouponView is administrator-only policy state with a stable ID/version.
type CouponView struct {
	ID         string           `json:"id"`
	Version    int              `json:"version"`
	Definition CouponDefinition `json:"definition"`
}

// CouponListing is bounded and cursor-based; coupon codes are not publicly listed.
type CouponListing struct {
	Coupons []CouponView `json:"coupons"`
	Next    string       `json:"next"`
}

func couponDefinition(data map[string]any) (CouponDefinition, error) {
	raw, err := json.Marshal(data)
	if err != nil {
		return CouponDefinition{}, err
	}
	var result CouponDefinition
	err = json.Unmarshal(raw, &result)
	return result, err
}
func couponDocument(c CouponDefinition) (map[string]any, error) {
	raw, err := json.Marshal(c)
	if err != nil {
		return nil, err
	}
	var result map[string]any
	err = json.Unmarshal(raw, &result)
	return result, err
}
func couponView(row *ent.Coupon) (CouponView, error) {
	c, err := couponDefinition(row.Definition)
	return CouponView{row.ID, row.Version, c}, err
}

// ListCoupons returns at most 50 staff-only policies ordered by permanent code.
func (s *Store) ListCoupons(ctx context.Context, p *identity.Principal, after string) (CouponListing, error) {
	result := CouponListing{Coupons: []CouponView{}}
	if err := identity.Require(p, "admin"); err != nil {
		return result, err
	}
	if after != "" && !couponCodePattern.MatchString(after) {
		return result, &Invalid{[]Issue{{"after", "Invalid coupon cursor."}}}
	}
	query := s.client.Coupon.Query().Order(ent.Asc(coupon.FieldCode)).Limit(51)
	if after != "" {
		query.Where(coupon.CodeGT(after))
	}
	rows, err := query.All(ctx)
	if err != nil {
		return result, err
	}
	if len(rows) > 50 {
		result.Next = rows[49].Code
		rows = rows[:50]
	}
	for _, row := range rows {
		view, viewErr := couponView(row)
		if viewErr != nil {
			return result, viewErr
		}
		result.Coupons = append(result.Coupons, view)
	}
	return result, nil
}

// SaveCoupon atomically validates policy, fences staff access and writes history.
// Codes cannot change or be deleted/reused to reset previously consumed limits.
func (s *Store) SaveCoupon(ctx context.Context, p *identity.Principal, id string, version int, c CouponDefinition) (CouponView, error) {
	c.Code = strings.ToUpper(strings.TrimSpace(c.Code))
	if issues := validateCoupon(c); len(issues) > 0 {
		return CouponView{}, &Invalid{issues}
	}
	data, err := couponDocument(c)
	if err != nil {
		return CouponView{}, err
	}
	var result CouponView
	err = s.auth.StaffTransaction(ctx, p, true, func(tx *ent.Tx, current *identity.Principal) error {
		var row *ent.Coupon
		var writeErr error
		action := "coupon.created"
		if id == "" {
			if version != 0 {
				return ErrConflict
			}
			row, writeErr = tx.Coupon.Create().SetCode(c.Code).SetDefinition(data).Save(ctx)
			if ent.IsConstraintError(writeErr) {
				return ErrConflict
			}
		} else {
			existing, readErr := tx.Coupon.Get(ctx, id)
			if readErr != nil {
				return readErr
			}
			if existing.Version != version || version >= 2147483646 || existing.Code != c.Code {
				return ErrConflict
			}
			count, updateErr := tx.Coupon.Update().Where(coupon.IDEQ(id), coupon.VersionEQ(version)).AddVersion(1).SetDefinition(data).Save(ctx)
			if updateErr != nil {
				return updateErr
			}
			if count != 1 {
				return ErrConflict
			}
			row, writeErr = tx.Coupon.Get(ctx, id)
			action = "coupon.updated"
		}
		if writeErr != nil {
			return writeErr
		}
		if _, writeErr = tx.CouponRevision.Create().SetCouponID(row.ID).SetVersion(row.Version).SetDefinition(data).SetCreatedBy(current.User.ID).Save(ctx); writeErr != nil {
			return writeErr
		}
		if writeErr = record(ctx, tx, current, action, row.ID, row.Version); writeErr != nil {
			return writeErr
		}
		result, writeErr = couponView(row)
		return writeErr
	})
	return result, err
}

// CouponHistory preserves bounded policy revisions for administrative review.
func (s *Store) CouponHistory(ctx context.Context, p *identity.Principal, id string, before int) ([]CouponView, error) {
	if err := identity.Require(p, "admin"); err != nil {
		return nil, err
	}
	query := s.client.CouponRevision.Query().Where(couponrevision.CouponIDEQ(id)).Order(ent.Desc(couponrevision.FieldVersion)).Limit(20)
	if before > 0 {
		query.Where(couponrevision.VersionLT(before))
	}
	rows, err := query.All(ctx)
	if err != nil {
		return nil, err
	}
	result := make([]CouponView, 0, len(rows))
	for _, row := range rows {
		definition, readErr := couponDefinition(row.Definition)
		if readErr != nil {
			return nil, readErr
		}
		result = append(result, CouponView{row.CouponID, row.Version, definition})
	}
	return result, nil
}

// CouponCheck never accepts a subtotal or currency from the browser.
type CouponCheck struct {
	ReleaseID string  `json:"release_id"`
	Service   string  `json:"service"`
	Package   string  `json:"package"`
	Variant   string  `json:"variant"`
	Answers   Answers `json:"answers"`
	Code      string  `json:"code"`
}

// CheckCoupon returns an indicative discount using current authoritative prices.
// Reservation and settlement run in the later payable-contract transactions.
func (s *Store) CheckCoupon(ctx context.Context, p *identity.Principal, slug string, input CouponCheck) (Estimate, error) {
	if p != nil {
		if err := identity.Require(p, "account"); err != nil {
			return Estimate{}, err
		}
	}
	input.Code = strings.ToUpper(strings.TrimSpace(input.Code))
	invalid := func() (Estimate, error) {
		return Estimate{}, &Invalid{[]Issue{{"coupon", "This code is unavailable for these selections or its usage limit has been reached."}}}
	}
	if !couponCodePattern.MatchString(input.Code) {
		return invalid()
	}
	release, err := s.Published(ctx, slug)
	if err != nil {
		return Estimate{}, err
	}
	if release.ID != input.ReleaseID || release.Paused {
		return Estimate{}, ErrConflict
	}
	now := time.Now().UTC()
	result := Calculate(release, input.Service, input.Answers, now)
	if input.Package != "" || input.Variant != "" {
		i := slices.IndexFunc(release.Configuration.Packages, func(pack Package) bool { return pack.Key == input.Package && pack.Service == input.Service })
		if i < 0 {
			return invalid()
		}
		pack := release.Configuration.Packages[i]
		j := slices.IndexFunc(pack.Variants, func(v Variant) bool { return v.Key == input.Variant })
		if j < 0 {
			return invalid()
		}
		variant := pack.Variants[j]
		if variant.Capacity != nil && *variant.Capacity == 0 {
			return invalid()
		}
		validated := ValidateAnswers(release.Configuration, input.Service, "order", input.Answers, &variant)
		result.Answers, result.Issues = validated.Answers, validated.Issues
		if len(result.Issues) > 0 {
			result.Outcome = "invalid"
			result.AmountMinor = ""
			result.Currency = ""
			result.Lines = []PriceLine{}
			result.exactSubtotal = nil
			return result, nil
		}
		amount, ok := decimal(variant.AmountMinor)
		if !ok {
			return invalid()
		}
		result.exactSubtotal = amount
		result.Currency = variant.Currency
		result.AmountMinor = variant.AmountMinor
		result.Outcome = "estimated"
		result.Evaluator = "fixed-package-v1"
		result.Lines = []PriceLine{{"package", variant.Name, variant.AmountMinor}}
	}
	if len(result.Issues) > 0 {
		return result, nil
	}
	if result.Outcome != "estimated" || result.exactSubtotal == nil {
		return invalid()
	}
	row, err := s.client.Coupon.Query().Where(coupon.CodeEQ(input.Code)).Only(ctx)
	if ent.IsNotFound(err) {
		return invalid()
	}
	if err != nil {
		return Estimate{}, err
	}
	policy, err := couponDefinition(row.Definition)
	if err != nil {
		return Estimate{}, err
	}
	total, ok := couponAmount(policy, result.exactSubtotal, result.Currency, slug, input.Service, input.Package, "boosting", now)
	if !ok {
		return invalid()
	}
	query := s.client.CouponClaim.Query().Where(couponclaim.CouponIDEQ(row.ID), couponclaim.StateIn(couponclaim.StateHeld, couponclaim.StateRedeemed))
	if policy.GlobalLimit > 0 {
		count, countErr := query.Clone().Count(ctx)
		if countErr != nil {
			return Estimate{}, countErr
		}
		if count >= policy.GlobalLimit {
			return invalid()
		}
	}
	if p != nil && policy.CustomerLimit > 0 {
		count, countErr := query.Where(couponclaim.UserIDEQ(p.User.ID)).Count(ctx)
		if countErr != nil {
			return Estimate{}, countErr
		}
		if count >= policy.CustomerLimit {
			return invalid()
		}
	}
	before := rounded(result.exactSubtotal)
	after := rounded(total)
	discount := before.Sub(before, after).String()
	result.Discount = &Discount{row.ID, row.Version, policy.Code, discount, true}
	result.AmountMinor = after.String()
	result.Lines = append(result.Lines, PriceLine{"coupon", "Coupon " + policy.Code, "-" + discount})
	if policy.EndsAt.Before(result.ExpiresAt) {
		result.ExpiresAt = policy.EndsAt
	}
	return result, nil
}
