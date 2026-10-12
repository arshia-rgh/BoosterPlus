//go:build integration

package integration

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/conversations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resale"
)

func TestResalePublicationRequiresSanitizedReviewedSubmissionImages(t *testing.T) {
	f := resaleDB(t, "consignment")
	ctx := t.Context()
	submission, err := f.intake.intake.Get(ctx, f.base.other, f.offer.SubmissionID, false)
	if err != nil {
		t.Fatal(err)
	}
	objects := mediaObjects(t, f.base.auth.client)
	files := media.New(f.base.auth.client, f.base.auth.service, objects, media.Clamd{Network: "tcp", Address: "127.0.0.1:13310"})
	data := imageBytes(t)
	file, err := files.Create(ctx, f.base.other, false, mediaIntent(submission.ConversationID, "public", data))
	if err != nil {
		t.Fatal(err)
	}
	if err = files.Upload(ctx, f.base.other, file.ID, false, data); err != nil {
		t.Fatal(err)
	}
	if _, err = files.Finalize(ctx, f.base.other, file.ID, false); err != nil {
		t.Fatal(err)
	}
	scanJob(t, files, file.ID)
	second, err := files.Create(ctx, f.base.other, false, mediaIntent(submission.ConversationID, "public", data))
	if err != nil {
		t.Fatal(err)
	}
	if err = files.Upload(ctx, f.base.other, second.ID, false, data); err != nil {
		t.Fatal(err)
	}
	if _, err = files.Finalize(ctx, f.base.other, second.ID, false); err != nil {
		t.Fatal(err)
	}
	scanJob(t, files, second.ID)

	product := resaleProduct()
	product.MediaIDs = []string{file.ID, second.ID}
	product.CoverMediaID = second.ID
	input := resale.ListingInput{Version: f.listing.Version, Product: product, PublicReviewed: true}
	if _, err = f.resale.ChangeListing(ctx, f.base.admin, f.listing.ID, "publish", input); err == nil {
		t.Fatal("unbound private draft image published")
	}
	chat := supportStore(f.base)
	if _, err = chat.Send(ctx, f.base.other, submission.ConversationID, false, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Synthetic screenshot cleared for public review.", Visibility: "public", Attachments: []string{file.ID, second.ID}}); err != nil {
		t.Fatal(err)
	}
	input.PublicReviewed = false
	if _, err = f.resale.ChangeListing(ctx, f.base.admin, f.listing.ID, "publish", input); err == nil {
		t.Fatal("image published without explicit public review")
	}
	input.PublicReviewed = true
	input.Product.CoverMediaID = ""
	if _, err = f.resale.ChangeListing(ctx, f.base.admin, f.listing.ID, "publish", input); err == nil {
		t.Fatal("implicit cover published without staff choice")
	}
	input.Product.CoverMediaID = second.ID
	f.listing, err = f.resale.ChangeListing(ctx, f.base.admin, f.listing.ID, "publish", input)
	if err != nil {
		t.Fatal(err)
	}
	listing, err := f.resale.Published(ctx, f.listing.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(listing.Images) != 2 || !strings.Contains(listing.Images[0], "/images/1?") || !strings.Contains(listing.Images[1], "/images/0?") {
		t.Fatal("explicit cover does not lead the public gallery")
	}
	public, err := json.Marshal(listing)
	if err != nil {
		t.Fatal(err)
	}
	for _, private := range []string{file.ID, second.ID, f.offer.ID, f.offer.SubmissionID, f.base.other.User.ID, "seller-origin"} {
		if bytes.Contains(public, []byte(private)) {
			t.Fatal("private identifier in public listing")
		}
	}
	clean, kind, err := files.ListingImageContent(ctx, f.listing.ID, 0, f.listing.ReleaseID)
	if err != nil || kind != "image/png" || bytes.Contains(clean, []byte("metadata")) {
		t.Fatal("unsanitized public image", err)
	}
	if _, _, err = files.ListingImageContent(ctx, f.listing.ID, 2, f.listing.ReleaseID); err == nil {
		t.Fatal("unpublished image slot available")
	}
	if _, _, err = files.ListingImageContent(ctx, f.listing.ID, 0, uuid.NewString()); err == nil {
		t.Fatal("image served for a different accepted release")
	}
	if err = objects.Put(ctx, "clean/"+file.ID, []byte("changed object after scan"), "image/png"); err != nil {
		t.Fatal(err)
	}
	if _, _, err = files.ListingImageContent(ctx, f.listing.ID, 0, f.listing.ReleaseID); err == nil {
		t.Fatal("tampered clean object served")
	}
	if err = objects.Put(ctx, "clean/"+file.ID, clean, "image/png"); err != nil {
		t.Fatal(err)
	}
	if _, err = f.resale.ChangeListing(ctx, f.base.admin, f.listing.ID, "withdraw", resale.ListingInput{Version: f.listing.Version}); err != nil {
		t.Fatal(err)
	}
	if _, _, err = files.ListingImageContent(ctx, f.listing.ID, 0, f.listing.ReleaseID); err == nil {
		t.Fatal("withdrawn private inventory image remained public")
	}
}
