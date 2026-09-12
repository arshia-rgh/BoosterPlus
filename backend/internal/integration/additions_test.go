//go:build integration

package integration

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/availabilitydelivery"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/availability"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resale"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/reviews"
)

func TestAccountFavoritesCriteriaAlertsAndConsent(t *testing.T) {
	f := resaleDB(t, "consignment")
	ctx := t.Context()
	alerts, err := availability.New(f.base.auth.client, f.base.auth.service, "http://localhost", func() time.Time { return time.Unix(f.base.auth.clock.Load(), 0) })
	if err != nil {
		t.Fatal(err)
	}
	input := availability.SubscribeInput{Slug: f.intake.game.Slug, Account: &availability.AccountCriteria{Region: resaleProduct().Region, Rank: resaleProduct().Rank, Currency: "USD", MaxAmount: 100000}, Accept: true, ConsentVersion: availability.ConsentVersion}
	subscribed, err := alerts.Subscribe(ctx, f.base.buyer, input)
	if err != nil || subscribed.Available || subscribed.Account == nil {
		t.Fatal("criteria consent", err)
	}
	if _, err = alerts.Change(ctx, f.base.other, subscribed.ID, availability.ChangeInput{Version: subscribed.Version}); err == nil {
		t.Fatal("foreign consent mutation")
	}
	bad := input
	bad.Account = &availability.AccountCriteria{Currency: "USD", MaxAmount: -1}
	if _, err = alerts.Subscribe(ctx, f.base.buyer, bad); err == nil {
		t.Fatal("negative criteria price")
	}
	f.publish(t)
	if err = alerts.Reconcile(ctx); err != nil {
		t.Fatal(err)
	}
	deliveries, err := f.base.auth.client.AvailabilityDelivery.Query().Where(availabilitydelivery.SubscriptionIDEQ(subscribed.ID)).All(ctx)
	if err != nil || len(deliveries) != 1 {
		t.Fatal("opening delivery", len(deliveries), err)
	}
	if err = alerts.Reconcile(ctx); err != nil {
		t.Fatal(err)
	}
	count, err := f.base.auth.client.AvailabilityDelivery.Query().Where(availabilitydelivery.SubscriptionIDEQ(subscribed.ID)).Count(ctx)
	if err != nil || count != 1 {
		t.Fatal("duplicate opening", err)
	}
	f.base.auth.clock.Add(1)
	f.listing, err = f.resale.ChangeListing(ctx, f.base.admin, f.listing.ID, "publish", resale.ListingInput{Version: f.listing.Version, Product: resaleProduct(), PublicReviewed: true})
	if err != nil {
		t.Fatal(err)
	}
	if err = alerts.Reconcile(ctx); err != nil {
		t.Fatal(err)
	}
	count, err = f.base.auth.client.AvailabilityDelivery.Query().Where(availabilitydelivery.SubscriptionIDEQ(subscribed.ID)).Count(ctx)
	if err != nil || count != 2 {
		t.Fatal("new matching public release did not notify", err)
	}
	late, err := alerts.Subscribe(ctx, f.base.other, input)
	if err != nil {
		t.Fatal(err)
	}
	if err = alerts.Reconcile(ctx); err != nil {
		t.Fatal(err)
	}
	count, err = f.base.auth.client.AvailabilityDelivery.Query().Where(availabilitydelivery.SubscriptionIDEQ(late.ID)).Count(ctx)
	if err != nil || count != 0 {
		t.Fatal("pre-consent inventory emailed", err)
	}
	favorite, err := f.base.store.SaveFavorite(ctx, f.base.buyer, orders.FavoriteInput{Kind: "account", Slug: f.intake.game.Slug, Package: f.listing.ID})
	if err != nil || !favorite.Available {
		t.Fatal("account favorite", err)
	}
	same, err := f.base.store.SaveFavorite(ctx, f.base.buyer, orders.FavoriteInput{Kind: "account", Slug: f.intake.game.Slug, Package: f.listing.ID})
	if err != nil || same.ID != favorite.ID {
		t.Fatal("favorite retry", err)
	}
	f.reserve(t)
	saved, err := f.base.store.Favorites(ctx, f.base.buyer, "")
	if err != nil || len(saved.Favorites) != 1 || saved.Favorites[0].Available {
		t.Fatal("reserved favorite offered as stock", err)
	}
	raw, err := json.Marshal(map[string]string{"delivery_id": deliveries[0].ID})
	if err != nil {
		t.Fatal(err)
	}
	sender := &recordingSender{}
	if err = alerts.EmailHandler(sender)(ctx, jobs.Job{Payload: raw}); err != nil || len(sender.messages) != 0 {
		t.Fatal("stale stock email", err)
	}
	if _, err = alerts.Change(ctx, f.base.buyer, subscribed.ID, availability.ChangeInput{Version: subscribed.Version}); err != nil {
		t.Fatal(err)
	}
	raw, err = json.Marshal(saved)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(raw), f.offer.SubmissionID) || strings.Contains(string(raw), f.base.other.User.ID) {
		t.Fatal("private seller metadata in favorite")
	}
}

