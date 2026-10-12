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
type ListingView struct {
	ID           string  `json:"id"`
	SubmissionID string  `json:"submission_id"`
	OfferID      string  `json:"offer_id"`
	Version      int     `json:"version"`
	State        string  `json:"state"`
	Game         string  `json:"game"`
	Slug         string  `json:"slug"`
	Draft        Product `json:"draft"`
	ReleaseID    string  `json:"release_id"`
}

func listingView(row *ent.AccountListing) (ListingView, error) {
	data, err := decode[Product](row.Draft)
	if data.Attributes == nil {
		data.Attributes = []Attribute{}
	}
	if data.MediaIDs == nil {
		data.MediaIDs = []string{}
	}
	return ListingView{row.ID, row.SubmissionID, row.OfferID, row.Version, row.State, row.GameName, row.Slug, data, row.CurrentRelease}, err
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
		if offer.State != "accepted" || offer.ControlVerifiedAt == nil {
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
		row, e := tx.AccountListing.Create().SetSubmissionID(parent.ID).SetOfferID(offer.ID).SetSellerID(offer.SellerID).SetGameID(parent.GameID).SetGameName(parent.GameName).SetSlug(parent.Slug).SetDraft(map[string]any{}).SetCreatedAt(s.instant()).SetUpdatedAt(s.instant()).Save(ctx)
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
		if thread.SubmissionID == nil || *thread.SubmissionID != row.SubmissionID {
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
	if action != "withdraw" && validateProduct(input.Product) != nil {
		return ListingView{}, ErrInvalid
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
		offer, e := tx.SellerOffer.Get(ctx, row.OfferID)
		if e != nil {
			return e
		}
		if offer.State != "accepted" || offer.ControlVerifiedAt == nil {
			return ErrConflict
		}
		update := tx.AccountListing.UpdateOneID(id).AddVersion(1).SetUpdatedAt(s.instant())
		switch action {
		case "save", "publish":
			data, dataErr := document(input.Product)
			if dataErr != nil {
				return dataErr
			}
			update.SetDraft(data)
			if action == "publish" {
				terms, termsErr := decode[SellerTerms](offer.Data)
				if termsErr != nil {
					return termsErr
				}
				if terms.Model == "buy_first" {
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
		result, e = listingView(row)
		return e
	})
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
		result, e = listingView(row)
		return e
	})
	return result, err
}

// Inventory provides a bounded administrative inventory cursor.
func (s *Store) Inventory(ctx context.Context, p *identity.Principal, after, state string) ([]ListingView, string, error) {
	result := []ListingView{}
	next := ""
	if after != "" && !validID(after) || len(state) > 32 {
		return result, next, ErrInvalid
	}
	err := s.auth.AuthorizedTransaction(ctx, p, "admin", false, func(tx *ent.Tx, _ *identity.Principal) error {
		query := tx.AccountListing.Query().Order(ent.Asc(accountlisting.FieldID)).Limit(51)
		if after != "" {
			query.Where(accountlisting.IDGT(after))
		}
		if state != "" {
			query.Where(accountlisting.StateEQ(state))
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
			v, e := listingView(row)
			if e != nil {
				return e
			}
			result = append(result, v)
		}
		return nil
	})
	return result, next, err
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
