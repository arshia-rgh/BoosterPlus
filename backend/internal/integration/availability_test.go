//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"errors"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	d "github.com/arshia-rgh/BoosterPlus/backend/ent/availabilitydelivery"
	sub "github.com/arshia-rgh/BoosterPlus/backend/ent/availabilitysubscription"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/availability"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
)

type availabilityFixture struct {
	*orderFixture
	alerts *availability.Store
}

func availabilityDB(t *testing.T) *availabilityFixture {
	t.Helper()
	f := orderDB(t)
	s, e := availability.New(f.auth.client, f.auth.service, "http://localhost", func() time.Time { return time.Unix(f.auth.clock.Load(), 0) })
	if e != nil {
		t.Fatal(e)
	}
	return &availabilityFixture{f, s}
}
func (f *availabilityFixture) subscribe(t *testing.T) availability.View {
	t.Helper()
	v, e := f.alerts.Subscribe(t.Context(), f.buyer, availability.SubscribeInput{Slug: f.game.Slug, Package: "pack", Variant: "basic", ConsentVersion: availability.ConsentVersion, Accept: true})
	if e != nil {
		t.Fatal(e)
	}
	return v
}
func (f *availabilityFixture) capacity(t *testing.T, n int) {
	t.Helper()
	c := f.game.Configuration
	c.Packages[0].Variants[0].Capacity = &n
	var e error
	f.game, e = f.catalog.Mutate(t.Context(), f.admin, f.game.ID, "save", catalog.Change{Revision: f.game.Revision, Configuration: c})
	if e != nil {
		t.Fatal(e)
	}
	f.game, e = f.catalog.Mutate(t.Context(), f.admin, f.game.ID, "publish", catalog.Change{Revision: f.game.Revision})
	if e != nil {
		t.Fatal(e)
	}
	if e = f.alerts.Reconcile(t.Context()); e != nil {
		t.Fatal(e)
	}
}
func (f *availabilityFixture) delivery(t *testing.T) jobs.Job {
	t.Helper()
	row, e := f.auth.client.AvailabilityDelivery.Query().Order(ent.Desc(d.FieldCreatedAt), ent.Desc(d.FieldID)).First(t.Context())
	if e != nil {
		t.Fatal(e)
	}
	raw, e := json.Marshal(map[string]string{"delivery_id": row.ID})
	if e != nil {
		t.Fatal(e)
	}
	return jobs.Job{Kind: "availability.email", Payload: raw}
}
func linkFromMessage(t *testing.T, message identity.Message) availability.LinkInput {
	t.Helper()
	for _, line := range strings.Split(message.Body, "\n") {
		if !strings.Contains(line, "/availability/unsubscribe#") {
			continue
		}
		u, e := url.Parse(line)
		if e != nil {
			t.Fatal(e)
		}
		parts := strings.Split(u.Fragment, "/")
		if len(parts) != 3 || u.RawQuery != "" {
			t.Fatal("link secret outside fragment")
		}
		v, e := strconv.Atoi(parts[1])
		if e != nil {
			t.Fatal(e)
		}
		return availability.LinkInput{ID: parts[0], Version: v, Token: parts[2]}
	}
	t.Fatal("unsubscribe link missing")
	return availability.LinkInput{}
}
func TestAvailabilityConsentOpeningsAndSignedUnsubscribe(t *testing.T) {
	f := availabilityDB(t)
	ctx := t.Context()
	v := f.subscribe(t)
	if !v.Available {
		t.Fatal("initial available offering")
	}
	duplicate := f.subscribe(t)
	if duplicate.ID != v.ID {
		t.Fatal("duplicate subscription")
	}
	if e := f.alerts.Reconcile(ctx); e != nil {
		t.Fatal(e)
	}
	if n, e := f.auth.client.AvailabilityDelivery.Query().Count(ctx); e != nil || n != 0 {
		t.Fatal("initial stock sent unsolicited alert", n, e)
	}
	f.capacity(t, 0)
	f.capacity(t, 1)
	sender := &recordingSender{}
	job := f.delivery(t)
	for range 2 {
		if e := f.alerts.EmailHandler(sender)(ctx, job); e != nil {
			t.Fatal(e)
		}
	}
	if len(sender.messages) != 1 {
		t.Fatal("non-idempotent completed delivery")
	}
	message := sender.messages[0]
	if message.To != f.buyer.User.Email || !strings.Contains(message.Body, "not a reservation") || strings.Contains(message.Body, f.buyer.User.ID) {
		t.Fatal("unsafe email projection")
	}
	link := linkFromMessage(t, message)
	bad := link
	bad.Token = strings.Repeat("0", 64)
	if got, e := f.alerts.Link(ctx, bad, true); e != nil || got.Current {
		t.Fatal("forged link", e)
	}
	if got, e := f.alerts.Link(ctx, link, false); e != nil || !got.Current {
		t.Fatal("inspect", e)
	}
	row, e := f.auth.client.AvailabilitySubscription.Get(ctx, v.ID)
	if e != nil || row.State != "active" {
		t.Fatal("inspect mutated consent", e)
	}
	if got, linkErr := f.alerts.Link(ctx, link, true); linkErr != nil || !got.Current {
		t.Fatal("confirm", linkErr)
	}
	f.capacity(t, 0)
	f.capacity(t, 1)
	if n, countErr := f.auth.client.AvailabilityDelivery.Query().Count(ctx); countErr != nil || n != 1 {
		t.Fatal("unsubscribed fanout", n, countErr)
	}
	activated, e := f.alerts.Change(ctx, f.buyer, v.ID, availability.ChangeInput{Version: 2, Active: true, Accept: true, ConsentVersion: availability.ConsentVersion})
	if e != nil || activated.Version != 3 {
		t.Fatal("reactivation", e)
	}
	if got, linkErr := f.alerts.Link(ctx, link, true); linkErr != nil || got.Current {
		t.Fatal("old link cancelled new consent", linkErr)
	}
	if n, countErr := f.auth.client.AvailabilityDelivery.Query().Count(ctx); countErr != nil || n != 1 {
		t.Fatal("reactivation sent prior opening", n, countErr)
	}
}
func TestAvailabilityOwnershipCASAndAuditRollback(t *testing.T) {
	f := availabilityDB(t)
	ctx := t.Context()
	v := f.subscribe(t)
	if _, e := f.alerts.Change(ctx, f.other, v.ID, availability.ChangeInput{Version: 1}); !ent.IsNotFound(e) {
		t.Fatal("foreign unsubscribe", e)
	}
	if _, e := f.alerts.Subscribe(ctx, f.buyer, availability.SubscribeInput{Slug: f.game.Slug, Package: "pack", Variant: "basic", ConsentVersion: availability.ConsentVersion}); !errors.Is(e, availability.ErrInvalid) {
		t.Fatal("implicit consent", e)
	}
	var wg sync.WaitGroup
	var wins atomic.Int32
	for range 4 {
		wg.Go(func() {
			_, e := f.alerts.Change(ctx, f.buyer, v.ID, availability.ChangeInput{Version: 1})
			if e == nil {
				wins.Add(1)
			} else if !errors.Is(e, availability.ErrConflict) {
				t.Error(e)
			}
		})
	}
	wg.Wait()
	if wins.Load() != 1 {
		t.Fatal("concurrent consent overwrite", wins.Load())
	}
	executeSQL(t, f.auth.db, "DROP TABLE auth_audits")
	if _, e := f.alerts.Change(ctx, f.buyer, v.ID, availability.ChangeInput{Version: 2, Active: true, Accept: true, ConsentVersion: availability.ConsentVersion}); e == nil {
		t.Fatal("unaudited consent")
	}
	row, e := f.auth.client.AvailabilitySubscription.Get(ctx, v.ID)
	if e != nil || row.State != "unsubscribed" || row.Version != 2 {
		t.Fatal("audit failure did not roll back", e)
	}
}

