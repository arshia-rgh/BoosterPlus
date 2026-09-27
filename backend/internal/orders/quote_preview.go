package orders

import (
	"context"
	"encoding/json"
	"slices"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// QuotePreview is a nonbinding server calculation. It creates no quote or entitlement.
type QuotePreview struct {
	Data         Commercial `json:"data"`
	PreviewHash  string     `json:"preview_hash"`
	OrderVersion int        `json:"order_version"`
}

// PreviewQuote resolves the exact customer-visible agreement without issuing it.
func (s *Store) PreviewQuote(ctx context.Context, p *identity.Principal, id string, input QuoteInput) (QuotePreview, error) {
	if err := validateQuote(input, s.instant()); err != nil {
		return QuotePreview{}, err
	}
	var result QuotePreview
	err := s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, current *identity.Principal) error {
		row, err := owned(ctx, tx.Client(), current, id, true)
		if err != nil {
			return err
		}
		if row.Kind != order.KindCustom || row.Version != input.Version || row.CurrentContract != "" || !slices.Contains([]order.State{order.StateSubmitted, order.StateQuoted}, row.State) {
			return ErrConflict
		}
		data, err := s.quoteCommercial(ctx, tx, row, input, s.instant())
		if err != nil {
			return err
		}
		digest, err := s.quotePreviewDigest(row, data)
		if err != nil {
			return err
		}
		result = QuotePreview{Data: data, PreviewHash: digest, OrderVersion: row.Version}
		return nil
	})
	return result, err
}

func (s *Store) quotePreviewDigest(row *ent.Order, data Commercial) (string, error) {
	raw, err := json.Marshal(struct {
		ID      string     `json:"id"`
		Version int        `json:"version"`
		Data    Commercial `json:"data"`
	}{row.ID, row.Version, data})
	if err != nil {
		return "", err
	}
	return s.auth.RequestDigest("order-quote-preview", raw), nil
}

func (s *Store) quoteCommercial(ctx context.Context, tx *ent.Tx, row *ent.Order, input QuoteInput, now time.Time) (Commercial, error) {
	discount, total, err := catalog.ContractDiscount(ctx, tx, row.UserID, row.CouponCode, catalog.CouponOffer{Slug: row.Slug, Service: row.Service, Currency: input.Currency, SubtotalMinor: input.AmountMinor}, now)
	if err != nil {
		return Commercial{}, err
	}
	lines := slices.Clone(input.Lines)
	if len(lines) == 0 {
		lines = []catalog.PriceLine{{Key: "scope", Label: "Quoted scope", AmountMinor: input.AmountMinor}}
	}
	if discount != nil {
		lines = append(lines, catalog.PriceLine{Key: "coupon", Label: "Coupon " + discount.Code, AmountMinor: "-" + discount.AmountMinor})
	}
	terms, err := s.auth.TermsVersion(ctx, tx.Client())
	if err != nil {
		return Commercial{}, err
	}
	return Commercial{Revision: row.QuoteCount + 1, Currency: input.Currency, SubtotalMinor: input.AmountMinor, AmountMinor: total, Discount: discount, Lines: lines, Scope: input.Scope, Reason: input.Reason, DeliveryMinHours: input.DeliveryMinHours, DeliveryMaxHours: input.DeliveryMaxHours, ExpiresAt: input.ExpiresAt.UTC().Truncate(time.Microsecond), TermsVersion: terms}, nil
}
