package resale

import (
	"context"
	"strconv"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/availabilityevents"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountlisting"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountlistingrelease"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountreservation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/mediafile"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/moneytransfer"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// ListingInput explicitly confirms review of public content and images before publication.
type ListingInput struct {
	Version        int     `json:"version"`
	Product        Product `json:"product"`
	PublicReviewed bool    `json:"public_reviewed"`
}

// ListingView is a private editing projection; publication uses PublicListing instead.
// Seller provenance is empty for PLAYORA-created listings.
type ListingView struct {
	ID           string  `json:"id"`
	SubmissionID string  `json:"submission_id"`
	OfferID      string  `json:"offer_id"`
	Origin       string  `json:"origin"`
	Ownership    string  `json:"ownership"`
	Version      int     `json:"version"`
	State        string  `json:"state"`
	Game         string  `json:"game"`
	Slug         string  `json:"slug"`
	Draft        Product `json:"draft"`
	ReleaseID    string  `json:"release_id"`
	// SellerPayoutConfirmed is set only for buy-first rows: PLAYORA owns the
	// account by agreement, but resale waits for the confirmed purchase payment.
	SellerPayoutConfirmed *bool `json:"seller_payout_confirmed,omitempty"`
	// Blockers are listing-scoped readiness facts for PLAYORA-created rows,
	// which have no seller selling progress.
	Blockers []string `json:"blockers,omitempty"`
}

func listingView(row *ent.AccountListing) (ListingView, error) {
	data, err := decode[Product](row.Draft)
	if data.Attributes == nil {
		data.Attributes = []Attribute{}
	}
	if data.MediaIDs == nil {
		data.MediaIDs = []string{}
	}
	value := func(v *string) string {
		if v == nil {
			return ""
		}
		return *v
	}
	return ListingView{ID: row.ID, SubmissionID: value(row.SubmissionID), OfferID: value(row.OfferID), Origin: string(row.Origin), Ownership: Ownership(row.Origin),
		Version: row.Version, State: row.State, Game: row.GameName, Slug: row.Slug, Draft: data, ReleaseID: row.CurrentRelease}, err
}

// CreateListing permits one reviewed inventory unit per accepted seller submission.
func (s *Store) CreateListing(ctx context.Context, p *identity.Principal, offerID string) (ListingView, error) {
	if !validID(offerID) {
		return ListingView{}, ErrInvalid
	}
	var result ListingView
	err := s.auth.AuthorizedTransaction(ctx, p, "admin", true, func(tx *ent.Tx, current *identity.Principal) error {
		offer, e := tx.SellerOffer.Get(ctx, offerID)
		if e != nil {
			return e
		}
		if offer.State != "accepted" {
			return ErrConflict
		}
		old, e := tx.AccountListing.Query().Where(accountlisting.SubmissionIDEQ(offer.SubmissionID)).Only(ctx)
		if e == nil {
			result, e = listingView(old)
			return e
		}
		if !ent.IsNotFound(e) {
			return e
		}
		parent, e := tx.AccountSubmission.Get(ctx, offer.SubmissionID)
		if e != nil {
			return e
		}
		terms, e := decode[SellerTerms](offer.Data)
		if e != nil {
			return e
		}
		origin := accountlisting.Origin(terms.Model)
		if origin != accountlisting.OriginBuyFirst && origin != accountlisting.OriginConsignment {
			return ErrConflict
		}
		row, e := tx.AccountListing.Create().SetSubmissionID(parent.ID).SetOfferID(offer.ID).SetSellerID(offer.SellerID).SetOrigin(origin).SetGameID(parent.GameID).SetGameName(parent.GameName).SetSlug(parent.Slug).SetDraft(initialListing(offer.Data)).SetCreatedAt(s.instant()).SetUpdatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		if e = s.audit(ctx, tx, current, "inventory_created", row.ID); e != nil {
			return e
		}
		result, e = listingView(row)
		return e
	})
	return result, err
}
func (s *Store) reviewedImages(ctx context.Context, tx *ent.Tx, row *ent.AccountListing, data Product) error {
	if row.Origin == accountlisting.OriginPlayora {
		return playoraImages(ctx, tx, data)
	}
	for _, id := range data.MediaIDs {
		image, err := tx.MediaFile.Get(ctx, id)
		if err != nil {
			return err
		}
		if image.State != mediafile.StateReady || image.Visibility != mediafile.VisibilityPublic || image.MessageID == nil {
			return ErrConflict
		}
		thread, err := tx.Conversation.Get(ctx, image.ConversationID)
		if err != nil {
			return err
		}
		if thread.SubmissionID == nil || row.SubmissionID == nil || *thread.SubmissionID != *row.SubmissionID {
			return identity.ErrForbidden
		}
	}
	return nil
}

// ChangeListing preserves each public release and refuses edits to reserved/sold inventory.
func (s *Store) ChangeListing(ctx context.Context, p *identity.Principal, id, action string, input ListingInput) (ListingView, error) {
	if input.Product.Attributes == nil {
		input.Product.Attributes = []Attribute{}
	}
	if input.Product.MediaIDs == nil {
		input.Product.MediaIDs = []string{}
	}
	if !validID(id) || !version(input.Version) {
		return ListingView{}, ErrInvalid
	}
	if action != "withdraw" {
		if issues := productIssues(input.Product); len(issues) > 0 {
			return ListingView{}, &catalog.Invalid{Issues: issues}
		}
	}
	var result ListingView
	err := s.auth.AuthorizedTransaction(ctx, p, "admin", true, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.AccountListing.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Version != input.Version || row.State == "reserved" || row.State == "sold" {
			return ErrConflict
		}
		active, e := tx.AccountReservation.Query().Where(accountreservation.ActiveListingIDEQ(id)).Exist(ctx)
		if e != nil {
			return e
		}
		if active {
			return ErrConflict
		}
		// PLAYORA-created inventory has no seller agreement; seller rows still
		// require their accepted offer on every change.
		var offer *ent.SellerOffer
		var offerData map[string]any
		if row.Origin != accountlisting.OriginPlayora {
			if row.OfferID == nil {
				return ErrConflict
			}
			offer, e = tx.SellerOffer.Get(ctx, *row.OfferID)
			if e != nil {
				return e
			}
			if offer.State != "accepted" {
				return ErrConflict
			}
			offerData = offer.Data
		}
		update := tx.AccountListing.UpdateOneID(id).AddVersion(1).SetUpdatedAt(s.instant())
		switch action {
		case "save", "publish":
			if err := listingCommission(input.Product, offerData); err != nil {
				return err
			}
			data, dataErr := document(input.Product)
			if dataErr != nil {
				return dataErr
			}
			update.SetDraft(data)
			if action == "publish" {
				game, gameErr := tx.Game.Get(ctx, row.GameID)
				if gameErr != nil {
					return gameErr
				}
				available, gameErr := catalog.GameAvailable(ctx, tx.Client(), game, "accounts")
				if gameErr != nil {
					return gameErr
				}
				if !available {
					return ErrGameUnavailable
				}
				if row.Origin == accountlisting.OriginBuyFirst {
					paid, paidErr := tx.MoneyTransfer.Query().Where(moneytransfer.SellerOfferIDEQ(offer.ID), moneytransfer.KindEQ("seller_payout"), moneytransfer.StateEQ("confirmed")).Exist(ctx)
					if paidErr != nil {
						return paidErr
					}
					if !paid {
						return ErrConflict
					}
				}
				if len(input.Product.MediaIDs) > 0 && input.Product.CoverMediaID == "" {
					return &catalog.Invalid{Issues: []catalog.Issue{{Path: "product.cover_media_id", Message: "Choose a title image from the reviewed public images before publishing."}}}
				}
				if !input.PublicReviewed {
					return ErrInvalid
				}
				if e = s.reviewedImages(ctx, tx, row, input.Product); e != nil {
					return e
				}
				release, releaseErr := tx.AccountListingRelease.Create().SetListingID(id).SetVersion(row.Version + 1).SetData(data).SetCreatedBy(current.User.ID).SetCreatedAt(s.instant()).Save(ctx)
				if releaseErr != nil {
					return releaseErr
				}
				amount, amountErr := strconv.ParseInt(input.Product.AmountMinor, 10, 64)
				if amountErr != nil {
					return ErrInvalid
				}
				update.SetState("published").SetCurrentRelease(release.ID).SetPublicTitle(input.Product.Title).SetPublicRegion(input.Product.Region).SetPublicRank(input.Product.Rank).SetPublicCurrency(input.Product.Currency).SetPublicAmountMinor(amount)
			}
		case "withdraw":
			update.SetState("withdrawn")
		default:
			return ErrInvalid
		}
		row, e = update.Save(ctx)
		if e != nil {
			return e
		}
		if e = availabilityevents.Changed(ctx, tx, row.GameID); e != nil {
			return e
		}
		if e = s.audit(ctx, tx, current, "listing_"+action, id); e != nil {
			return e
		}
		result, e = s.detailView(ctx, tx, row)
		return e
	})
	return result, err
}

