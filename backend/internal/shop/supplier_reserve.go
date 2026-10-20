package shop

import (
	"context"
	"encoding/json"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// SupplierAcceptance consumes a customer-bound quote once. Recipient data is
// encrypted separately and never appears in the public order/contract snapshot.
type SupplierAcceptance struct {
	RequestKey     string            `json:"request_key"`
	QuoteID        string            `json:"quote_id"`
	ExpectedAmount string            `json:"expected_amount"`
	TermsVersion   string            `json:"terms_version"`
	AcceptTerms    bool              `json:"accept_terms"`
	Recipient      map[string]string `json:"recipient"`
}

// ReserveSupplier creates an unpaid, immutable obligation. It never buys.
func (s *Store) ReserveSupplier(ctx context.Context, p *identity.Principal, slug, id string, input SupplierAcceptance) (out DeliveryView, err error) {
	if s.supplier == nil || !validID(id) || !validID(input.RequestKey) || !validID(input.QuoteID) || !amountPattern.MatchString(input.ExpectedAmount) || !input.AcceptTerms || len(input.Recipient) > 64 {
		return out, ErrInvalid
	}
	raw, err := json.Marshal(struct {
		Slug, ID string
		Input    SupplierAcceptance
	}{slug, id, input})
	if err != nil {
		return out, ErrInvalid
	}
	defer clear(raw)
	if len(raw) > 12<<10 {
		return out, ErrInvalid
	}
	digest := s.auth.RequestDigest("supplier-checkout", raw)
	err = s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		if e := supplierCustomer(current); e != nil {
			return e
		}
		old, e := tx.Order.Query().Where(order.UserIDEQ(current.User.ID), order.RequestKeyEQ(input.RequestKey)).Only(ctx)
		if e == nil {
			if old.Kind != order.KindShop || old.ShopProductID != id || old.RequestHash != digest {
				return ErrConflict
			}
			out, e = s.deliveryView(ctx, tx, old, false)
			return e
		}
		if !ent.IsNotFound(e) {
			return e
		}
		terms, e := s.auth.TermsVersion(ctx, tx.Client())
		if e != nil {
			return e
		}
		if terms != input.TermsVersion {
			return identity.ErrTerms
		}
		quote, e := tx.SupplierQuote.Get(ctx, input.QuoteID)
		if e != nil {
			return e
		}
		if quote.UserID != current.User.ID || quote.ShopProductID != id || quote.OrderID != nil || quote.Data == nil || !quote.ExpiresAt.After(s.now()) || quote.AmountMinor != input.ExpectedAmount {
			return ErrConflict
		}
		product, binding, e := s.checkoutBinding(ctx, tx, slug, id, quote.ReleaseID)
		if e != nil {
			return e
		}
		if quote.Data.Connection != binding.Connection || quote.Data.MerchantID != binding.MerchantID {
			return ErrConflict
		}
		if issues := supplierInputIssues(quote.Data.Offer.Fields, input.Recipient); len(issues) > 0 {
			return &Invalid{issues}
		}
		pending, e := tx.Order.Query().Where(order.UserIDEQ(current.User.ID), order.KindEQ(order.KindShop), order.StateEQ(order.StateAwaitingPayment)).Count(ctx)
		if e != nil {
			return e
		}
		if pending >= 3 {
			return identity.ErrLimited
		}
		now := s.now().UTC().Truncate(time.Microsecond)
		expires := now.Add(time.Duration(product.Definition.Policy.ReservationMinutes) * time.Minute)
		variant := product.Definition.Variants[0]
		variant.UnitAmountMinor = quote.AmountMinor
		selection := Purchase{ProductID: id, ReleaseID: quote.ReleaseID, Product: product.Definition, Variant: variant, Quantity: 1, AmountMinor: quote.AmountMinor, SupplierQuantity: string(quote.Data.Quantity)}
		data, e := snapshot(selection)
		if e != nil {
			return e
		}
		game, e := tx.Game.Get(ctx, product.GameID)
		if e != nil {
			return e
		}
		gameRelease, e := tx.CatalogRelease.Get(ctx, game.CurrentRelease)
		if e != nil {
			return e
		}
		var config catalog.Configuration
		gameRaw, e := json.Marshal(gameRelease.Configuration)
		if e != nil {
			return e
		}
		if e = json.Unmarshal(gameRaw, &config); e != nil {
			return e
		}
		gameSnapshot, e := snapshot(catalog.Release{ID: gameRelease.ID, GameID: game.ID, Slug: game.Slug, Version: gameRelease.Version, CreatedAt: gameRelease.CreatedAt, Configuration: config})
		if e != nil {
			return e
		}
		estimate, e := snapshot(catalog.Estimate{ReleaseID: product.ReleaseID, Version: product.Version, Evaluator: "supplier_quote", ExpiresAt: expires, Outcome: "estimated", Currency: "USD", AmountMinor: quote.AmountMinor, Answers: catalog.Answers{}, Lines: []catalog.PriceLine{}, Issues: []catalog.Issue{}})
		if e != nil {
			return e
		}
		record, e := tx.Order.Create().SetUserID(current.User.ID).SetGameID(game.ID).SetGameName(config.Name).SetSlug(game.Slug).SetService("shop").SetKind(order.KindShop).SetShopProductID(id).SetShopSnapshot(data).SetVariantKey(variant.Key).SetRequestKey(input.RequestKey).SetRequestHash(digest).SetState(order.StateAwaitingPayment).SetAnswers(map[string]any{}).SetSnapshot(gameSnapshot).SetEstimate(estimate).SetTermsVersion(terms).SetCreatedAt(now).SetUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		commercial, e := snapshot(orders.Commercial{Revision: product.Version, Currency: "USD", SubtotalMinor: quote.AmountMinor, AmountMinor: quote.AmountMinor, Lines: []catalog.PriceLine{}, Scope: product.Definition.Title, Reason: product.Definition.Policy.DeliveryTerms, DeliveryMinHours: product.Definition.Policy.DeliveryMinHours, DeliveryMaxHours: product.Definition.Policy.DeliveryMaxHours, DeliveryBasis: supplierDeliveryBasis(product.Definition), ExpiresAt: expires, TermsVersion: terms})
		if e != nil {
			return e
		}
		contract, e := tx.OrderContract.Create().SetOrderID(record.ID).SetActiveOrderID(record.ID).SetUserID(current.User.ID).SetGameID(game.ID).SetPaymentState(ordercontract.PaymentStateUnissued).SetData(commercial).SetCreatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		record, e = tx.Order.UpdateOne(record).SetCurrentContract(contract.ID).Save(ctx)
		if e != nil {
			return e
		}
		if _, e = s.supplier.PrepareInTransaction(ctx, tx, record, contract, *quote.Data, quote.AmountMinor, input.Recipient); e != nil {
			return e
		}
		if _, e = tx.SupplierQuote.UpdateOne(quote).SetOrderID(record.ID).Save(ctx); e != nil {
			return e
		}
		if _, e = tx.OrderEvent.Create().SetOrderID(record.ID).SetVersion(1).SetAction("shop_reserved").SetActorID(current.User.ID).SetActorRole(current.User.Role).SetMessage("Your price is confirmed. Delivery starts only after verified payment. Supplier availability is checked again before purchase.").SetCreatedAt(now).Save(ctx); e != nil {
			return e
		}
		if e = s.deliveryAudit(ctx, tx, current, "supplier_reserved", record.ID, 1); e != nil {
			return e
		}
		out, e = s.deliveryView(ctx, tx, record, false)
		return e
	})
	if err != nil {
		return DeliveryView{}, err
	}
	return out, nil
}

func supplierInputIssues(fields []suppliers.Field, values map[string]string) []Issue {
	issues := []Issue{}
	known := map[string]bool{}
	for _, field := range fields {
		known[field.ID] = true
		value, present := values[field.ID]
		if field.Transient {
			if present {
				issues = append(issues, Issue{"recipient." + field.ID, "Enter this only on the secure supplier verification page after payment."})
			}
			continue
		}
		input := map[string]string{}
		if present {
			input[field.ID] = value
		}
		if suppliers.ValidateFields([]suppliers.Field{field}, input) != nil {
			issues = append(issues, Issue{"recipient." + field.ID, "Check this delivery detail against the product's requirements."})
		}
	}
	for key := range values {
		if !known[key] {
			issues = append(issues, Issue{"recipient", "Remove delivery fields that are not requested by this product."})
			break
		}
	}
	if len(issues) == 0 && suppliers.ValidateFields(fields, values) != nil {
		issues = append(issues, Issue{"recipient", "Delivery details exceed the supported size. Shorten them and try again."})
	}
	return issues
}
