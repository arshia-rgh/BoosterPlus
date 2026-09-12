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
	"github.com/arshia-rgh/BoosterPlus/backend/ent/mediafile"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func (s *Store) listingImage(ctx context.Context, id string, slot int) (*ent.MediaFile, string, error) {
	if slot < 0 || slot >= 8 || len(id) != 36 {
		return nil, "", ErrInvalid
	}
	listing, err := s.client.AccountListing.Query().Where(accountlisting.IDEQ(id), accountlisting.StateIn("published", "reserved", "sold")).Only(ctx)
	if err != nil {
		return nil, "", err
	}
	release, err := s.client.AccountListingRelease.Get(ctx, listing.CurrentRelease)
	if err != nil {
		return nil, "", err
	}
	if release.ListingID != id {
		return nil, "", ErrConflict
	}
	raw, err := json.Marshal(release.Data)
	if err != nil {
		return nil, "", err
	}
	var content struct {
		MediaIDs []string `json:"media_ids"`
	}
	if err = json.Unmarshal(raw, &content); err != nil {
		return nil, "", err
	}
	if slot >= len(content.MediaIDs) {
		return nil, "", &ent.NotFoundError{}
	}
	image, err := s.client.MediaFile.Query().Where(mediafile.IDEQ(content.MediaIDs[slot]), mediafile.StateEQ(mediafile.StateReady), mediafile.VisibilityEQ(mediafile.VisibilityPublic), mediafile.MessageIDNotNil()).Only(ctx)
	if err != nil {
		return nil, "", err
	}
	thread, err := s.client.Conversation.Get(ctx, image.ConversationID)
	if err != nil {
		return nil, "", err
	}
	if thread.SubmissionID == nil || *thread.SubmissionID != listing.SubmissionID {
		return nil, "", ErrConflict
	}
	return image, release.ID, nil
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
	data, err := s.objects.Get(ctx, "clean/"+image.ID)
	if err != nil {
		return nil, "", err
	}
	hash := sha256.Sum256(data)
	if int64(len(data)) != image.CleanSize || hex.EncodeToString(hash[:]) != image.CleanChecksum {
		return nil, "", ErrInvalid
	}
	current, currentRelease, err := s.listingImage(ctx, id, slot)
	if err != nil {
		return nil, "", err
	}
	if currentRelease != release || current.ID != image.ID || current.CleanChecksum != image.CleanChecksum {
		return nil, "", ErrConflict
	}
	return data, image.CleanContentType, nil
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
