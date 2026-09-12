//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/authaudit"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/reports"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/sitecontent"
)

func TestCustomerDirectoryQueueFiltersAndSessionAuthority(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	purchase := f.create(t, "custom")
	page, e := f.auth.service.Directory(ctx, f.admin, identity.UserQuery{Search: f.buyer.User.Email})
	if e != nil || len(page.Users) != 1 || page.Users[0].ID != f.buyer.User.ID || !page.Users[0].EmailVerified {
		t.Fatal("customer search", e)
	}
	raw, e := json.Marshal(page)
	if e != nil {
		t.Fatal(e)
	}
	for _, key := range []string{"mfa_secret", "auth_version", "recovery_hashes", "provider_subject"} {
		if strings.Contains(string(raw), key) {
			t.Fatal("directory secret", key)
		}
	}
	if _, e = f.auth.service.Directory(ctx, f.buyer, identity.UserQuery{}); !errors.Is(e, identity.ErrForbidden) {
		t.Fatal("customer directory access", e)
	}
	listing, e := f.store.List(ctx, f.admin, true, "", "", "", orders.Filters{Customer: f.buyer.User.ID, Game: f.game.Slug, Kind: "custom", Assigned: "unassigned", From: "2000-01-01", To: "2100-01-01"})
	if e != nil || len(listing.Orders) != 1 || listing.Orders[0].ID != purchase.Order.ID {
		t.Fatal("queue intersection", e)
	}
	if _, e = f.store.List(ctx, f.buyer, false, "", "", "", orders.Filters{Customer: f.other.User.ID}); e == nil {
		t.Fatal("customer supplied staff filter")
	}
	if _, e = f.store.List(ctx, f.admin, true, "", "", "", orders.Filters{From: "2100-01-01", To: "2000-01-01"}); e == nil {
		t.Fatal("inverted dates")
	}
	sessions, e := f.auth.service.UserSessions(ctx, f.admin, f.buyer.User.ID)
	if e != nil || len(sessions) != 1 {
		t.Fatal("staff session metadata", e)
	}
	if e = f.auth.service.RevokeUserSessions(ctx, f.admin, f.admin.User.ID); !errors.Is(e, identity.ErrForbidden) {
		t.Fatal("admin acting on administrator", e)
	}
	if e = f.auth.service.RevokeUserSessions(ctx, f.admin, f.buyer.User.ID); e != nil {
		t.Fatal(e)
	}
	if _, e = f.store.List(ctx, f.buyer, false, "", "", ""); e == nil {
		t.Fatal("revoked identity still read orders")
	}
	if n, e := f.auth.client.AuthAudit.Query().Where(authaudit.ActionEQ("sessions.revoked_by_staff")).Count(ctx); e != nil || n != 1 {
		t.Fatal("session action unaudited", e)
	}
}
func TestFinancialReportsExactUnitsSeparationAndPrivacy(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	s := reports.New(f.auth.service, func() time.Time { return time.Unix(f.auth.clock.Load(), 0) })
	now := time.Unix(f.auth.clock.Load(), 0)
	// Isolated evidence fixtures exercise report projections; no application command simulates a payment.
	receipt, e := f.auth.client.PaymentReceipt.Create().SetRecordID(uuid.NewString()).SetAttemptID(uuid.NewString()).SetOrderID(uuid.NewString()).SetUserID(f.buyer.User.ID).SetCurrency("btc").SetNetwork("btc").SetAmount("0.000123456789").SetState("confirmed").SetObservationID(uuid.NewString()).SetCreatedAt(now).SetUpdatedAt(now).Save(ctx)
	if e != nil {
		t.Fatal(e)
	}
	for _, kind := range []string{"refund", "seller_payout"} {
		if _, e = f.auth.client.MoneyTransfer.Create().SetRequestHash(strings.Repeat("a", 64)).SetKind(kind).SetCaseID("").SetReceiptID(receipt.ID).SetOrderID(receipt.OrderID).SetUserID(f.buyer.User.ID).SetAccount("private-merchant-reference").SetCurrency("ltc").SetNetwork("ltc").SetAmount("0.12000001").SetTerms("Synthetic private routing terms").SetRecipient(map[string]any{"address": "private-destination"}).SetState("confirmed").SetCreatedAt(now).SetUpdatedAt(now).Save(ctx); e != nil {
			t.Fatal(e)
		}
	}
	for _, kind := range []string{"receipts", "refunds", "payouts"} {
		q := reportQuery(kind)
		r, e := s.Preview(ctx, f.admin, q)
		if e != nil || r.Count != 1 {
			t.Fatal("financial report", kind, e)
		}
		raw, e := json.Marshal(r)
		if e != nil {
			t.Fatal(e)
		}
		for _, secret := range []string{f.buyer.User.Email, "private-destination", "private-merchant-reference", "Synthetic private routing terms"} {
			if strings.Contains(string(raw), secret) {
				t.Fatal("report exposed private data")
			}
		}
		if kind == "receipts" && r.Rows[0][7] != "0.000123456789" {
			t.Fatal("rounded crypto quantity")
		}
		if _, e = s.Download(ctx, f.admin, reports.ExportInput{Query: q, Digest: r.Digest, Reason: "Review separated crypto evidence"}); e != nil {
			t.Fatal(e)
		}
		if _, e = s.Preview(ctx, f.buyer, q); !errors.Is(e, identity.ErrForbidden) {
			t.Fatal("customer financial report", e)
		}
	}
}

