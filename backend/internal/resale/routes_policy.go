package resale

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
)

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
		Routes []struct {
			Code    string `json:"code"`
			Network string `json:"network"`
		} `json:"routes"`
	}](policy.Data)
	if err != nil {
		return err
	}
	for _, route := range value.Routes {
		if route.Code == terms.Currency && route.Network == terms.Network {
			return nil
		}
	}
	return ErrInvalid
}
