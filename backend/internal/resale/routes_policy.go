package resale

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/paymentroutes"
)

type sellerPayoutRoute struct {
	Code    string `json:"code"`
	Network string `json:"network"`
}

func validateSellerRoute(routes []sellerPayoutRoute, terms SellerTerms) error {
	for _, route := range routes {
		if route.Code == terms.Currency && route.Network == terms.Network && paymentroutes.ManualPayoutNetwork(route.Network) {
			return nil
		}
	}
	return &catalog.Invalid{Issues: []catalog.Issue{{Path: "terms.currency", Message: "Choose a payout asset and network from the published payment policy. Refresh payout routes and select again."}}}
}

func sellerRoute(ctx context.Context, tx *ent.Tx, terms SellerTerms) error {
	settings, err := tx.PaymentSettings.Get(ctx, 1)
	if err != nil {
		return err
	}
	if settings.PublishedID == "" {
		return ErrConflict
	}
	policy, err := tx.PaymentPolicy.Get(ctx, settings.PublishedID)
	if err != nil {
		return err
	}
	value, err := decode[struct {
		Routes []sellerPayoutRoute `json:"routes"`
	}](policy.Data)
	if err != nil {
		return err
	}
	return validateSellerRoute(value.Routes, terms)
}