// detailView is the one staff editing projection returned by reads and writes.
func (s *Store) detailView(ctx context.Context, tx *ent.Tx, row *ent.AccountListing) (ListingView, error) {
	result, err := listingView(row)
	if err != nil {
		return result, err
	}
	views := []ListingView{result}
	if err = payoutFacts(ctx, tx, []*ent.AccountListing{row}, views); err != nil {
		return result, err
	}
	result = views[0]
	if row.Origin == accountlisting.OriginPlayora {
		result.Blockers, err = s.playoraBlockers(ctx, tx, row)
	}
	return result, err
}

// Listing reads only the staff editing projection inside live authorization.
func (s *Store) Listing(ctx context.Context, p *identity.Principal, id string) (ListingView, error) {
	var result ListingView
	if !validID(id) {
		return result, ErrInvalid
	}
	err := s.auth.AuthorizedTransaction(ctx, p, "admin", false, func(tx *ent.Tx, _ *identity.Principal) error {
		row, e := tx.AccountListing.Get(ctx, id)
		if e != nil {
			return e
		}
		result, e = s.detailView(ctx, tx, row)
		return e
	})
	return result, err
}

// InventoryFilter narrows the administrative inventory by ownership or exact origin and state.
type InventoryFilter struct {
	After, State, Ownership, Origin string
}

