//go:build integration

package integration

import (
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/notification"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/reviews"
)

func TestReviewsNotificationPrivacyAndDeliveryPolicy(t *testing.T) {
	f := reviewDB(t)
	f.reviews = reviews.New(f.auth.client, f.auth.service, nil)
	ctx := t.Context()
	paid := f.completed(t)
	v, err := f.reviews.Save(ctx, f.buyer, paid.Order.ID, f.feedback())
	if err != nil {
		t.Fatal(err)
	}
	privateReason := "Private review detail must stay out of email."
	v, err = f.reviews.Moderate(ctx, f.admin, v.Review.ID, "publish", reviews.Action{Version: v.Review.Version, PolicyChecked: true, Note: privateReason})
	if err != nil {
		t.Fatal(err)
	}
	notice, err := f.auth.client.Notification.Query().Where(notification.KindEQ("review_customer")).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	store, err := notifications.New(f.auth.client, f.auth.service, f.auth.cfg.PublicOrigin)
	if err != nil {
		t.Fatal(err)
	}
	sender := &activitySender{fail: true}
	handler := store.EmailHandler(sender)
	job := jobs.Job{Payload: []byte(`{"notification_id":"` + notice.ID + `"}`)}
	if err = handler(ctx, job); err == nil {
		t.Fatal("delivery outage swallowed")
	}
	sender.fail = false
	if err = handler(ctx, job); err != nil {
		t.Fatal(err)
	}
	if err = handler(ctx, job); err != nil {
		t.Fatal(err)
	}
	if len(sender.sent) != 1 || !strings.Contains(sender.sent[0].Body, "/orders/"+paid.Order.ID+"#purchase-review") || strings.Contains(sender.sent[0].Body, privateReason) || strings.Contains(sender.sent[0].Body, v.Body) {
		t.Fatal("email leaked private text or retried completed notice")
	}
	if _, err = f.auth.client.User.UpdateOneID(f.buyer.User.ID).SetNotifyUpdates(false).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.reviews.Moderate(ctx, f.admin, v.Review.ID, "hide", reviews.Action{Version: v.Review.Version, ReasonCode: "privacy", Note: privateReason}); err != nil {
		t.Fatal(err)
	}
	notice, err = f.auth.client.Notification.Query().Where(notification.KindEQ("review_customer"), notification.EmailStateEQ(notification.EmailStatePending)).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if err = handler(ctx, jobs.Job{Payload: []byte(`{"notification_id":"` + notice.ID + `"}`)}); err != nil {
		t.Fatal(err)
	}
	if len(sender.sent) != 1 {
		t.Fatal("opt-out ignored")
	}
	row, err := f.auth.client.Notification.Get(ctx, notice.ID)
	if err != nil || row.EmailState != notification.EmailStateSuppressed {
		t.Fatal("suppression not persisted", err)
	}
}
