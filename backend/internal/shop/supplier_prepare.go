package shop

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplieritem"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierprice"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// SupplierPreparation creates or refreshes a private shop draft, never publishes.
// Versions protect both the source pricing and the separately authored shop draft.
type SupplierPreparation struct {
	Connection        suppliers.Connection `json:"connection"`
	ImportID          string               `json:"import_id"`
	ProductID         string               `json:"product_id"`
	OfferID           string               `json:"offer_id"`
	PriceVersion      int                  `json:"price_version"`
	ConnectionVersion int                  `json:"connection_version"`
	ShopVersion       int                  `json:"shop_version"`
}

// PrepareSupplier preserves authored copy/artwork/terms when refreshing a binding.
func (s *Store) PrepareSupplier(ctx context.Context, p *identity.Principal, input SupplierPreparation) (out Draft, err error) {
	if s.supplier == nil || !validID(input.ImportID) || !validVersion(input.PriceVersion) || !validVersion(input.ConnectionVersion) || (input.Connection != suppliers.NexusSandbox && input.Connection != suppliers.NexusProduction) {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, current *identity.Principal) error {
		conn, e := tx.SupplierConnection.Get(ctx, string(input.Connection))
		if e != nil {
			return e
		}
		if conn.Version != input.ConnectionVersion || conn.CurrentImport != input.ImportID || !s.supplier.MerchantConfigured(input.Connection, conn.MerchantID) {
			return ErrConflict
		}
		run, e := tx.SupplierImport.Get(ctx, input.ImportID)
		if e != nil {
			return e
		}
		if run.State != "complete" || run.ConnectionID != conn.ID || run.MerchantID != conn.MerchantID {
			return ErrConflict
		}
		item, e := tx.SupplierItem.Query().Where(supplieritem.ImportIDEQ(run.ID), supplieritem.ProductIDEQ(input.ProductID)).Only(ctx)
		if e != nil {
			return e
		}
		price, e := tx.SupplierPrice.Query().Where(supplierprice.ConnectionIDEQ(conn.ID), supplierprice.ProductIDEQ(input.ProductID), supplierprice.OfferIDEQ(input.OfferID)).Only(ctx)
		if e != nil {
			return e
		}
		if item.Data == nil || price.Version != input.PriceVersion || price.GameID == "" || strings.TrimSpace(price.Region) == "" {
			return ErrConflict
		}
		game, e := tx.Game.Get(ctx, price.GameID)
		if e != nil {
			return e
		}
		if game.Archived {
			return ErrConflict
		}
		markup := conn.MarkupBps
		if price.MarkupBps != nil {
			markup = *price.MarkupBps
		}
		binding := &suppliers.ListingBinding{Connection: input.Connection, MerchantID: conn.MerchantID, ImportID: run.ID, Product: *item.Data, OfferID: input.OfferID, MarkupBPS: markup, OverrideMinor: price.OverrideMinor}
		offer, e := supplierOffer(binding)
		if e != nil {
			return e
		}
		if !supplierMethod(binding.Product, offer, price.DeliveryMethod) {
			return &Invalid{[]Issue{{"supplier", "Review the delivery method against the supplier's required fields."}}}
		}
		quantity := offer.Quantity.Min
		if offer.Quantity.Kind == "one" {
			quantity = "1"
		}
		amount, e := suppliers.Price(offer.Cost, quantity, markup, price.OverrideMinor)
		if e != nil || suppliers.ValidateQuantity(offer.Quantity, quantity) != nil {
			return ErrConflict
		}
		var row *ent.ShopProduct
		value := Definition{Title: trimSupplierText(item.Data.Name, 120), Description: trimSupplierText(item.Data.Description, 4000), Category: "Game items", Policy: Policy{ReservationMinutes: 30}}
		if price.ShopProductID != nil {
			row, e = tx.ShopProduct.Get(ctx, *price.ShopProductID)
			if e != nil {
				return e
			}
			if row.Version != input.ShopVersion || row.GameID != game.ID || row.State == "archived" {
				return ErrConflict
			}
			value, e = definition(row.Draft)
			if e != nil {
				return e
			}
			if value.Supplier == nil {
				return ErrConflict
			}
		} else if input.ShopVersion != 0 {
			return ErrConflict
		}
		value.Supplier = supplierDefinition(*item.Data, offer, price.DeliveryMethod, input.Connection.Testing())
		value.Recipient = []RecipientField{}
		value.Variants = []Variant{{Key: "supplier", Label: offer.Name, Region: price.Region, Platform: "See product requirements", Server: "See product requirements", Currency: "USD", UnitAmountMinor: amount, MinQuantity: 1, MaxQuantity: 1, Enabled: true}}
		value.Reviewed = false
		setSupplierDelivery(&value)
		if issues := Validate(value, false); len(issues) > 0 {
			return &Invalid{issues}
		}
		data, e := document(value)
		if e != nil {
			return e
		}
		now := s.now()
		if row == nil {
			id := uuid.NewString()
			row, e = tx.ShopProduct.Create().SetID(id).SetGameID(game.ID).SetGameName(game.Name).SetSlug(id).SetTitle(value.Title).SetDraft(data).SetCreatedAt(now).SetUpdatedAt(now).Save(ctx)
			if e != nil {
				return e
			}
			if _, e = tx.SupplierBinding.Create().SetID(id).SetShopProductID(id).SetData(binding).SetCreatedAt(now).Save(ctx); e != nil {
				return e
			}
			if _, e = tx.SupplierPrice.UpdateOne(price).SetShopProductID(id).AddVersion(1).SetUpdatedBy(current.User.ID).SetUpdatedAt(now).Save(ctx); e != nil {
				return e
			}
		} else {
			previous, readErr := tx.SupplierBinding.Get(ctx, row.ID)
			if readErr != nil {
				return readErr
			}
			if previous.ReleaseID != nil || previous.ShopProductID != row.ID || previous.Data == nil || previous.Data.Connection != input.Connection || previous.Data.MerchantID != conn.MerchantID {
				return ErrConflict
			}
			if _, e = tx.SupplierBinding.UpdateOne(previous).SetData(binding).Save(ctx); e != nil {
				return e
			}
			row, e = tx.ShopProduct.UpdateOne(row).SetDraft(data).SetTitle(value.Title).AddVersion(1).SetUpdatedAt(now).Save(ctx)
			if e != nil {
				return e
			}
		}
		if e = event(ctx, tx, current, row, "supplier_prepared", "", now); e != nil {
			return e
		}
		out, e = draft(ctx, tx, row)
		return e
	})
	return out, err
}

func trimSupplierText(value string, limit int) string {
	return string([]rune(strings.TrimSpace(value))[:min(len([]rune(strings.TrimSpace(value))), limit)])
}
