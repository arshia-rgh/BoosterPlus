package resale

import (
	"context"
	"encoding/json"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/availabilityevents"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountlisting"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountreservation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
)

// ReserveInput binds explicit buyer acceptance to the current listing release and price.
type ReserveInput struct {
	RequestKey     string `json:"request_key"`
	ReleaseID      string `json:"release_id"`
	ExpectedAmount string `json:"expected_amount"`
	Currency       string `json:"currency"`
	AcceptTerms    bool   `json:"accept_terms"`
	TermsVersion   string `json:"terms_version"`
}

// Reserve atomically creates a unique unpaid purchase before any provider invoice.
func (s *Store) Reserve(ctx context.Context, p *identity.Principal, id string, input ReserveInput) (orders.Detail, error) {
	if !validID(id) || !validID(input.RequestKey) || !validID(input.ReleaseID) || !minorAmount.MatchString(input.ExpectedAmount) || !currencyCode.MatchString(input.Currency) || !input.AcceptTerms {
		return orders.Detail{}, ErrInvalid
	}
	raw, err := json.Marshal(struct {
		ListingID string
		Input     ReserveInput
	}{id, input})
	if err != nil {
		return orders.Detail{}, err
	}
	digest := s.auth.RequestDigest("account-reservation", raw)
	orderID := ""
	err = s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		termsVersion, termsErr := s.auth.TermsVersion(ctx, tx.Client())
		if termsErr != nil {
			return termsErr
		}
		if input.TermsVersion != termsVersion {
			return identity.ErrTerms
		}
		if current.User.Role != identity.RoleCustomer {
			return identity.ErrForbidden
		}
		old, e := tx.Order.Query().Where(order.UserIDEQ(current.User.ID), order.RequestKeyEQ(input.RequestKey)).Only(ctx)
		if e == nil {
			if old.RequestHash != digest || old.ListingID != id {
				return ErrConflict
			}
			orderID = old.ID
			return nil
		}
		if !ent.IsNotFound(e) {
			return e
		}
		row, e := tx.AccountListing.Query().Where(accountlisting.IDEQ(id), accountlisting.StateEQ("published")).Only(ctx)
		if e != nil {
			return e
		}
		if row.CurrentRelease != input.ReleaseID || row.SellerID == current.User.ID {
			return ErrConflict
		}
		game, e := tx.Game.Get(ctx, row.GameID)
		if e != nil {
			return e
		}
		available, e := catalog.GameAvailable(ctx, tx.Client(), game, "accounts")
		if e != nil {
			return e
		}
		if !available {
			return ErrConflict
		}
		offer, e := tx.SellerOffer.Get(ctx, row.OfferID)
		if e != nil {
			return e
		}
		if offer.State != "accepted" || offer.ControlVerifiedAt == nil {
			return ErrConflict
		}
		product, e := publicListing(ctx, tx.Client(), row)
		if e != nil {
			return e
		}
		if product.Product.Commission != nil && !product.Product.Commission.Valid(product.Product.Currency, product.Product.AmountMinor) {
			return ErrConflict
		}
		if product.Product.AmountMinor != input.ExpectedAmount || product.Product.Currency != input.Currency {
			return ErrConflict
		}
		pending, e := tx.AccountReservation.Query().Where(accountreservation.UserIDEQ(current.User.ID), accountreservation.StateIn("reserved", "payment_hold")).Count(ctx)
		if e != nil {
			return e
		}
		if pending >= 3 {
			return identity.ErrLimited
		}
		settings, e := tx.PaymentSettings.Get(ctx, 1)
		if e != nil {
			return e
		}
		if settings.PublishedID == "" {
			return ErrConflict
		}
		policy, e := tx.PaymentPolicy.Get(ctx, settings.PublishedID)
		if e != nil {
			return e
		}
		duration, e := decode[struct {
			WindowMinutes int `json:"window_minutes"`
		}](policy.Data)
		if e != nil {
			return e
		}
		if duration.WindowMinutes < 1 || duration.WindowMinutes > 1440 {
			return ErrConflict
		}
		expires := s.instant().Add(time.Duration(duration.WindowMinutes) * time.Minute)
		parent, e := tx.AccountSubmission.Get(ctx, row.SubmissionID)
		if e != nil {
			return e
		}
		publicSnapshot, e := document(product)
		if e != nil {
			return e
		}
		estimated, e := document(catalog.Estimate{ReleaseID: input.ReleaseID, Version: row.Version, Evaluator: "fixed_account_price", ExpiresAt: expires, Outcome: "estimated", Currency: input.Currency, AmountMinor: input.ExpectedAmount, Answers: catalog.Answers{}, Lines: accountPriceLines(product.Product), Issues: []catalog.Issue{}})
		if e != nil {
			return e
		}
		purchase, e := tx.Order.Create().SetUserID(current.User.ID).SetGameID(row.GameID).SetGameName(row.GameName).SetSlug(row.Slug).SetService("account_sale").SetKind(order.KindAccount).SetListingID(id).SetAccountSnapshot(publicSnapshot).SetRequestKey(input.RequestKey).SetRequestHash(digest).SetState(order.StateAwaitingPayment).SetAnswers(map[string]any{}).SetSnapshot(parent.Snapshot).SetEstimate(estimated).SetTermsVersion(input.TermsVersion).SetCreatedAt(s.instant()).SetUpdatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		data, e := document(orders.Commercial{AccountPrice: product.Product.Commission, Revision: row.Version, Currency: input.Currency, SubtotalMinor: input.ExpectedAmount, AmountMinor: input.ExpectedAmount, Lines: accountPriceLines(product.Product), Scope: product.Product.Title, Reason: product.Product.SaleTerms, DeliveryMinHours: product.Product.DeliveryMinHours, DeliveryMaxHours: product.Product.DeliveryMaxHours, ExpiresAt: expires, TermsVersion: input.TermsVersion})
		if e != nil {
			return e
		}
		contract, e := tx.OrderContract.Create().SetOrderID(purchase.ID).SetActiveOrderID(purchase.ID).SetUserID(current.User.ID).SetGameID(row.GameID).SetPaymentState(ordercontract.PaymentStateUnissued).SetData(data).SetCreatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		if _, e = tx.Order.UpdateOneID(purchase.ID).SetCurrentContract(contract.ID).Save(ctx); e != nil {
			return e
		}
		if _, e = tx.AccountReservation.Create().SetListingID(id).SetActiveListingID(id).SetReleaseID(row.CurrentRelease).SetOrderID(purchase.ID).SetUserID(current.User.ID).SetExpiresAt(expires).SetCreatedAt(s.instant()).SetUpdatedAt(s.instant()).Save(ctx); e != nil {
			return e
		}
		if _, e = tx.AccountListing.UpdateOneID(id).SetState("reserved").AddVersion(1).SetUpdatedAt(s.instant()).Save(ctx); e != nil {
			return e
		}
		if _, e = tx.OrderEvent.Create().SetOrderID(purchase.ID).SetVersion(1).SetAction("account_reserved").SetActorID(current.User.ID).SetActorRole(current.User.Role).SetMessage("This account is reserved for your accepted agreement. Payment is required before protected delivery.").SetCreatedAt(s.instant()).Save(ctx); e != nil {
			return e
		}
		if e = availabilityevents.Changed(ctx, tx, row.GameID); e != nil {
			return e
		}
		if e = s.audit(ctx, tx, current, "account_reserved", purchase.ID); e != nil {
			return e
		}
		orderID = purchase.ID
		return nil
	})
	if err != nil {
		return orders.Detail{}, err
	}
	return orders.New(s.client, s.auth, s.now).Get(ctx, p, orderID, false)
}