type unavailableSender struct{}

func (unavailableSender) Send(context.Context, identity.Message) error {
	return errors.New("synthetic SMTP failure must stay private")
}
func TestAvailabilityPendingRetryChecksCurrentIdentityConsentAndCapacity(t *testing.T) {
	for _, change := range []string{"unsubscribe", "email", "suspend", "unverify", "closed", "removed", "expired"} {
		t.Run(change, func(t *testing.T) {
			f := availabilityDB(t)
			ctx := t.Context()
			f.capacity(t, 0)
			v := f.subscribe(t)
			f.capacity(t, 1)
			job := f.delivery(t)
			if e := f.alerts.EmailHandler(unavailableSender{})(ctx, job); e == nil || strings.Contains(e.Error(), "synthetic") {
				t.Fatal("SMTP failure handling", e)
			}
			switch change {
			case "unsubscribe":
				if _, e := f.alerts.Change(ctx, f.buyer, v.ID, availability.ChangeInput{Version: 1}); e != nil {
					t.Fatal(e)
				}
			case "email":
				if _, e := f.auth.client.User.UpdateOneID(f.buyer.User.ID).SetEmail("changed@example.test").Save(ctx); e != nil {
					t.Fatal(e)
				}
			case "suspend":
				if _, e := f.auth.client.User.UpdateOneID(f.buyer.User.ID).SetSuspended(true).Save(ctx); e != nil {
					t.Fatal(e)
				}
			case "unverify":
				if _, e := f.auth.client.User.UpdateOneID(f.buyer.User.ID).ClearEmailVerifiedAt().Save(ctx); e != nil {
					t.Fatal(e)
				}
			case "closed":
				f.capacity(t, 0)
			case "removed":
				if _, e := f.catalog.Mutate(ctx, f.admin, f.game.ID, "archive", catalog.Change{Revision: f.game.Revision}); e != nil {
					t.Fatal(e)
				}
			case "expired":
				f.auth.clock.Add(25 * 3600)
			}
			sender := &recordingSender{}
			if e := f.alerts.EmailHandler(sender)(ctx, job); e != nil {
				t.Fatal(e)
			}
			if len(sender.messages) != 0 {
				t.Fatal("stale email sent")
			}
			if n, e := f.auth.client.AvailabilityDelivery.Query().Where(d.StateEQ("suppressed")).Count(ctx); e != nil || n != 1 {
				t.Fatal("suppressed outcome missing", e)
			}
		})
	}
}
func TestAvailabilityBoundedFanoutReconciliationAndSafeReferences(t *testing.T) {
	f := availabilityDB(t)
	ctx := t.Context()
	f.capacity(t, 0)
	v := f.subscribe(t)
	first, e := f.auth.client.AvailabilitySubscription.Get(ctx, v.ID)
	if e != nil {
		t.Fatal(e)
	}
	// Synthetic extra accounts exercise multiple pages without bypassing any public route.
	for range 54 {
		id := uuid.NewString()
		email := id + "@example.test"
		if _, e = f.auth.client.User.Create().SetID(id).SetEmail(email).SetEmailVerifiedAt(time.Unix(f.auth.clock.Load(), 0)).Save(ctx); e != nil {
			t.Fatal(e)
		}
		if _, e = f.auth.client.AvailabilitySubscription.Create().SetUserID(id).SetTargetID(first.TargetID).SetVersion(1).SetState("active").SetEmailFingerprint(f.auth.service.RequestDigest("availability-email", []byte(email))).SetLastCycle(0).SetConsentVersion(availability.ConsentVersion).SetSuppressionReason("").Save(ctx); e != nil {
			t.Fatal(e)
		}
	}
	f.capacity(t, 1)
	if n, countErr := f.auth.client.AvailabilityDelivery.Query().Count(ctx); countErr != nil || n != 50 {
		t.Fatal("unbounded fanout page", n, countErr)
	}

	last, readErr := f.auth.client.AvailabilitySubscription.Query().Where(sub.TargetIDEQ(first.TargetID), sub.LastCycleEQ(1)).Order(ent.Desc(sub.FieldID)).First(ctx)
	if readErr != nil {
		t.Fatal(readErr)
	}
	continuation, encodeErr := json.Marshal(map[string]any{"target_id": first.TargetID, "cycle": 1, "after": last.ID})
	if encodeErr != nil {
		t.Fatal(encodeErr)
	}
	for range 2 {
		if handlerErr := f.alerts.FanoutHandler()(ctx, jobs.Job{Kind: "availability.fanout", Payload: continuation}); handlerErr != nil {
			t.Fatal(handlerErr)
		}
	}
	var wg sync.WaitGroup
	for range 3 {
		wg.Go(func() {
			if err := f.alerts.Reconcile(ctx); err != nil {
				t.Error(err)
			}
		})
	}
	wg.Wait()
	if n, countErr := f.auth.client.AvailabilityDelivery.Query().Count(ctx); countErr != nil || n != 55 {
		t.Fatal("lost/duplicate continuation", n, countErr)
	}
	var payloads string
	if e = f.auth.db.QueryRowContext(ctx, "SELECT GROUP_CONCAT(CAST(payload AS CHAR)) FROM jobs WHERE kind LIKE 'availability.%'").Scan(&payloads); e != nil {
		t.Fatal(e)
	}
	for _, secret := range []string{"email_fingerprint", f.buyer.User.Email, "@example.test", "consent_version", "unsubscribe#"} {
		if strings.Contains(payloads, secret) {
			t.Fatal("private event data")
		}
	}
	// Choose the final subscriber so suppression must cross the 50-row boundary.
	// Random UUID ordering previously put the buyer on either page, while the
	// assertion incorrectly assumed a single bounded sweep processed all 55 rows.
	changed, e := f.auth.client.AvailabilitySubscription.Query().Where(sub.TargetIDEQ(first.TargetID)).Order(ent.Desc(sub.FieldID)).First(ctx)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = f.auth.client.User.UpdateOneID(changed.UserID).SetEmail("different@example.test").Save(ctx); e != nil {
		t.Fatal(e)
	}
	f.capacity(t, 0)
	f.capacity(t, 1)
	if n, countErr := f.auth.client.AvailabilityDelivery.Query().Where(d.CycleEQ(2)).Count(ctx); countErr != nil || n != 50 {
		t.Fatal("second opening exceeded bounded fanout", n, countErr)
	}
	row, e := f.auth.client.AvailabilitySubscription.Get(ctx, changed.ID)
	if e != nil || row.State != "active" || row.LastCycle != 1 {
		t.Fatal("last subscriber should still await the next page", e)
	}
	// Even before the next sweep persists suppression, an old queued delivery
	// must recheck the changed address and refuse to send.
	queued, e := f.auth.client.AvailabilityDelivery.Query().Where(d.SubscriptionIDEQ(changed.ID), d.CycleEQ(1)).Only(ctx)
	if e != nil {
		t.Fatal(e)
	}
	raw, e := json.Marshal(map[string]string{"delivery_id": queued.ID})
	if e != nil {
		t.Fatal(e)
	}
	sender := &recordingSender{}
	if e = f.alerts.EmailHandler(sender)(ctx, jobs.Job{Kind: "availability.email", Payload: raw}); e != nil || len(sender.messages) != 0 {
		t.Fatal("changed email received a queued alert before reconciliation", e)
	}
	if e = f.alerts.Reconcile(ctx); e != nil {
		t.Fatal(e)
	}
	row, e = f.auth.client.AvailabilitySubscription.Get(ctx, changed.ID)
	if e != nil || row.State != "suppressed" || row.SuppressionReason != "identity_changed" {
		t.Fatal("email change did not suppress consent on the next page", e)
	}
	if n, countErr := f.auth.client.AvailabilityDelivery.Query().Where(d.CycleEQ(2)).Count(ctx); countErr != nil || n != 54 {
		t.Fatal("changed email was not excluded from the second opening", n, countErr)
	}
	list, e := f.alerts.List(ctx, f.other, "")
	if e != nil || len(list.Subscriptions) != 0 {
		t.Fatal("foreign subscription listing", e)
	}
	if _, e = f.alerts.List(ctx, f.buyer, "not-a-cursor"); !errors.Is(e, availability.ErrInvalid) {
		t.Fatal("invalid cursor", e)
	}
	if _, e = f.auth.client.AvailabilitySubscription.Query().Where(sub.IDEQ(v.ID)).Only(ctx); e != nil {
		t.Fatal(e)
	}
}