func TestAccountReviewRequiresReceiptHandoffAndPreservesDisputedFeedback(t *testing.T) {
	f := resaleDB(t, "consignment")
	ctx := t.Context()
	config := f.intake.game.Configuration
	config.ReviewPolicy = &catalog.ReviewPolicy{Content: "Synthetic publication policy permits criticism and prohibits private credentials, spam and abuse.", Fields: []catalog.Field{}, Rules: []catalog.Rule{}}
	game, err := f.base.catalog.Mutate(ctx, f.base.admin, f.intake.game.ID, "save", catalog.Change{Revision: f.intake.game.Revision, Configuration: config})
	if err != nil {
		t.Fatal(err)
	}
	game, err = f.base.catalog.Mutate(ctx, f.base.admin, game.ID, "publish", catalog.Change{Revision: game.Revision})
	if err != nil {
		t.Fatal(err)
	}
	feedback := reviews.New(f.base.auth.client, f.base.auth.service, func() time.Time { return time.Unix(f.base.auth.clock.Load(), 0) })
	f.publish(t)
	d := f.reserve(t)
	input := reviews.Input{RequestKey: uuid.NewString(), PolicyReleaseID: game.CurrentRelease, Rating: 1, Body: "The synthetic transfer experience needs improvement.", Answers: catalog.Answers{}, AcceptPolicy: true}
	if _, err = feedback.Save(ctx, f.base.buyer, d.Order.ID, input); err == nil {
		t.Fatal("unpaid account review")
	}
	a := f.start(t, d)
	f.issue(t, a)
	f.reconcile(t, f.evidence(t, a, "940", "finished", "12.34000001"))
	if _, err = feedback.Save(ctx, f.base.buyer, d.Order.ID, input); err == nil {
		t.Fatal("undelivered account review")
	}
	bundle, err := f.resale.SubmitDeliverySecret(ctx, f.base.admin, d.Order.ID, resale.SecretInput{RequestKey: uuid.NewString(), Value: []byte("synthetic buyer handoff"), ExpiresAt: time.Unix(f.base.auth.clock.Load(), 0).Add(72 * time.Hour)})
	if err != nil {
		t.Fatal(err)
	}
	delivery, err := f.resale.Delivery(ctx, f.base.admin, d.Order.ID, true)
	if err != nil {
		t.Fatal(err)
	}
	delivery, err = f.resale.ChangeDelivery(ctx, f.base.admin, d.Order.ID, "deliver", true, resale.DeliveryChange{Version: delivery.Version, SecretVersion: bundle.Version, Accept: true, Instructions: "Complete the synthetic ownership checklist."})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.resale.ChangeDelivery(ctx, f.base.buyer, d.Order.ID, "acknowledge", false, resale.DeliveryChange{Version: delivery.Version, Accept: true, Instructions: "I received and tested the synthetic account."}); err != nil {
		t.Fatal(err)
	}
	if _, err = feedback.Save(ctx, f.base.other, d.Order.ID, input); err == nil {
		t.Fatal("seller reviewed buyer purchase")
	}
	v, err := feedback.Save(ctx, f.base.buyer, d.Order.ID, input)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = feedback.Moderate(ctx, f.base.admin, v.Review.ID, "publish", reviews.Action{Version: v.Review.Version, PolicyChecked: true, Note: "Low rating permitted; reviewed for private information."}); err != nil {
		t.Fatal(err)
	}
	if _, err = f.store.OpenCase(ctx, f.base.buyer, d.Order.ID, false, payments.CaseInput{RequestKey: uuid.NewString(), Kind: "dispute", Note: "Synthetic ownership issue for review."}); err != nil {
		t.Fatal(err)
	}
	feed, err := feedback.Public(ctx, game.Slug, "account_sale", "", "")
	if err != nil || feed.Count != 1 || feed.RatingSum != 1 || feed.Items[0].PurchaseStatus != "dispute_in_progress" {
		t.Fatal("dispute erased or mislabeled low review", err)
	}
}

func TestReviewRejectsStatusWithoutReceipt(t *testing.T) {
	f := reviewDB(t)
	ctx := t.Context()
	d := f.create(t, "package")
	if _, err := f.auth.client.Order.UpdateOneID(d.Order.ID).SetState(order.StateCompleted).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := f.auth.client.OrderContract.UpdateOneID(d.Contract.ID).SetPaymentState(ordercontract.PaymentStateSettled).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := f.reviews.Save(ctx, f.buyer, d.Order.ID, f.feedback()); err == nil {
		t.Fatal("status alone granted verified review")
	}
}

func TestPublishedReviewLabelsConfirmedRefundWithoutErasingRating(t *testing.T) {
	f := reviewDB(t)
	ctx := t.Context()
	d := f.completed(t)
	v, err := f.reviews.Save(ctx, f.buyer, d.Order.ID, f.feedback())
	if err != nil {
		t.Fatal(err)
	}
	f.publish(t, v)
	now := time.Unix(f.auth.clock.Load(), 0)
	// Isolated immutable outgoing evidence; live writes are qualified by the R06/R07 provider-flow suites.
	if _, err = f.auth.client.MoneyTransfer.Create().SetKind("refund").SetRequestHash(f.auth.service.RequestDigest("fixture", []byte(d.Order.ID))).SetCaseID(uuid.NewString()).SetReceiptID(uuid.NewString()).SetOrderID(d.Order.ID).SetUserID(f.buyer.User.ID).SetAccount("fixture").SetCurrency("usdt").SetNetwork("tron").SetAmount("1").SetTerms("Synthetic verified refund evidence.").SetRecipient(map[string]any{}).SetState("confirmed").SetCreatedAt(now).SetUpdatedAt(now).Save(ctx); err != nil {
		t.Fatal(err)
	}
	feed, err := f.reviews.Public(ctx, f.game.Slug, "", "", "")
	if err != nil || feed.Count != 1 || feed.RatingSum != 1 || feed.Items[0].PurchaseStatus != "refund_recorded" {
		t.Fatal("refund feedback projection", err)
	}
}
