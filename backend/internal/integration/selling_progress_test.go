//go:build integration

package integration

import (
	"errors"
	"slices"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resale"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/submissions"
)

func TestSellingProgressAcceptedDraftAndSecureHandover(t *testing.T) {
	f := resaleDraftDB(t, "consignment", false)
	ctx := t.Context()
	progress, err := f.resale.Progress(ctx, f.base.other, f.offer.SubmissionID, false)
	if err != nil || progress.Handover.State != "missing" || progress.ListingState != "draft" || !slices.Contains(progress.Blockers, "handover") || !slices.Contains(progress.Blockers, "listing_details") {
		t.Fatal("missing actionable draft status", progress, err)
	}
	if _, err = f.resale.Progress(ctx, f.base.buyer, f.offer.SubmissionID, false); !ent.IsNotFound(err) {
		t.Fatal("foreign seller progress", err)
	}
	if _, err = f.resale.Progress(ctx, f.base.other, f.offer.SubmissionID, true); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("seller used staff progress", err)
	}
	if _, err = f.resale.ChangeOffer(ctx, f.base.admin, f.offer.ID, "verify_control", true, resale.OfferChange{Version: f.offer.Version, Note: "No ownership verification is required.", Accept: true}); !errors.Is(err, resale.ErrInvalid) {
		t.Fatal("obsolete verification still active", err)
	}
	if _, err = f.resale.ChangeListing(ctx, f.base.admin, f.listing.ID, "publish", resale.ListingInput{Version: f.listing.Version, Product: resaleProduct(), PublicReviewed: true}); !errors.Is(err, resale.ErrConflict) {
		t.Fatal("published without handover", err)
	}
	now := time.Unix(f.base.auth.clock.Load(), 0)
	if _, err = f.resale.SubmitSellerSecret(ctx, f.base.other, f.offer.ID, resale.SecretInput{RequestKey: uuid.NewString(), Value: []byte("isolated account handover"), ExpiresAt: now.Add(time.Hour)}); err != nil {
		t.Fatal(err)
	}
	progress, err = f.resale.Progress(ctx, f.base.admin, f.offer.SubmissionID, true)
	if err != nil || progress.Handover.State != "received" || progress.Handover.Locked || slices.Contains(progress.Blockers, "handover") {
		t.Fatal("handover receipt missing", progress, err)
	}
	row, err := f.base.auth.client.SellerOffer.Get(ctx, f.offer.ID)
	if err != nil || row.ControlVerifiedAt != nil {
		t.Fatal("fabricated ownership verification", err)
	}
	product := resaleProduct()
	product.MediaIDs = []string{uuid.NewString()}
	product.CoverMediaID = product.MediaIDs[0]
	draft, err := f.resale.ChangeListing(ctx, f.base.admin, f.listing.ID, "save", resale.ListingInput{Version: f.listing.Version, Product: product})
	if err != nil {
		t.Fatal(err)
	}
	f.listing = draft
	progress, err = f.resale.Progress(ctx, f.base.other, f.offer.SubmissionID, false)
	if err != nil || !slices.Contains(progress.Blockers, "listing_images") {
		t.Fatal("unreviewed image not identified", progress, err)
	}
	if _, err = f.resale.ChangeListing(ctx, f.base.admin, f.listing.ID, "publish", resale.ListingInput{Version: f.listing.Version, Product: product, PublicReviewed: true}); err == nil {
		t.Fatal("nonexistent image published")
	}
	f.publish(t)
	progress, err = f.resale.Progress(ctx, f.base.other, f.offer.SubmissionID, false)
	if err != nil || progress.ListingState != "published" || len(progress.Blockers) != 0 || !progress.Handover.Locked {
		t.Fatal("published status incorrect", progress, err)
	}
	// Vault retention must not silently erase a recorded handover for active stock.
	if _, err = f.base.auth.client.SecretBundle.Update().Where(secretbundle.ResourceIDEQ(f.offer.ID)).SetExpiresAt(now.Add(-time.Hour)).Save(ctx); err != nil {
		t.Fatal(err)
	}
	progress, err = f.resale.Progress(ctx, f.base.other, f.offer.SubmissionID, false)
	if err != nil || progress.Handover.State != "received" {
		t.Fatal("active receipt lost", err)
	}
	paused, err := f.base.catalog.Mutate(ctx, f.base.admin, f.intake.game.ID, "pause", catalog.Change{Revision: f.intake.game.Revision})
	if err != nil {
		t.Fatal(err)
	}
	progress, err = f.resale.Progress(ctx, f.base.other, f.offer.SubmissionID, false)
	if err != nil || progress.ListingState != "unavailable" || !slices.Contains(progress.Blockers, "game_unavailable") {
		t.Fatal("paused game presented as live", progress, err)
	}
	if _, err = f.base.catalog.Mutate(ctx, f.base.admin, paused.ID, "resume", catalog.Change{Revision: paused.Revision}); err != nil {
		t.Fatal(err)
	}
	f.reserve(t)
	progress, err = f.resale.Progress(ctx, f.base.other, f.offer.SubmissionID, false)
	if err != nil || progress.ListingState != "reserved" {
		t.Fatal("reservation status missing", progress, err)
	}
}

