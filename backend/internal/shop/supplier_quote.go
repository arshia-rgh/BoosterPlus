package shop

import (
	"context"
	"errors"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/supply"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierquote"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// SupplierQuoteView omits supplier costs and merchant data.
type SupplierQuoteView struct {
	ID          string    `json:"id"`
	ProductID   string    `json:"product_id"`
	ReleaseID   string    `json:"release_id"`
	Quantity    string    `json:"quantity"`
	AmountMinor string    `json:"amount_minor"`
	Currency    string    `json:"currency"`
	ExpiresAt   time.Time `json:"expires_at"`
	Testing     bool      `json:"testing"`
}

func supplierCustomer(p *identity.Principal) error {
	if p.User.Role != identity.RoleCustomer || p.Session.Portal != string(identity.PortalCustomer) {
		return identity.ErrForbidden
	}
	return nil
}

func (s *Store) checkoutBinding(ctx context.Context, tx *ent.Tx, slug, id, releaseID string) (PublicProduct, *suppliers.ListingBinding, error) {
	if s.supplier == nil {
		return PublicProduct{}, nil, ErrConflict
	}
	g, err := publicGame(ctx, tx.Client(), slug)
	if err != nil {
		return PublicProduct{}, nil, err
	}
	row, err := tx.ShopProduct.Get(ctx, id)
	if err != nil {
		return PublicProduct{}, nil, err
	}
	if row.GameID != g.ID || row.State != "published" || row.CurrentRelease != releaseID {
		return PublicProduct{}, nil, ErrConflict
	}
	product, err := publicProduct(ctx, tx.Client(), row, g)
	if err != nil {
		return PublicProduct{}, nil, err
	}
	binding, err := tx.SupplierBinding.Get(ctx, releaseID)
	if err != nil {
		return PublicProduct{}, nil, err
	}
	if binding.ShopProductID != row.ID || binding.ReleaseID == nil || *binding.ReleaseID != releaseID || !supplierMatches(product.Definition, binding.Data) {
		return PublicProduct{}, nil, ErrConflict
	}
	conn, err := tx.SupplierConnection.Get(ctx, string(binding.Data.Connection))
	if err != nil {
		return PublicProduct{}, nil, err
	}
	if !conn.PurchasesEnabled || conn.MerchantID != binding.Data.MerchantID || !s.supplier.CanPurchase(binding.Data.Connection, conn.MerchantID) {
		return PublicProduct{}, nil, ErrConflict
	}
	return product, binding.Data, nil
}

// QuoteSupplier performs the provider GET outside SQL and rechecks publication,
// merchant, account and pause state before saving a short-lived accepted offer.
func (s *Store) QuoteSupplier(ctx context.Context, p *identity.Principal, slug, id, releaseID, quantity string) (out SupplierQuoteView, err error) {
	if !validID(id) || !validID(releaseID) || len(quantity) > 64 {
		return out, ErrInvalid
	}
	var binding *suppliers.ListingBinding
	err = s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		if e := supplierCustomer(current); e != nil {
			return e
		}
		count, e := tx.SupplierQuote.Query().Where(supplierquote.UserIDEQ(current.User.ID), supplierquote.ExpiresAtGT(s.now())).Count(ctx)
		if e != nil {
			return e
		}
		if count >= 20 {
			return identity.ErrLimited
		}
		_, binding, e = s.checkoutBinding(ctx, tx, slug, id, releaseID)
		return e
	})
	if err != nil {
		return out, err
	}
	quote, err := s.supplier.FreshQuote(ctx, binding, suppliers.Decimal(quantity))
	if err != nil {
		if errors.Is(err, suppliers.ErrInvalid) {
			return out, &Invalid{[]Issue{{"quantity", "Choose a quantity within this product’s limits and step."}}}
		}
		return out, supply.ErrUnavailable
	}
	amount, err := quote.CustomerPrice(binding.MarkupBPS, binding.OverrideMinor)
	if err != nil {
		return out, ErrConflict
	}
	err = s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		if e := supplierCustomer(current); e != nil {
			return e
		}
		count, e := tx.SupplierQuote.Query().Where(supplierquote.UserIDEQ(current.User.ID), supplierquote.ExpiresAtGT(s.now())).Count(ctx)
		if e != nil {
			return e
		}
		if count >= 20 {
			return identity.ErrLimited
		}
		if _, _, e = s.checkoutBinding(ctx, tx, slug, id, releaseID); e != nil {
			return e
		}
		if quote.Connection != binding.Connection || quote.MerchantID != binding.MerchantID || quote.Product.ID != binding.Product.ID || quote.Offer.ID != binding.OfferID || string(quote.Quantity) != quantity {
			return ErrConflict
		}
		now := s.now()
		row, e := tx.SupplierQuote.Create().SetUserID(current.User.ID).SetShopProductID(id).SetReleaseID(releaseID).SetData(&quote).SetAmountMinor(amount).SetExpiresAt(now.Add(2 * time.Minute)).SetCreatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		out = SupplierQuoteView{row.ID, id, releaseID, quantity, amount, "USD", row.ExpiresAt, quote.Connection.Testing()}
		return nil
	})
	return out, err
}