func TestAvailabilityQuotaPaginationAndFreshEmailConsent(t *testing.T) {
	f := availabilityDB(t)
	ctx := t.Context()
	// Direct fixture inserts exercise fifty distinct targets without inventing production offerings.
	for i := range 50 {
		target, err := f.auth.client.AvailabilityTarget.Create().SetGameID(f.game.ID).SetSlug(f.game.Slug).SetPackageKey("synthetic-" + strconv.Itoa(i)).SetVariantKey("test").SetAvailable(false).SetCycle(0).Save(ctx)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = f.auth.client.AvailabilitySubscription.Create().SetUserID(f.buyer.User.ID).SetTargetID(target.ID).SetVersion(1).SetState("active").SetEmailFingerprint(f.auth.service.RequestDigest("availability-email", []byte(f.buyer.User.Email))).SetLastCycle(0).SetConsentVersion(availability.ConsentVersion).SetSuppressionReason("").Save(ctx); err != nil {
			t.Fatal(err)
		}
	}
	input := availability.SubscribeInput{Slug: f.game.Slug, Package: "pack", Variant: "basic", Accept: true, ConsentVersion: availability.ConsentVersion}
	if _, err := f.alerts.Subscribe(ctx, f.buyer, input); !errors.Is(err, availability.ErrConflict) {
		t.Fatal("active subscription quota bypass", err)
	}
	first, err := f.alerts.List(ctx, f.buyer, "")
	if err != nil || len(first.Subscriptions) != 50 || first.Next != "" {
		t.Fatal("quota page", err)
	}
	if _, err = f.alerts.Change(ctx, f.buyer, first.Subscriptions[0].ID, availability.ChangeInput{Version: 1}); err != nil {
		t.Fatal(err)
	}
	live, err := f.alerts.Subscribe(ctx, f.buyer, input)
	if err != nil {
		t.Fatal(err)
	}
	first, err = f.alerts.List(ctx, f.buyer, "")
	if err != nil || len(first.Subscriptions) != 50 || first.Next == "" {
		t.Fatal("first page", err)
	}
	second, err := f.alerts.List(ctx, f.buyer, first.Next)
	if err != nil || len(second.Subscriptions) != 1 || second.Next != "" {
		t.Fatal("second page", err)
	}
	for _, item := range first.Subscriptions {
		if item.ID == second.Subscriptions[0].ID {
			t.Fatal("duplicate across pages")
		}
	}
	if _, err = f.auth.client.User.UpdateOneID(f.buyer.User.ID).SetEmail("fresh-consent@example.test").Save(ctx); err != nil {
		t.Fatal(err)
	}
	// A changed address is visibly suppressed even before the next opening fanout.
	page, err := f.alerts.List(ctx, f.buyer, "")
	if err != nil {
		t.Fatal(err)
	}
	for _, item := range page.Subscriptions {
		if item.State == "active" {
			t.Fatal("stale email shown as consented")
		}
	}
	refreshed, err := f.alerts.Change(ctx, f.buyer, live.ID, availability.ChangeInput{Version: 1, Active: true, Accept: true, ConsentVersion: availability.ConsentVersion})
	if err != nil || refreshed.State != "active" {
		t.Fatal("fresh current-address consent", err)
	}
	row, err := f.auth.client.AvailabilitySubscription.Get(ctx, live.ID)
	if err != nil || row.EmailFingerprint != f.auth.service.RequestDigest("availability-email", []byte("fresh-consent@example.test")) {
		t.Fatal("consent not bound to verified current address", err)
	}
}

