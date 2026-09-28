package shop

import (
	"context"
	"encoding/json"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopproduct"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopreservation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopstock"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
)

// ReserveInput explicitly accepts one published variant and its delivery destination.
type ReserveInput struct {
	RequestKey     string            `json:"request_key"`
	ReleaseID      string            `json:"release_id"`
	Variant        string            `json:"variant"`
	Quantity       int               `json:"quantity"`
	ExpectedAmount string            `json:"expected_amount"`
	Currency       string            `json:"currency"`
	Recipient      map[string]string `json:"recipient"`
	AcceptTerms    bool              `json:"accept_terms"`
	TermsVersion   string            `json:"terms_version"`
}

// Reserve creates an unpaid contract, private recipient and capacity reservation atomically.
func (s *Store) Reserve(ctx context.Context, p *identity.Principal, slug, id string, input ReserveInput) (out DeliveryView, err error) {
	if !validID(id) || !validID(input.RequestKey) || !validID(input.ReleaseID) || !input.AcceptTerms || !keyPattern.MatchString(input.Variant) || !amountPattern.MatchString(input.ExpectedAmount) || len(input.Recipient) > 4 {
		return out, ErrInvalid
	}
	raw, err := json.Marshal(struct {
		Slug, ID string
		Input    ReserveInput
	}{slug, id, input})
	if err != nil {
		return out, err
	}
	digest := s.auth.RequestDigest("shop-reservation", raw)
	err = s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		if current.User.Role != identity.RoleCustomer || current.Session.Portal != string(identity.PortalCustomer) {
			return identity.ErrForbidden
		}
		old, e := tx.Order.Query().Where(order.UserIDEQ(current.User.ID), order.RequestKeyEQ(input.RequestKey)).Only(ctx)
		if e == nil {
			if old.RequestHash != digest || old.Kind != order.KindShop || old.ShopProductID != id {
				return ErrConflict
			}
			out, e = deliveryView(ctx, tx, old, false)
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
		g, e := publicGame(ctx, tx.Client(), slug)
		if e != nil {
			return e
		}
		row, e := tx.ShopProduct.Query().Where(shopproduct.IDEQ(id), shopproduct.GameIDEQ(g.ID), shopproduct.StateEQ("published")).Only(ctx)
		if e != nil {
			return e
		}
		product, e := publicProduct(ctx, tx.Client(), row, g)
		if e != nil {
			return e
		}
		if product.ReleaseID != input.ReleaseID {
			return ErrConflict
		}
		var variant Variant
		for _, value := range product.Definition.Variants {
			if value.Key == input.Variant {
				variant = value
				break
			}
		}
		amount, e := Total(variant, input.Quantity)
		if e != nil {
			return e
		}
		if amount != input.ExpectedAmount || variant.Currency != input.Currency {
			return ErrConflict
		}
		if e = ValidateRecipient(product.Definition.Recipient, input.Recipient); e != nil {
			return e
		}
		pending, e := tx.ShopReservation.Query().Where(shopreservation.UserIDEQ(current.User.ID), shopreservation.StateEQ("reserved")).Count(ctx)
		if e != nil {
			return e
		}
		if pending >= 3 {
			return identity.ErrLimited
		}
		stock, e := tx.ShopStock.Query().Where(shopstock.ProductIDEQ(id), shopstock.VariantKeyEQ(variant.Key), shopstock.EnabledEQ(true)).Only(ctx)
		if e != nil {
			return e
		}
		if stock.Total-stock.Reserved-stock.Committed < input.Quantity || !validVersion(stock.Version) {
			return ErrConflict
		}
		now := s.now().UTC().Truncate(time.Microsecond)
		expires := now.Add(time.Duration(product.Definition.Policy.ReservationMinutes) * time.Minute)
		purchase := Purchase{ProductID: id, ReleaseID: product.ReleaseID, Product: product.Definition, Variant: variant, Quantity: input.Quantity, AmountMinor: amount}
		data, e := snapshot(purchase)
		if e != nil {
			return e
		}
		gameRelease, e := tx.CatalogRelease.Get(ctx, g.CurrentRelease)
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
		gameSnapshot, e := snapshot(catalog.Release{ID: gameRelease.ID, GameID: g.ID, Slug: g.Slug, Version: gameRelease.Version, CreatedAt: gameRelease.CreatedAt, Configuration: config})
		if e != nil {
			return e
		}
		estimate, e := snapshot(catalog.Estimate{ReleaseID: product.ReleaseID, Version: product.Version, Evaluator: "fixed_shop_price", ExpiresAt: expires, Outcome: "estimated", Currency: variant.Currency, AmountMinor: amount, Answers: catalog.Answers{}, Lines: []catalog.PriceLine{}, Issues: []catalog.Issue{}})
		if e != nil {
			return e
		}
		record, e := tx.Order.Create().SetUserID(current.User.ID).SetGameID(g.ID).SetGameName(config.Name).SetSlug(g.Slug).SetService("shop").SetKind(order.KindShop).SetShopProductID(id).SetShopSnapshot(data).SetVariantKey(variant.Key).SetRequestKey(input.RequestKey).SetRequestHash(digest).SetState(order.StateAwaitingPayment).SetAnswers(map[string]any{}).SetSnapshot(gameSnapshot).SetEstimate(estimate).SetTermsVersion(terms).SetCreatedAt(now).SetUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		commercial, e := snapshot(orders.Commercial{Revision: product.Version, Currency: variant.Currency, SubtotalMinor: amount, AmountMinor: amount, Lines: []catalog.PriceLine{}, Scope: product.Definition.Title + " — " + variant.Label, Reason: product.Definition.Policy.DeliveryTerms, DeliveryMinHours: product.Definition.Policy.DeliveryMinHours, DeliveryMaxHours: product.Definition.Policy.DeliveryMaxHours, ExpiresAt: expires, TermsVersion: terms})
		if e != nil {
			return e
		}
		contract, e := tx.OrderContract.Create().SetOrderID(record.ID).SetActiveOrderID(record.ID).SetUserID(current.User.ID).SetGameID(g.ID).SetPaymentState(ordercontract.PaymentStateUnissued).SetData(commercial).SetCreatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		record, e = tx.Order.UpdateOne(record).SetCurrentContract(contract.ID).Save(ctx)
		if e != nil {
			return e
		}
		if _, e = tx.ShopReservation.Create().SetOrderID(record.ID).SetUserID(current.User.ID).SetProductID(id).SetReleaseID(product.ReleaseID).SetVariantKey(variant.Key).SetQuantity(input.Quantity).SetExpiresAt(expires).SetCreatedAt(now).SetUpdatedAt(now).Save(ctx); e != nil {
			return e
		}
		if _, e = tx.ShopRecipient.Create().SetOrderID(record.ID).SetUserID(current.User.ID).SetRecipientValues(input.Recipient).SetCreatedAt(now).Save(ctx); e != nil {
			return e
		}
		if _, e = tx.ShopStock.UpdateOne(stock).AddReserved(input.Quantity).AddVersion(1).SetUpdatedAt(now).Save(ctx); e != nil {
			return e
		}
		if _, e = tx.OrderEvent.Create().SetOrderID(record.ID).SetVersion(1).SetAction("shop_reserved").SetActorID(current.User.ID).SetActorRole(current.User.Role).SetMessage("Your shop selection is reserved. Verified payment is required before staff delivery.").SetCreatedAt(now).Save(ctx); e != nil {
			return e
		}
		if e = s.deliveryAudit(ctx, tx, current, "reserved", record.ID, 1); e != nil {
			return e
		}
		out, e = deliveryView(ctx, tx, record, false)
		return e
	})
	if err != nil {
		return DeliveryView{}, err
	}
	return out, nil
}