func TestSellingProgressExpiredHandoverAndBuyFirstPayout(t *testing.T) {
	f := resaleDB(t, "buy_first")
	ctx := t.Context()
	now := time.Unix(f.base.auth.clock.Load(), 0)
	if _, err := f.base.auth.client.SecretBundle.Update().Where(secretbundle.ResourceIDEQ(f.offer.ID)).SetExpiresAt(now.Add(-time.Minute)).Save(ctx); err != nil {
		t.Fatal(err)
	}
	progress, err := f.resale.Progress(ctx, f.base.other, f.offer.SubmissionID, false)
	if err != nil || progress.Handover.State != "expired" || !slices.Contains(progress.Blockers, "seller_payment") {
		t.Fatal("expired/payment blockers missing", progress, err)
	}
	transfer := manualObligation(t, f, true)
	if _, err = f.store.RecordManualSellerPayout(ctx, f.base.admin, transfer.ID, manualInput(f, transfer)); err == nil {
		t.Fatal("expired handover allowed purchase payout")
	}
	if _, err = f.resale.SubmitSellerSecret(ctx, f.base.other, f.offer.ID, resale.SecretInput{Version: 1, RequestKey: uuid.NewString(), Value: []byte("renewed isolated access"), ExpiresAt: now.Add(time.Hour)}); err != nil {
		t.Fatal(err)
	}
	if _, err = f.store.RecordManualSellerPayout(ctx, f.base.admin, transfer.ID, manualInput(f, transfer)); err != nil {
		t.Fatal("manual payout after handover", err)
	}
	progress, err = f.resale.Progress(ctx, f.base.other, f.offer.SubmissionID, false)
	if err != nil || progress.PayoutState != "confirmed" || !progress.Handover.Locked || slices.Contains(progress.Blockers, "seller_payment") {
		t.Fatal("confirmed payout not reflected", progress, err)
	}
	if _, err = f.resale.SubmitSellerSecret(ctx, f.base.other, f.offer.ID, resale.SecretInput{Version: 2, RequestKey: uuid.NewString(), Value: []byte("changed after purchase"), ExpiresAt: now.Add(time.Hour)}); err == nil {
		t.Fatal("paid account access silently replaced")
	}
	f.publish(t)
}

func TestSellingProgressHistoricalHandoverAndReturnedAccount(t *testing.T) {
	f := resaleDB(t, "consignment")
	ctx := t.Context()
	now := time.Unix(f.base.auth.clock.Load(), 0)
	legacy := now.Add(-time.Hour)
	if _, err := f.base.auth.client.SellerOffer.UpdateOneID(f.offer.ID).SetControlVerifiedAt(legacy).Save(ctx); err != nil {
		t.Fatal(err)
	}
	progress, err := f.resale.Progress(ctx, f.base.admin, f.offer.SubmissionID, true)
	if err != nil || progress.Handover.ReceivedAt == nil || !progress.Handover.ReceivedAt.Equal(legacy) {
		t.Fatal("historical timing rewritten", err)
	}
	f.publish(t)
	order := f.reserve(t)
	// Mirror the recorded return marker; production return is separately covered by resale tests.
	reservation, err := f.base.auth.client.AccountReservation.Query().Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.base.auth.client.AccountReservation.UpdateOneID(reservation.ID).SetState("cancelled").ClearActiveListingID().SetUpdatedAt(now.Add(time.Second)).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.base.auth.client.AccountListing.UpdateOneID(f.listing.ID).SetState("withdrawn").Save(ctx); err != nil {
		t.Fatal(err)
	}
	progress, err = f.resale.Progress(ctx, f.base.other, f.offer.SubmissionID, false)
	if err != nil || progress.Handover.State != "refresh_required" || progress.Handover.Locked {
		t.Fatal("old returned account receipt reused", progress, err)
	}
	f.base.auth.clock.Add(2)
	if _, err = f.resale.SubmitSellerSecret(ctx, f.base.other, f.offer.ID, resale.SecretInput{Version: 1, RequestKey: uuid.NewString(), Value: []byte("new access after return"), ExpiresAt: now.Add(time.Hour)}); err != nil {
		t.Fatal(err)
	}
	progress, err = f.resale.Progress(ctx, f.base.other, f.offer.SubmissionID, false)
	if err != nil || progress.Handover.State != "received" {
		t.Fatal("new return handover rejected", progress, err)
	}
	if order.Order.ID == "" {
		t.Fatal("missing reservation order")
	}
}

func TestSellerSubmissionOptionalNotesStillRequiresAuthority(t *testing.T) {
	f := submissionDB(t)
	ctx := t.Context()
	v := f.createSubmission(t)
	input := submissionEdit(v)
	input.OwnershipNotes = ""
	input.OwnershipDeclared = true
	v, err := f.intake.Edit(ctx, f.buyer, v.Submission.ID, input)
	if err != nil {
		t.Fatal(err)
	}
	v, err = f.intake.Transition(ctx, f.buyer, v.Submission.ID, false, "submit", submissions.Action{Version: v.Submission.Version})
	if err != nil || v.Submission.State != "submitted" {
		t.Fatal("optional notes blocked completed intake", err)
	}
}
