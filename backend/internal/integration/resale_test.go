//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"regexp"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authmessage"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/accountpricing"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resale"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/submissions"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

type resaleFixture struct {
	*paymentFixture
	resale  *resale.Store
	intake  *submissionFixture
	offer   resale.OfferView
	listing resale.ListingView
}

func resaleTerms(model string) resale.SellerTerms {
	price := accountpricing.Seller{Version: accountpricing.Version, BaseMinor: "1175", FeeMinor: "118", NetMinor: "1057", Rate: "1", RateSource: "synthetic fixture quote", QuotedAt: time.Now().UTC().Add(-time.Minute), NetAmount: "10.570000"}
	return resale.SellerTerms{Commission: &price, Model: model, Currency: "usdttrc20", Network: "trx", Amount: "10.570000", ProceedsBasis: "Synthetic fixed proceeds; no assumed exchange conversion.", Fees: "Synthetic amount is net of the explicitly agreed fees.", TransferRequirements: "Synthetic ownership verification before control transfer.", DisputeTerms: "Synthetic review of ownership and transfer disputes.", WithdrawalTerms: "Synthetic withdrawal requires a new mutually accepted agreement.", PayoutDelayHours: 0, PayoutDeadlineHours: 48}
}
func resaleProduct() resale.Product {
	price := accountpricing.Buyer{Version: accountpricing.Version, BaseMinor: "1175", FeeMinor: "59", TotalMinor: "1234"}
	return resale.Product{Commission: &price, Title: "Synthetic reviewed account", Description: "Synthetic public listing without private seller information.", Region: "Synthetic region", Rank: "Synthetic rank", Attributes: []resale.Attribute{}, MediaIDs: []string{}, Currency: "USD", AmountMinor: "1234", SaleTerms: "Synthetic account sale terms explicitly accepted by the buyer.", TransferRequirements: "Synthetic buyer must complete the ownership checklist.", DisputeTerms: "Synthetic buyer may dispute this handoff during the stated window.", AcknowledgementTerms: "Synthetic acknowledgement confirms access was received and tested.", DisputeHours: 168, DeliveryMinHours: 1, DeliveryMaxHours: 24}
}
func resaleDB(t *testing.T, model string) *resaleFixture {
	t.Helper()
	return resaleDraftDB(t, model, true)
}
func resaleDraftDB(t *testing.T, model string, handover bool) *resaleFixture {
	t.Helper()
	f := paymentDB(t)
	ctx := t.Context()
	if _, err := f.base.auth.client.User.UpdateOneID(f.base.admin.User.ID).SetRole(identity.RoleOwner).Save(ctx); err != nil {
		t.Fatal(err)
	}
	f.base.admin = f.base.auth.principalFromSession(t, f.base.admin)
	c := catalogConfig()
	c.Services = nil
	c.Packages = nil
	c.Intake = &catalog.IntakeForm{Name: "Synthetic account intake", Fields: []catalog.Field{{Key: "region", Label: "Region", Type: "short_text", Stage: "order", Required: true, MaxLength: 80}}, Rules: []catalog.Rule{}}
	d, err := f.base.catalog.Create(ctx, f.base.admin, "resale-accounts", c)
	if err != nil {
		t.Fatal(err)
	}
	d, err = f.base.catalog.Mutate(ctx, f.base.admin, d.ID, "publish", catalog.Change{Revision: d.Revision})
	if err != nil {
		t.Fatal(err)
	}
	base := *f.base
	base.buyer = f.base.other
	base.game = d
	now := func() time.Time { return time.Unix(base.auth.clock.Load(), 0) }
	sub := &submissionFixture{&base, submissions.New(base.auth.client, base.auth.service, now), submissions.CreateInput{RequestKey: uuid.NewString(), Slug: d.Slug, ReleaseID: d.CurrentRelease, Title: "Synthetic private account"}}
	v := sub.submit(t, sub.createSubmission(t))
	v, err = sub.intake.Transition(ctx, base.admin, v.Submission.ID, true, "approve_review", submissions.Action{Version: v.Submission.Version, Note: "Synthetic ownership intake approved for terms."})
	if err != nil {
		t.Fatal(err)
	}
	keys, err := vault.NewKeyring("v1", map[string][]byte{"v1": vaultKey(t)})
	if err != nil {
		t.Fatal(err)
	}
	store := resale.New(base.auth.client, base.auth.service, keys, now)
	offer, err := store.ProposeOffer(ctx, base.admin, v.Submission.ID, resale.OfferInput{RequestKey: uuid.NewString(), SubmissionVersion: v.Submission.Version, Terms: resaleTerms(model), ExpiresAt: now().Add(24 * time.Hour)})
	if err != nil {
		t.Fatal(err)
	}
	offer, err = store.ChangeOffer(ctx, base.buyer, offer.ID, "accept", false, resale.OfferChange{Version: offer.Version, Accept: true, Note: "I accept these exact synthetic seller terms."})
	if err != nil {
		t.Fatal(err)
	}
	if handover {
		if _, err = store.SubmitSellerSecret(ctx, base.buyer, offer.ID, resale.SecretInput{RequestKey: uuid.NewString(), Value: []byte("synthetic seller-origin credential"), ExpiresAt: now().Add(72 * time.Hour)}); err != nil {
			t.Fatal(err)
		}
	}
	listing, err := store.CreateListing(ctx, base.admin, offer.ID)
	if err != nil {
		t.Fatal(err)
	}
	return &resaleFixture{f, store, sub, offer, listing}
}
func (f *resaleFixture) publish(t *testing.T) {
	t.Helper()
	v, err := f.resale.ChangeListing(t.Context(), f.base.admin, f.listing.ID, "publish", resale.ListingInput{Version: f.listing.Version, Product: resaleProduct(), PublicReviewed: true})
	if err != nil {
		t.Fatal(err)
	}
	f.listing = v
}
func (f *resaleFixture) reserveInput() resale.ReserveInput {
	return resale.ReserveInput{RequestKey: uuid.NewString(), ReleaseID: f.listing.ReleaseID, ExpectedAmount: "1234", Currency: "USD", AcceptTerms: true, TermsVersion: f.base.auth.cfg.TermsVersion}
}
func (f *resaleFixture) reserve(t *testing.T) orders.Detail {
	t.Helper()
	v, err := f.resale.Reserve(t.Context(), f.base.buyer, f.listing.ID, f.reserveInput())
	if err != nil {
		t.Fatal(err)
	}
	return v
}