// InventoryCounts are per-ownership totals for the current state filter, never page counts.
type InventoryCounts struct {
	Playora int `json:"playora"`
	Seller  int `json:"seller"`
}

// Inventory provides a bounded administrative inventory cursor.
func (s *Store) Inventory(ctx context.Context, p *identity.Principal, filter InventoryFilter) ([]ListingView, string, InventoryCounts, error) {
	result := []ListingView{}
	next := ""
	counts := InventoryCounts{}
	origins, ok := inventoryOrigins(filter.Ownership, filter.Origin)
	if filter.After != "" && !validID(filter.After) || len(filter.State) > 32 || !ok {
		return result, next, counts, ErrInvalid
	}
	err := s.auth.AuthorizedTransaction(ctx, p, "admin", false, func(tx *ent.Tx, _ *identity.Principal) error {
		query := tx.AccountListing.Query().Order(ent.Asc(accountlisting.FieldID)).Limit(51)
		if filter.After != "" {
			query.Where(accountlisting.IDGT(filter.After))
		}
		if filter.State != "" {
			query.Where(accountlisting.StateEQ(filter.State))
		}
		if len(origins) > 0 {
			query.Where(accountlisting.OriginIn(origins...))
		}
		rows, e := query.All(ctx)
		if e != nil {
			return e
		}
		if len(rows) > 50 {
			next = rows[49].ID
			rows = rows[:50]
		}
		result = []ListingView{}
		for _, row := range rows {
			v, viewErr := listingView(row)
			if viewErr != nil {
				return viewErr
			}
			result = append(result, v)
		}
		if e = payoutFacts(ctx, tx, rows, result); e != nil {
			return e
		}
		counts, e = inventoryCounts(ctx, tx, filter.State)
		return e
	})
	return result, next, counts, err
}

// PublicListing never exposes submission/seller/offer IDs or private media references.
type PublicListing struct {
	ID        string   `json:"id"`
	ReleaseID string   `json:"release_id"`
	Game      string   `json:"game"`
	Slug      string   `json:"slug"`
	State     string   `json:"state"`
	Product   Product  `json:"product"`
	Images    []string `json:"images"`
}

func publicListing(ctx context.Context, client *ent.Client, row *ent.AccountListing) (PublicListing, error) {
	release, err := client.AccountListingRelease.Query().Where(accountlistingrelease.IDEQ(row.CurrentRelease), accountlistingrelease.ListingIDEQ(row.ID)).Only(ctx)
	if err != nil {
		return PublicListing{}, err
	}
	data, err := decode[Product](release.Data)
	if err != nil {
		return PublicListing{}, err
	}
	images := []string{}
	for i, id := range data.MediaIDs {
		path := "/api/v1/accounts/" + row.ID + "/images/" + strconv.Itoa(i) + "?release=" + release.ID
		if id == data.CoverMediaID {
			images = append([]string{path}, images...)
		} else {
			images = append(images, path)
		}
	}
	data.MediaIDs = []string{}
	data.CoverMediaID = "" // Private media IDs never leave the reviewed public projection.
	state := row.State
	if state == "published" {
		game, e := client.Game.Get(ctx, row.GameID)
		if e != nil {
			return PublicListing{}, e
		}
		available, e := catalog.GameAvailable(ctx, client, game, "accounts")
		if e != nil {
			return PublicListing{}, e
		}
		if !available {
			state = "unavailable"
		}
	}
	return PublicListing{row.ID, release.ID, row.GameName, row.Slug, state, data, images}, nil
}

// Published provides the same explicit public projection for available, reserved and sold items.
func (s *Store) Published(ctx context.Context, id string) (PublicListing, error) {
	if !validID(id) {
		return PublicListing{}, ErrInvalid
	}
	row, err := s.client.AccountListing.Query().Where(accountlisting.IDEQ(id), accountlisting.StateIn("published", "reserved", "sold")).Only(ctx)
	if err != nil {
		return PublicListing{}, err
	}
	return publicListing(ctx, s.client, row)
}

// Browse preserves the original public ID-cursor interface for existing callers.
func (s *Store) Browse(ctx context.Context, after, slug, region, rank, search string) ([]PublicListing, string, error) {
	return s.BrowseFiltered(ctx, BrowseFilters{After: after, Slug: slug, Region: region, Rank: rank, Search: search})
}
