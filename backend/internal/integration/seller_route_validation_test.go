//go:build integration

package integration

import (
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authmessage"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
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

func TestAdministratorSellerProposalRetainsVerificationAndPayoutLimits(t *testing.T) {
	f := resaleDB(t, "consignment")
	ctx := t.Context()
	f.intake.input.RequestKey = uuid.NewString()
	v := f.intake.submit(t, f.intake.createSubmission(t))
	v, err := f.intake.intake.Transition(ctx, f.base.admin, v.Submission.ID, true, "approve_review", submissions.Action{Version: v.Submission.Version, Note: "Synthetic review for administrator proposal."})
	if err != nil {
		t.Fatal(err)
	}
	admin := proposalAdministrator(t, f)
	input := resale.OfferInput{RequestKey: uuid.NewString(), SubmissionVersion: v.Submission.Version, Terms: resaleTerms("consignment"), ExpiresAt: time.Unix(f.base.auth.clock.Load(), 0).Add(time.Hour)}
	if _, err = f.resale.ProposeOffer(ctx, admin, v.Submission.ID, input); !errors.Is(err, identity.ErrMFA) {
		t.Fatal("pending staff MFA accepted", err)
	}
	_, _, admin = f.base.auth.enroll(t, admin)
	if _, err = f.resale.ProposeOffer(ctx, f.base.buyer, v.Submission.ID, input); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer proposal accepted", err)
	}
	created, err := f.resale.ProposeOffer(ctx, admin, v.Submission.ID, input)
	if err != nil {
		t.Fatal("administrator proposal rejected", err)
	}
	replay, err := f.resale.ProposeOffer(ctx, admin, v.Submission.ID, input)
	if err != nil || replay.ID != created.ID {
		t.Fatal("administrator idempotency", err)
	}
	if err = identity.Require(admin, "owner"); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("proposal expanded owner controls", err)
	}
	f.base.auth.clock.Add(601)
	if _, err = f.resale.ProposeOffer(ctx, admin, v.Submission.ID, input); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("stale staff verification accepted", err)
	}
}

// Only deliver this login challenge: resale fixtures also queue commerce jobs.
func proposalAdministrator(t *testing.T, f *resaleFixture) *identity.Principal {
	t.Helper()
	ctx := t.Context()
	const email = "proposal-admin@example.test"
	if _, err := f.base.auth.client.User.Create().SetPortal(string(identity.PortalAdmin)).SetEmail(email).SetRole(identity.RoleAdmin).Save(ctx); err != nil {
		t.Fatal(err)
	}
	id, err := f.base.auth.service.RequestEmail(ctx, identity.EmailRequest{Portal: identity.PortalAdmin, Email: email, Purpose: "login", Browser: f.base.auth.browser, IP: "127.0.0.1", AcceptTerms: true})
	if err != nil {
		t.Fatal(err)
	}
	message, err := f.base.auth.client.AuthMessage.Query().Where(authmessage.ChallengeIDEQ(id)).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	sender := &recordingSender{}
	if err = f.base.auth.service.EmailHandler(sender)(ctx, jobs.Job{Payload: []byte(`{"message_id":"` + message.ID + `"}`)}); err != nil || len(sender.messages) != 1 {
		t.Fatal("missing isolated proposal challenge", err)
	}
	result, err := f.base.auth.service.VerifyEmail(ctx, id, sender.messages[0].View.Code, f.base.auth.browser, "127.0.0.1", nil, identity.PortalAdmin)
	if err != nil {
		t.Fatal(err)
	}
	return f.base.auth.principal(t, result.Token, identity.PortalAdmin)
}