func TestAvailabilityReservationReleaseAndCatalogStateEvents(t *testing.T) {
	f := availabilityDB(t)
	ctx := t.Context()
	f.capacity(t, 1)
	f.subscribe(t)
	purchase := f.create(t, "package")
	changed := func() {
		t.Helper()
		raw, err := json.Marshal(map[string]string{"game_id": f.game.ID})
		if err != nil {
			t.Fatal(err)
		}
		if err = f.alerts.ChangedHandler()(ctx, jobs.Job{Kind: "availability.changed", Payload: raw}); err != nil {
			t.Fatal(err)
		}
	}
	changed()
	target, err := f.auth.client.AvailabilityTarget.Query().Only(ctx)
	if err != nil || target.Available {
		t.Fatal("held reservation ignored", err)
	}
	if _, err = f.store.Transition(ctx, f.buyer, purchase.Order.ID, "cancel", false, orders.Action{Version: purchase.Order.Version}); err != nil {
		t.Fatal(err)
	}
	changed()
	target, err = f.auth.client.AvailabilityTarget.Get(ctx, target.ID)
	if err != nil || !target.Available || target.Cycle != 1 {
		t.Fatal("released capacity not opened", err)
	}
	var events int
	if err = f.auth.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM jobs WHERE kind='availability.changed'").Scan(&events); err != nil || events < 2 {
		t.Fatal("capacity changes missing atomic events", events, err)
	}
	for _, action := range []string{"pause", "resume", "archive", "restore"} {
		f.game, err = f.catalog.Mutate(ctx, f.admin, f.game.ID, action, catalog.Change{Revision: f.game.Revision})
		if err != nil {
			t.Fatal(err)
		}
		changed()
		target, err = f.auth.client.AvailabilityTarget.Get(ctx, target.ID)
		if err != nil {
			t.Fatal(err)
		}
		if target.Available != (action == "resume") {
			t.Fatal("paused/archived/restored capacity", action)
		}
	}
	if target.Cycle != 2 {
		t.Fatal("duplicate or missing availability cycle", target.Cycle)
	}
}
