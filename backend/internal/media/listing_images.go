package media

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountlisting"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/artwork"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/mediafile"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// listingSource is one release-bound public image: conversation media for seller
// listings or a checked staff artwork rendition for PLAYORA-created listings.
type listingSource struct {
	id, key, checksum, contentType string
	size                           int64
}

func (s *Store) listingImage(ctx context.Context, id string, slot int) (listingSource, string, error) {
	if slot < 0 || slot >= 8 || len(id) != 36 {
		return listingSource{}, "", ErrInvalid
	}
	listing, err := s.client.AccountListing.Query().Where(accountlisting.IDEQ(id), accountlisting.StateIn("published", "reserved", "sold")).Only(ctx)
	if err != nil {
		return listingSource{}, "", err
	}
	release, err := s.client.AccountListingRelease.Get(ctx, listing.CurrentRelease)
	if err != nil {
		return listingSource{}, "", err
	}
	if release.ListingID != id {
		return listingSource{}, "", ErrConflict
	}
	raw, err := json.Marshal(release.Data)
	if err != nil {
		return listingSource{}, "", err
	}
	var content struct {
		MediaIDs []string `json:"media_ids"`
	}
	if err = json.Unmarshal(raw, &content); err != nil {
		return listingSource{}, "", err
	}
	if slot >= len(content.MediaIDs) {
		return listingSource{}, "", &ent.NotFoundError{}
	}
	if listing.Origin == accountlisting.OriginPlayora {
		source, e := s.accountArtwork(ctx, content.MediaIDs[slot])
		return source, release.ID, e
	}
	image, err := s.client.MediaFile.Query().Where(mediafile.IDEQ(content.MediaIDs[slot]), mediafile.StateEQ(mediafile.StateReady), mediafile.VisibilityEQ(mediafile.VisibilityPublic), mediafile.MessageIDNotNil()).Only(ctx)
	if err != nil {
		return listingSource{}, "", err
	}
	thread, err := s.client.Conversation.Get(ctx, image.ConversationID)
	if err != nil {
		return listingSource{}, "", err
	}
	if thread.SubmissionID == nil || listing.SubmissionID == nil || *thread.SubmissionID != *listing.SubmissionID {
		return listingSource{}, "", ErrConflict
	}
	return listingSource{image.ID, "clean/" + image.ID, image.CleanChecksum, image.CleanContentType, image.CleanSize}, release.ID, nil
}

// accountArtwork reads only ready account-purpose staff uploads; other artwork
// purposes and the public artwork route never serve these images.
func (s *Store) accountArtwork(ctx context.Context, id string) (listingSource, error) {
	row, err := s.client.Artwork.Query().Where(artwork.IDEQ(id), artwork.StateEQ("ready"), artwork.PurposeEQ("account")).Only(ctx)
	if err != nil {
		return listingSource{}, err
	}
	raw, err := json.Marshal(row.Variants)
	if err != nil {
		return listingSource{}, err
	}
	var variants map[string]struct {
		Size        int64  `json:"size"`
		Checksum    string `json:"checksum"`
		ContentType string `json:"content_type"`
	}
	if err = json.Unmarshal(raw, &variants); err != nil {
		return listingSource{}, err
	}
	wide, ok := variants["wide"]
	if !ok || (wide.ContentType != "image/jpeg" && wide.ContentType != "image/png") {
		return listingSource{}, ErrInvalid
	}
	return listingSource{row.ID, "artwork/" + row.ID + "/wide", wide.Checksum, wide.ContentType, wide.Size}, nil
}

// ListingImageContent serves only an explicitly published sanitized screenshot, never arbitrary private file IDs.
func (s *Store) ListingImageContent(ctx context.Context, id string, slot int, expectedRelease string) ([]byte, string, error) {
	image, release, err := s.listingImage(ctx, id, slot)
	if err != nil {
		return nil, "", err
	}
	if expectedRelease != release {
		return nil, "", ErrConflict
	}
	data, err := s.objects.Get(ctx, image.key)
	if err != nil {
		return nil, "", err
	}
	hash := sha256.Sum256(data)
	if int64(len(data)) != image.size || hex.EncodeToString(hash[:]) != image.checksum {
		return nil, "", ErrInvalid
	}
	current, currentRelease, err := s.listingImage(ctx, id, slot)
	if err != nil {
		return nil, "", err
	}
	if currentRelease != release || current != image {
		return nil, "", ErrConflict
	}
	return data, image.contentType, nil
}
func (s *Store) registerListingImages(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/accounts/{id}/images/{slot}", s.auth.ProtectRate("", "listing-images", 1800, time.Hour, problem(func(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
		slot, err := strconv.Atoi(r.PathValue("slot"))
		if err != nil {
			return ErrInvalid
		}
		data, kind, err := s.ListingImageContent(r.Context(), r.PathValue("id"), slot, r.URL.Query().Get("release"))
		if err != nil {
			return err
		}
		w.Header().Set("Content-Type", kind)
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Content-Disposition", `inline; filename="account-image"`)
		w.Header().Set("Content-Security-Policy", "default-src 'none'; sandbox")
		_, err = w.Write(data)
		return err
	})))
}