// freshBuyer delivers only this challenge; other commerce jobs remain untouched.
func (f *resaleFixture) freshBuyer(t *testing.T) {
	t.Helper()
	ctx := t.Context()
	id, err := f.base.auth.service.RequestEmail(ctx, identity.EmailRequest{Portal: identity.PortalCustomer, Email: f.base.buyer.User.Email, Purpose: "login", Browser: f.base.auth.browser, IP: "127.0.0.1", AcceptTerms: true})
	if err != nil {
		t.Fatal(err)
	}
	message, err := f.base.auth.client.AuthMessage.Query().Where(authmessage.ChallengeIDEQ(id)).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(map[string]string{"message_id": message.ID})
	if err != nil {
		t.Fatal(err)
	}
	sender := &recordingSender{}
	if err = f.base.auth.service.EmailHandler(sender)(ctx, jobs.Job{Payload: raw}); err != nil {
		t.Fatal(err)
	}
	if len(sender.messages) != 1 {
		t.Fatal("fresh challenge was not delivered")
	}
	code := regexp.MustCompile(`\b[0-9]{6}\b`).FindString(sender.messages[0].Body)
	result, err := f.base.auth.service.VerifyEmail(ctx, id, code, f.base.auth.browser, "127.0.0.1", nil, identity.PortalCustomer)
	if err != nil {
		t.Fatal(err)
	}
	f.base.buyer = f.base.auth.principal(t, result.Token)
}
func TestResalePrivateOffersAndUniqueReservations(t *testing.T) {
	f := resaleDB(t, "consignment")
	ctx := t.Context()
	f.publish(t)
	paused, err := f.base.catalog.Mutate(ctx, f.base.admin, f.intake.game.ID, "pause", catalog.Change{Revision: f.intake.game.Revision})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.resale.Reserve(ctx, f.base.buyer, f.listing.ID, f.reserveInput()); err == nil {
		t.Fatal("paused game accepted account reservation")
	}
	pausedListings, _, err := f.resale.Browse(ctx, "", "", "", "", "")
	if err != nil || len(pausedListings) != 0 {
		t.Fatal("paused game remained in available inventory", err)
	}
	if _, err = f.base.catalog.Mutate(ctx, f.base.admin, paused.ID, "resume", catalog.Change{Revision: paused.Revision}); err != nil {
		t.Fatal(err)
	}
	if _, err = f.resale.Offers(ctx, f.base.buyer, f.offer.SubmissionID, false); !ent.IsNotFound(err) {
		t.Fatal("buyer read private seller offer", err)
	}
	if _, err = f.resale.OfferHistory(ctx, f.base.buyer, f.offer.ID, false, 0); !ent.IsNotFound(err) {
		t.Fatal("buyer read private agreement history", err)
	}
	events, err := f.resale.OfferHistory(ctx, f.base.other, f.offer.ID, false, 0)
	if err != nil || len(events) != 2 || events[1].Role != "seller" {
		t.Fatal("missing agreement decision history", err)
	}
	if _, err = f.resale.OfferHistory(ctx, f.base.other, f.offer.ID, false, -1); err == nil {
		t.Fatal("invalid agreement cursor accepted")
	}
	if _, err = f.resale.RevealSellerSecret(ctx, f.base.buyer, f.offer.ID); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("buyer read seller credentials", err)
	}
	if _, err = f.resale.SubmitSellerSecret(ctx, f.base.other, f.offer.ID, resale.SecretInput{Version: 1, RequestKey: uuid.NewString(), Value: []byte("changed after publication"), ExpiresAt: time.Unix(f.base.auth.clock.Load(), 0).Add(72 * time.Hour)}); err == nil {
		t.Fatal("published account handover silently replaced")
	}
	if _, err = f.resale.Reserve(ctx, f.base.other, f.listing.ID, f.reserveInput()); err == nil {
		t.Fatal("seller bought own listing")
	}
	bad := f.reserveInput()
	bad.ExpectedAmount = "1"
	if _, err = f.resale.Reserve(ctx, f.base.buyer, f.listing.ID, bad); err == nil {
		t.Fatal("browser altered exact price")
	}
	var wins atomic.Int64
	var wg sync.WaitGroup
	for range 4 {
		wg.Go(func() {
			_, reserveErr := f.resale.Reserve(ctx, f.base.buyer, f.listing.ID, f.reserveInput())
			if reserveErr == nil {
				wins.Add(1)
			} else if !ent.IsNotFound(reserveErr) && !errors.Is(reserveErr, resale.ErrConflict) {
				t.Error(reserveErr)
			}
		})
	}
	wg.Wait()
	if wins.Load() != 1 {
		t.Fatal("unique inventory double sold", wins.Load())
	}
	if count, countErr := f.base.auth.client.PaymentAttempt.Query().Count(ctx); countErr != nil || count != 0 {
		t.Fatal("reservation issued payment", countErr)
	}
	if _, err = f.resale.ChangeListing(ctx, f.base.admin, f.listing.ID, "withdraw", resale.ListingInput{Version: f.listing.Version + 1}); err == nil {
		t.Fatal("reserved listing withdrawn")
	}
	rows, _, err := f.resale.Browse(ctx, "", "", "", "", "")
	if err != nil || len(rows) != 0 {
		t.Fatal("reserved listing remains available", err)
	}
}
func TestResaleExpiryRequiresAuthoritativeUnfundedEvidence(t *testing.T) {
	for _, mode := range []string{"unissued", "unclaimed", "ambiguous", "issued", "terminal", "funded"} {
		t.Run(mode, func(t *testing.T) {
			f := resaleDB(t, "consignment")
			f.publish(t)
			d := f.reserve(t)
			ctx := t.Context()
			var attempt payments.Attempt
			if mode != "unissued" {
				attempt = f.start(t, d)
			}
			if mode != "unissued" && mode != "unclaimed" {
				f.provider.ambiguous = mode == "ambiguous"
				f.issue(t, attempt)
			}
			if mode == "funded" {
				f.reconcile(t, f.evidence(t, attempt, "901", "confirming", "1"))
			}
			f.base.auth.clock.Add(int64(time.Hour / time.Second))
			if err := f.store.Maintain(ctx); err != nil {
				t.Fatal(err)
			}
			if mode == "terminal" {
				f.reconcile(t, f.evidence(t, attempt, "902", "expired", "0"))
				if err := f.store.Maintain(ctx); err != nil {
					t.Fatal(err)
				}
			}
			listing, err := f.base.auth.client.AccountListing.Get(ctx, f.listing.ID)
			if err != nil {
				t.Fatal(err)
			}
			want := "reserved"
			if mode == "unissued" || mode == "unclaimed" || mode == "terminal" {
				want = "published"
			}
			if listing.State != want {
				t.Fatalf("inventory=%s want=%s", listing.State, want)
			}
			if mode == "terminal" {
				f.freshBuyer(t)
				newReservation := f.reserve(t)
				record := f.reconcile(t, f.evidence(t, attempt, "902", "finished", "12.34000001"))
				if record.Issue != "retired_contract" {
					t.Fatal("late funds allocated", record.Issue)
				}
				listing, err = f.base.auth.client.AccountListing.Get(ctx, f.listing.ID)
				if err != nil || listing.State != "reserved" {
					t.Fatal("late payment changed current buyer inventory", err)
				}
				current, e := f.base.store.Get(ctx, f.base.buyer, newReservation.Order.ID, false)
				if e != nil || current.Order.State != "awaiting_payment" || current.Contract.PaymentState != "unissued" {
					t.Fatal("late funds settled another agreement", e)
				}
			}
		})
	}
}
func TestResalePaidDeliveryUsesDistinctBuyerSecret(t *testing.T) {
	f := resaleDB(t, "consignment")
	f.publish(t)
	d := f.reserve(t)
	ctx := t.Context()
	secret := func() resale.SecretInput {
		return resale.SecretInput{RequestKey: uuid.NewString(), Value: []byte("synthetic buyer-specific handoff"), ExpiresAt: time.Unix(f.base.auth.clock.Load(), 0).Add(72 * time.Hour)}
	}
	if _, err := f.resale.SubmitDeliverySecret(ctx, f.base.admin, d.Order.ID, secret()); err == nil {
		t.Fatal("unpaid buyer delivery")
	}
	a := f.start(t, d)
	f.issue(t, a)
	f.reconcile(t, f.evidence(t, a, "903", "finished", "12.34000001"))
	bundle, err := f.resale.SubmitDeliverySecret(ctx, f.base.admin, d.Order.ID, secret())
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.resale.RevealDelivery(ctx, f.base.buyer, d.Order.ID); err == nil {
		t.Fatal("undelivered credentials revealed")
	}
	v, err := f.resale.Delivery(ctx, f.base.admin, d.Order.ID, true)
	if err != nil {
		t.Fatal(err)
	}
	v, err = f.resale.ChangeDelivery(ctx, f.base.admin, d.Order.ID, "deliver", true, resale.DeliveryChange{Version: v.Version, SecretVersion: bundle.Version, Accept: true, Instructions: "Synthetic checklist for changing ownership."})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.resale.RevealDelivery(ctx, f.base.other, d.Order.ID); err == nil {
		t.Fatal("seller revealed buyer bundle")
	}
	plain, err := f.resale.RevealDelivery(ctx, f.base.buyer, d.Order.ID)
	if err != nil || string(plain) != "synthetic buyer-specific handoff" {
		t.Fatal("incorrect protected handoff", err)
	}
	clear(plain)
	_, err = f.resale.ChangeDelivery(ctx, f.base.buyer, d.Order.ID, "acknowledge", false, resale.DeliveryChange{Version: v.Version, Accept: true, Instructions: "I received and tested this synthetic ownership handoff."})
	if err != nil {
		t.Fatal(err)
	}
	serviceCase, err := f.store.OpenCase(ctx, f.base.buyer, d.Order.ID, false, payments.CaseInput{RequestKey: uuid.NewString(), Kind: "dispute", Note: "Synthetic ownership concern within the accepted dispute window."})
	if err != nil {
		t.Fatal("account completion dispute rejected", err)
	}
	if serviceCase.Policy == nil || serviceCase.Policy.DisputeHours != 168 || serviceCase.AccountTerms == nil || serviceCase.AccountTerms.Title != resaleProduct().Title {
		t.Fatal("case did not preserve accepted account terms")
	}
	if _, err = f.resale.RevealDelivery(ctx, f.base.buyer, d.Order.ID); err == nil {
		t.Fatal("case hold did not revoke reveal")
	}
	serviceCase, err = f.store.ChangeCase(ctx, f.base.admin, serviceCase.ID, "decide", true, payments.CaseChange{Version: serviceCase.Version, Outcome: "rework", Note: "Propose a fresh protected ownership handoff after review."})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.store.ChangeCase(ctx, f.base.buyer, serviceCase.ID, "accept", false, payments.CaseChange{Version: serviceCase.Version, Note: "I accept a newly verified account ownership handoff."}); err != nil {
		t.Fatal(err)
	}
	v, err = f.resale.Delivery(ctx, f.base.admin, d.Order.ID, true)
	if err != nil || v.State != "pending" || v.Secret.State != "deleted" || v.AcknowledgedAt != nil {
		t.Fatal("rework retained delivered ownership access", err)
	}
	if _, err = f.resale.RevealDelivery(ctx, f.base.buyer, d.Order.ID); err == nil {
		t.Fatal("rework exposed old credentials")
	}
	if _, err = f.resale.ChangeDelivery(ctx, f.base.buyer, d.Order.ID, "takeover", false, resale.DeliveryChange{Version: v.Version, Accept: true, Instructions: "Forged owner takeover of account handoff."}); err == nil {
		t.Fatal("buyer took over staff handoff")
	}
	v, err = f.resale.ChangeDelivery(ctx, f.base.admin, d.Order.ID, "takeover", true, resale.DeliveryChange{Version: v.Version, Accept: true, Instructions: "Owner takes responsibility for fresh handoff."})
	if err != nil || v.State != "pending" {
		t.Fatal("owner handoff recovery failed", err)
	}
	fresh := secret()
	fresh.Version = v.Secret.Version
	if _, err = f.resale.SubmitDeliverySecret(ctx, f.base.admin, d.Order.ID, fresh); err != nil {
		t.Fatal("fresh handoff after audited recovery failed", err)
	}
}
func TestResaleBuyFirstRequiresActualSellerPayment(t *testing.T) {
	f := resaleDB(t, "buy_first")
	ctx := t.Context()
	if _, err := f.resale.ChangeListing(ctx, f.base.admin, f.listing.ID, "publish", resale.ListingInput{Version: f.listing.Version, Product: resaleProduct(), PublicReviewed: true}); err == nil {
		t.Fatal("buy-first published before seller paid")
	}
	raw, err := json.Marshal(map[string]string{"offer_id": f.offer.ID})
	if err != nil {
		t.Fatal(err)
	}
	for range 2 {
		if err = f.store.SellerObligationHandler()(ctx, jobs.Job{Payload: raw}); err != nil {
			t.Fatal(err)
		}
	}
	rows, err := f.store.SellerPayouts(ctx, f.base.other, f.offer.SubmissionID, false)
	if err != nil || len(rows) != 1 {
		t.Fatal("seller debt not idempotent", err)
	}
	if rows[0].Amount != "10.570000" || rows[0].State != "recipient_pending" {
		t.Fatal("accepted exact seller obligation changed", rows[0].State)
	}
	if _, err = f.store.SellerPayouts(ctx, f.base.buyer, f.offer.SubmissionID, false); !ent.IsNotFound(err) {
		t.Fatal("buyer read seller payout", err)
	}
	if _, err = f.store.CancelRefund(ctx, f.base.admin, rows[0].ID, payments.TransferChange{Version: rows[0].Version, Reason: "Synthetic attempt to cancel seller debt."}); err == nil {
		t.Fatal("refund cancellation erased seller debt")
	}
	provider := &outgoingFixture{}
	f.store.ConfigureOutgoing(provider, true)
	value, err := f.store.ConfirmSellerRecipient(ctx, f.base.other, rows[0].ID, payments.RecipientInput{Version: rows[0].Version, Address: "synthetic-seller-destination", Accept: true})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.store.ApproveRefund(ctx, f.base.admin, value.ID, payments.TransferChange{Version: value.Version, Reason: "Wrong transfer authorization endpoint."}); err == nil {
		t.Fatal("refund endpoint approved seller obligation")
	}
	value, err = f.store.ApproveSellerPayout(ctx, f.base.admin, value.ID, payments.TransferChange{Version: value.Version, Reason: "Verified accepted obligation and seller ownership."})
	if err != nil {
		t.Fatal(err)
	}
	shared := &refundFixture{paymentFixture: f.paymentFixture, provider: provider}
	shared.issue(t, value.ID)
	shared.issue(t, value.ID)
	if provider.creates != 1 {
		t.Fatal("seller payout submitted more than once")
	}
	if provider.row.Amount != "10.570000" || provider.row.Recipient.Address != "synthetic-seller-destination" {
		t.Fatal("seller payout changed accepted amount or recipient")
	}
	shared.read(t)
	rows, err = f.store.SellerPayouts(ctx, f.base.other, f.offer.SubmissionID, false)
	if err != nil || len(rows) != 1 || rows[0].State != "awaiting_verification" {
		t.Fatal("seller payout skipped independent provider verification", err)
	}
	if err = f.store.VerifySellerPayout(ctx, f.base.admin, value.ID, payments.TransferChange{Version: rows[0].Version, Reason: "Authorize the independently reconciled seller transfer.", Code: "123456"}); err != nil {
		t.Fatal(err)
	}
	if provider.verifies != 1 {
		t.Fatal("seller provider verification not called")
	}
	if _, err = f.resale.ChangeListing(ctx, f.base.admin, f.listing.ID, "publish", resale.ListingInput{Version: f.listing.Version, Product: resaleProduct(), PublicReviewed: true}); err == nil {
		t.Fatal("processing seller payment treated as confirmed")
	}
	provider.status("finished")
	shared.read(t)
	f.publish(t)
	if count, e := f.base.auth.client.PaymentReceipt.Query().Count(ctx); e != nil || count != 0 {
		t.Fatal("buy-first payout invented a buyer receipt", e)
	}
}
