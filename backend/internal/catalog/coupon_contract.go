package catalog

import (
	"context"
	"strings"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/coupon"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/couponclaim"
)

// CouponOffer contains server-resolved business facts, never a public request's
// subtotal. Call ContractDiscount only inside an AuthorizedTransaction so policy
// changes and competing reservations share the same serialization boundary.
type CouponOffer struct{ Slug, Service, Package, Currency, SubtotalMinor string }

// ContractDiscount prices an administrator's quote or a fixed package contract.
// Reserve the returned version in the same transaction after comparing the exact
// result to what the customer accepted. Checks alone do not create an entitlement.
func ContractDiscount(ctx context.Context, tx *ent.Tx, userID, code string, offer CouponOffer, now time.Time) (*Discount, string, error) {
	if code == "" {
		return nil, offer.SubtotalMinor, nil
	}
	code = strings.ToUpper(strings.TrimSpace(code))
	invalid := func() (*Discount, string, error) {
		return nil, "", &Invalid{[]Issue{{"coupon", "This coupon changed or is unavailable. Request an updated price before accepting."}}}
	}
	if !couponCodePattern.MatchString(code) {
		return invalid()
	}
	row, err := tx.Coupon.Query().Where(coupon.CodeEQ(code)).Only(ctx)
	if ent.IsNotFound(err) {
		return invalid()
	}
	if err != nil {
		return nil, "", err
	}
	c, err := couponDefinition(row.Definition)
	if err != nil {
		return nil, "", err
	}
	subtotal, ok := decimal(offer.SubtotalMinor)
	if !ok {
		return invalid()
	}
	total, ok := couponAmount(c, subtotal, offer.Currency, offer.Slug, offer.Service, offer.Package, "boosting", now)
	if !ok {
		return invalid()
	}
	query := tx.CouponClaim.Query().Where(couponclaim.CouponIDEQ(row.ID), couponclaim.StateIn(couponclaim.StateHeld, couponclaim.StateRedeemed))
	if c.GlobalLimit > 0 {
		count, countErr := query.Clone().Count(ctx)
		if countErr != nil {
			return nil, "", countErr
		}
		if count >= c.GlobalLimit {
			return invalid()
		}
	}
	if c.CustomerLimit > 0 {
		count, countErr := query.Where(couponclaim.UserIDEQ(userID)).Count(ctx)
		if countErr != nil {
			return nil, "", countErr
		}
		if count >= c.CustomerLimit {
			return invalid()
		}
	}
	after := rounded(total)
	amount := rounded(subtotal).Sub(rounded(subtotal), after).String()
	return &Discount{CouponID: row.ID, Version: row.Version, Code: code, AmountMinor: amount, Indicative: true}, after.String(), nil
}

// ClaimCoupon records a checked use in the same AuthorizedTransaction that
// creates its payable contract. No public endpoint can call this independently.
func ClaimCoupon(ctx context.Context, tx *ent.Tx, userID, contractID string, discount *Discount) error {
	if discount == nil {
		return nil
	}
	_, err := tx.CouponClaim.Create().SetCouponID(discount.CouponID).SetCouponVersion(discount.Version).SetUserID(userID).SetContractID(contractID).SetState(couponclaim.StateHeld).Save(ctx)
	return err
}

// NormalizeCouponCode validates optional codes before persisting an order intent.
func NormalizeCouponCode(value string) (string, error) {
	code := strings.ToUpper(strings.TrimSpace(value))
	if code != "" && !couponCodePattern.MatchString(code) {
		return "", &Invalid{[]Issue{{"coupon_code", "Use a valid coupon code of 3–40 ASCII letters, digits, underscores or hyphens."}}}
	}
	return code, nil
}
