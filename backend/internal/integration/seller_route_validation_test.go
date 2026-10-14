//go:build integration

package integration

import (
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resale"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/submissions"
)

func TestSellerOfferRouteValidationAndRetry(t *testing.T) {
	f := resaleDB(t, "consignment")
	ctx := t.Context()
	f.intake.input.RequestKey = uuid.NewString()
	v := f.intake.submit(t, f.intake.createSubmission(t))
	v, err := f.intake.intake.Transition(ctx, f.base.admin, v.Submission.ID, true, "approve_review", submissions.Action{Version: v.Submission.Version, Note: "Synthetic review for payout-route regression."})
	if err != nil {
		t.Fatal(err)
	}
	input := resale.OfferInput{RequestKey: uuid.NewString(), SubmissionVersion: v.Submission.Version, Terms: resaleTerms("consignment"), ExpiresAt: time.Unix(f.base.auth.clock.Load(), 0).Add(time.Hour)}
	input.Terms.Currency = "usdt"
	_, err = f.resale.ProposeOffer(ctx, f.base.admin, v.Submission.ID, input)
	var invalid *catalog.Invalid
	if !errors.As(err, &invalid) || len(invalid.Issues) != 1 || invalid.Issues[0].Path != "terms.currency" {
		t.Fatal("unsupported route did not return a field-specific error", err)
	}
	if _, err = f.base.auth.client.SellerOffer.Get(ctx, input.RequestKey); !ent.IsNotFound(err) {
		t.Fatal("rejected proposal persisted an offer", err)
	}
	input.Terms.Currency = "usdttrc20"
	created, err := f.resale.ProposeOffer(ctx, f.base.admin, v.Submission.ID, input)
	if err != nil {
		t.Fatal("corrected published route was rejected", err)
	}
	replayed, err := f.resale.ProposeOffer(ctx, f.base.admin, v.Submission.ID, input)
	if err != nil || replayed.ID != created.ID || replayed.Terms.Amount != input.Terms.Amount {
		t.Fatal("retry duplicated or repriced the corrected proposal", err)
	}
}
