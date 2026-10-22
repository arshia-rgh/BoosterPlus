package resale

import (
	"context"
	"errors"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountlisting"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/artwork"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/moneytransfer"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Ownership derives who owns the listed account from its immutable origin:
// PLAYORA owns staff-created and bought-first accounts; consignment accounts
// remain the seller's until a buyer completes the purchase.
func Ownership(origin accountlisting.Origin) string {
	if origin == accountlisting.OriginConsignment {
		return "seller"
	}
	return "playora"
}

func inventoryOrigins(ownership, origin string) ([]accountlisting.Origin, bool) {
	if ownership != "" && origin != "" {
		return nil, false
	}
	switch ownership {
	case "":
	case "playora":
		return []accountlisting.Origin{accountlisting.OriginPlayora, accountlisting.OriginBuyFirst}, true
	case "seller":
		return []accountlisting.Origin{accountlisting.OriginConsignment}, true
	default:
		return nil, false
	}
	if origin == "" {
		return nil, true
	}
	if err := accountlisting.OriginValidator(accountlisting.Origin(origin)); err != nil {
		return nil, false
	}
	return []accountlisting.Origin{accountlisting.Origin(origin)}, true
}

func inventoryCounts(ctx context.Context, tx *ent.Tx, state string) (InventoryCounts, error) {
	query := tx.AccountListing.Query()
	if state != "" {
		query.Where(accountlisting.StateEQ(state))
	}
	var groups []struct {
		Origin accountlisting.Origin `json:"origin"`
		Count  int                   `json:"count"`
	}
	result := InventoryCounts{}
	if err := query.GroupBy(accountlisting.FieldOrigin).Aggregate(ent.Count()).Scan(ctx, &groups); err != nil {
		return result, err
	}
	for _, group := range groups {
		if Ownership(group.Origin) == "seller" {
			result.Seller += group.Count
		} else {
			result.Playora += group.Count
		}
	}
	return result, nil
}

// payoutFacts batches the buy-first purchase payment state for one page.
func payoutFacts(ctx context.Context, tx *ent.Tx, rows []*ent.AccountListing, views []ListingView) error {
	offers := []string{}
	for _, row := range rows {
		if row.Origin == accountlisting.OriginBuyFirst && row.OfferID != nil {
			offers = append(offers, *row.OfferID)
		}
	}
	if len(offers) == 0 {
		return nil
	}
	paid, err := tx.MoneyTransfer.Query().Where(moneytransfer.SellerOfferIDIn(offers...), moneytransfer.KindEQ("seller_payout"), moneytransfer.StateEQ("confirmed")).All(ctx)
	if err != nil {
		return err
	}
	confirmed := map[string]bool{}
	for _, transfer := range paid {
		if transfer.SellerOfferID != nil {
			confirmed[*transfer.SellerOfferID] = true
		}
	}
	for i, row := range rows {
		if row.Origin == accountlisting.OriginBuyFirst && row.OfferID != nil {
			value := confirmed[*row.OfferID]
			views[i].SellerPayoutConfirmed = &value
		}
	}
	return nil
}

// PlayoraListingInput creates a private draft for an account PLAYORA already owns.
type PlayoraListingInput struct {
	RequestKey string `json:"request_key"`
	GameID     string `json:"game_id"`
	Title      string `json:"title"`
}

// CreatePlayoraListing records PLAYORA-owned inventory without any seller
// submission, agreement, commission, handover or payout obligation. The request
// key is the listing ID, so a retried create returns the same private draft.
func (s *Store) CreatePlayoraListing(ctx context.Context, p *identity.Principal, input PlayoraListingInput) (ListingView, error) {
	if !validID(input.RequestKey) || !validID(input.GameID) || !text(input.Title, 1, 120) {
		return ListingView{}, ErrInvalid
	}
	result, err := s.createPlayoraListing(ctx, p, input)
	if ent.IsConstraintError(err) {
		// A concurrent duplicate with the same key committed first; return it.
		result, err = s.createPlayoraListing(ctx, p, input)
	}
	return result, err
}

func (s *Store) createPlayoraListing(ctx context.Context, p *identity.Principal, input PlayoraListingInput) (ListingView, error) {
	var result ListingView
	err := s.auth.AuthorizedTransaction(ctx, p, "admin", true, func(tx *ent.Tx, current *identity.Principal) error {
		old, e := tx.AccountListing.Get(ctx, input.RequestKey)
		if e == nil {
			if old.Origin != accountlisting.OriginPlayora || old.GameID != input.GameID {
				return ErrConflict
			}
			result, e = s.detailView(ctx, tx, old)
			return e
		}
		if !ent.IsNotFound(e) {
			return e
		}
		game, e := tx.Game.Get(ctx, input.GameID)
		if ent.IsNotFound(e) {
			return ErrConflict
		}
		if e != nil {
			return e
		}
		// Availability for account sales is enforced at publication and purchase;
		// staff may prepare a draft while sales are off.
		if game.Archived || !game.Published || game.CurrentRelease == "" {
			return ErrConflict
		}
		draft, e := document(playoraDraft(input.Title))
		if e != nil {
			return e
		}
		row, e := tx.AccountListing.Create().SetID(input.RequestKey).SetOrigin(accountlisting.OriginPlayora).SetGameID(game.ID).SetGameName(game.Name).SetSlug(game.Slug).SetDraft(draft).SetCreatedAt(s.instant()).SetUpdatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		if e = s.auditWith(ctx, tx, current, "playora_inventory_created", row.ID, map[string]string{"origin": string(row.Origin), "game_id": row.GameID}); e != nil {
			return e
		}
		result, e = s.detailView(ctx, tx, row)
		return e
	})
	return result, err
}

// playoraDraft supplies only owner-approved buyer wording. Price, delivery
// timing, account facts and images stay empty until staff enter them.
func playoraDraft(title string) Product {
	return Product{Title: title, Attributes: []Attribute{}, MediaIDs: []string{}, Currency: "USD", DisputeHours: 168,
		SaleTerms: agreementDefaults.Buyer.SaleTerms, TransferRequirements: agreementDefaults.Buyer.TransferRequirements,
		DisputeTerms: agreementDefaults.Buyer.DisputeTerms, AcknowledgementTerms: agreementDefaults.Buyer.AcknowledgementTerms}
}

// playoraImages accepts only ready account-purpose staff uploads. Seller
// conversation media and other artwork purposes are never cross-resolved.
func playoraImages(ctx context.Context, tx *ent.Tx, data Product) error {
	for _, id := range data.MediaIDs {
		found, err := tx.Artwork.Query().Where(artwork.IDEQ(id), artwork.StateEQ("ready"), artwork.PurposeEQ("account")).Exist(ctx)
		if err != nil {
			return err
		}
		if !found {
			return ErrConflict
		}
	}
	return nil
}

// playoraBlockers mirrors the seller selling-progress readiness codes using the
// listing alone; publication rechecks every rule.
func (s *Store) playoraBlockers(ctx context.Context, tx *ent.Tx, row *ent.AccountListing) ([]string, error) {
	result := []string{}
	if row.State == "reserved" || row.State == "sold" {
		return result, nil
	}
	game, err := tx.Game.Get(ctx, row.GameID)
	if err != nil {
		return result, err
	}
	available, err := catalog.GameAvailable(ctx, tx.Client(), game, "accounts")
	if err != nil {
		return result, err
	}
	if !available {
		result = append(result, "game_unavailable")
	}
	if row.State == "published" {
		return result, nil
	}
	product, err := decode[Product](row.Draft)
	if err != nil {
		return result, err
	}
	result = append(result, listingFieldBlockers(product)...)
	if err = listingCommission(product, nil); err != nil {
		var invalid *catalog.Invalid
		if !errors.As(err, &invalid) {
			return result, err
		}
		result = appendMissing(result, listingAgreementBlocker(invalid))
	}
	if err = playoraImages(ctx, tx, product); err != nil {
		if !errors.Is(err, ErrConflict) {
			return result, err
		}
		result = appendMissing(result, "listing_images")
	}
	return append(result, "publication"), nil
}

func appendMissing(values []string, value string) []string {
	for _, existing := range values {
		if existing == value {
			return values
		}
	}
	return append(values, value)
}