func TestStaffAlertSuppressionRevokesQueuedDelivery(t *testing.T) {
	f := availabilityDB(t)
	ctx := t.Context()
	f.capacity(t, 0)
	subscription := f.subscribe(t)
	f.capacity(t, 2)
	page, e := f.alerts.StaffList(ctx, f.admin, "", f.buyer.User.ID, "active")
	if e != nil || len(page.Subscriptions) != 1 || page.Subscriptions[0].ConsentVersion == "" {
		t.Fatal("staff consent metadata", e)
	}
	if _, e = f.alerts.StaffList(ctx, f.buyer, "", "", ""); !errors.Is(e, identity.ErrForbidden) {
		t.Fatal("customer consent directory", e)
	}
	if e = f.alerts.Suppress(ctx, f.admin, subscription.ID, subscription.Version); e != nil {
		t.Fatal(e)
	}
	if e = f.alerts.Suppress(ctx, f.admin, subscription.ID, subscription.Version); e == nil {
		t.Fatal("stale suppression accepted")
	}
	sender := &recordingSender{}
	if e = f.alerts.EmailHandler(sender)(ctx, f.delivery(t)); e != nil {
		t.Fatal(e)
	}
	if len(sender.messages) != 0 {
		t.Fatal("staff suppression did not stop queued mail")
	}
}

func TestReviewedNotificationCopyKeepsMandatoryInstructions(t *testing.T) {
	f := availabilityDB(t)
	ctx := t.Context()
	content := sitecontent.New(f.auth.client, f.auth.service, func() time.Time { return time.Unix(f.auth.clock.Load(), 0) })
	input := sitecontent.Input{Data: map[string]any{"activity_subject": "Approved activity subject", "activity_intro": "Approved activity introduction", "availability_subject": "Approved availability subject", "availability_intro": "Approved availability introduction", "footer": "Synthetic support hours"}}
	draft, e := content.Save(ctx, f.admin, "notifications", input)
	if e != nil {
		t.Fatal(e)
	}
	messageCopy, e := sitecontent.NotificationCopy(ctx, f.auth.client)
	if e != nil || messageCopy.AvailabilitySubject == "Approved availability subject" {
		t.Fatal("private mail draft became live", e)
	}
	input.Version = draft.Version
	input.Publish = true
	input.Label = "mail-v1"
	published, e := content.Save(ctx, f.admin, "notifications", input)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = content.Save(ctx, f.admin, "notifications", input); !errors.Is(e, sitecontent.ErrConflict) {
		t.Fatal("stale content editor saved", e)
	}
	f.capacity(t, 0)
	f.subscribe(t)
	f.capacity(t, 2)
	sender := &recordingSender{}
	if e = f.alerts.EmailHandler(sender)(ctx, f.delivery(t)); e != nil {
		t.Fatal(e)
	}
	if len(sender.messages) != 1 || sender.messages[0].Subject != "Approved availability subject" {
		t.Fatal("published messageCopy unused")
	}
	for _, required := range []string{"Synthetic support hours", "not a reservation", "Stop these availability emails:", "/availability"} {
		if !strings.Contains(sender.messages[0].Body, required) {
			t.Fatal("missing required mail content", required)
		}
	}
	input.Version = published.Version
	input.Label = "mail-v2"
	executeSQL(t, f.auth.db, "DROP TABLE auth_audits")
	if _, e = content.Save(ctx, f.admin, "notifications", input); e == nil {
		t.Fatal("publication without audit")
	}
	copyView, e := content.Public(ctx, "notifications")
	if e != nil || copyView.ReleaseID != published.ReleaseID {
		t.Fatal("failed audit changed publication", e)
	}
}
