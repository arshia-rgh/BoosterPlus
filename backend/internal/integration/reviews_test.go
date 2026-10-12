//go:build integration

package integration

import (
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/reviews"
)

type reviewFixture struct {
	*orderFixture
	reviews *reviews.Store
}

func reviewDB(t *testing.T) *reviewFixture {
	t.Helper()
	f := orderDB(t)
	c := f.game.Configuration
	c.ReviewPolicy = &catalog.ReviewPolicy{Content: "Synthetic content policy: no private data, spam, abuse or unrelated material. Low ratings are allowed.", Fields: []catalog.Field{{Key: "communication", Label: "Communication", Type: "short_text", Stage: "order", MaxLength: 100}}, Rules: []catalog.Rule{}}
	var err error
	f.game, err = f.catalog.Mutate(t.Context(), f.admin, f.game.ID, "save", catalog.Change{Revision: f.game.Revision, Configuration: c})
	if err != nil {
		t.Fatal(err)
	}
	f.game, err = f.catalog.Mutate(t.Context(), f.admin, f.game.ID, "publish", catalog.Change{Revision: f.game.Revision})
	if err != nil {
		t.Fatal(err)
	}
	return &reviewFixture{f, reviews.New(f.auth.client, f.auth.service, func() time.Time { return time.Unix(f.auth.clock.Load(), 0) })}
}
func (f *reviewFixture) completed(t *testing.T) orders.Detail {
	t.Helper()
	v := f.create(t, "package")
	// This isolated review fixture supplies explicit financial evidence and P08 completion.
	// No production endpoint, runtime flag, or administrator operation can fabricate this evidence.
	if _, err := f.auth.client.OrderContract.UpdateOneID(v.Contract.ID).SetPaymentState(ordercontract.PaymentStateSettled).SetCapacityHeld(false).Save(t.Context()); err != nil {
		t.Fatal(err)
	}
	now := time.Unix(f.auth.clock.Load(), 0)
	receipt, err := f.auth.client.PaymentReceipt.Create().SetRecordID(uuid.NewString()).SetAttemptID(uuid.NewString()).SetOrderID(v.Order.ID).SetUserID(f.buyer.User.ID).SetCurrency("usdt").SetNetwork("tron").SetAmount("10").SetState("confirmed").SetObservationID(uuid.NewString()).SetCreatedAt(now).SetUpdatedAt(now).Save(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.auth.client.PaymentAllocation.Create().SetReceiptID(receipt.ID).SetContractID(v.Contract.ID).SetOrderID(v.Order.ID).SetCurrency("USD").SetAmountMinor("1000").SetCryptoAmount("10").SetCreatedAt(now).Save(t.Context()); err != nil {
		t.Fatal(err)
	}
	if _, err := f.auth.client.Order.UpdateOneID(v.Order.ID).SetState(order.StateCompleted).Save(t.Context()); err != nil {
		t.Fatal(err)
	}
	return v
}
func (f *reviewFixture) feedback() reviews.Input {
	return reviews.Input{RequestKey: uuid.NewString(), PolicyReleaseID: f.game.CurrentRelease, Rating: 1, Body: "The synthetic service was disappointing; please improve communication.", Answers: catalog.Answers{"communication": json.RawMessage(`"Needs improvement"`)}, AcceptPolicy: true}
}
func (f *reviewFixture) publish(t *testing.T, v reviews.View) reviews.View {
	t.Helper()
	out, err := f.reviews.Moderate(t.Context(), f.admin, v.Review.ID, "publish", reviews.Action{Version: v.Review.Version, PolicyChecked: true, Note: "Reviewed against the accepted content policy; the low rating is permitted."})
	if err != nil {
		t.Fatal(err)
	}
	return out
}
func TestReviewsEligibilityOwnershipAndPublication(t *testing.T) {
	f := reviewDB(t)
	ctx := t.Context()
	input := f.feedback()
	unpaid := f.create(t, "custom")
	if _, err := f.reviews.Save(ctx, f.buyer, unpaid.Order.ID, input); !errors.Is(err, reviews.ErrConflict) {
		t.Fatal("unpaid feedback accepted", err)
	}
	paid := f.completed(t)
	if _, err := f.reviews.Save(ctx, f.other, paid.Order.ID, input); !ent.IsNotFound(err) {
		t.Fatal("foreign buyer reviewed", err)
	}
	if _, err := f.reviews.Save(ctx, f.admin, paid.Order.ID, input); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("staff fabricated review", err)
	}
	eligibility, err := f.reviews.ForOrder(ctx, f.buyer, paid.Order.ID)
	if err != nil || !eligibility.Eligible || eligibility.Policy == nil || eligibility.Review != nil {
		t.Fatal("eligibility response", err)
	}
	v, err := f.reviews.Save(ctx, f.buyer, paid.Order.ID, input)
	if err != nil || v.Review.State != "pending" {
		t.Fatal(err)
	}
	same, err := f.reviews.Save(ctx, f.buyer, paid.Order.ID, input)
	if err != nil || same.Review.ID != v.Review.ID {
		t.Fatal("duplicate review retry", err)
	}
	changed := input
	changed.Body = "Changed initial payload"
	if _, err = f.reviews.Save(ctx, f.buyer, paid.Order.ID, changed); !errors.Is(err, reviews.ErrConflict) {
		t.Fatal("retry payload changed", err)
	}
	feed, err := f.reviews.Public(ctx, f.game.Slug, "", "", "")
	if err != nil || feed.Count != 0 || len(feed.Items) != 0 {
		t.Fatal("pending review published or snapshot failed", err)
	}
	if _, err = f.reviews.Moderate(ctx, f.buyer, v.Review.ID, "publish", reviews.Action{Version: 1, PolicyChecked: true, Note: "Forged moderation"}); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer moderator", err)
	}
	if _, err = f.reviews.Moderate(ctx, f.admin, v.Review.ID, "reject", reviews.Action{Version: 1, ReasonCode: "low_rating", Note: "I dislike this score"}); !errors.Is(err, reviews.ErrInvalid) {
		t.Fatal("low rating reason accepted", err)
	}
	if _, err = f.reviews.Moderate(ctx, f.admin, v.Review.ID, "publish", reviews.Action{Version: 1, Note: "Missing explicit check"}); !errors.Is(err, reviews.ErrInvalid) {
		t.Fatal("unchecked publication", err)
	}
	v = f.publish(t, v)
	feed, err = f.reviews.Public(ctx, f.game.Slug, "boost", "pack", "")
	if err != nil || feed.Count != 1 || feed.RatingSum != 1 || len(feed.Items) != 1 || feed.Histogram[0].Count != 1 || feed.Items[0].PurchaseStatus != "verified_purchase" {
		t.Fatal("public aggregate", err)
	}
	raw, err := json.Marshal(feed)
	if err != nil {
		t.Fatal(err)
	}
	for _, private := range []string{f.buyer.User.ID, f.admin.User.ID, f.buyer.User.Email, paid.Order.ID, paid.Contract.ID, v.InternalReason} {
		if private != "" && strings.Contains(string(raw), private) {
			t.Fatal("private review metadata leaked")
		}
	}
	v, err = f.reviews.Moderate(ctx, f.admin, v.Review.ID, "respond", reviews.Action{Version: v.Review.Version, PolicyChecked: true, Response: "We acknowledge this feedback and will improve."})
	if err != nil {
		t.Fatal(err)
	}
	own, err := f.reviews.Get(ctx, f.buyer, v.Review.ID, false)
	if err != nil || own.InternalReason != "" || own.ReasonCode != "" || own.Response == "" {
		t.Fatal("private moderator note leaked or response lost", err)
	}
	if _, err = f.reviews.Get(ctx, f.other, v.Review.ID, false); !ent.IsNotFound(err) {
		t.Fatal("foreign private review", err)
	}
	if _, err = f.reviews.History(ctx, f.other, v.Review.ID, false, 0); !ent.IsNotFound(err) {
		t.Fatal("foreign revisions", err)
	}
	revisions, err := f.reviews.History(ctx, f.buyer, v.Review.ID, false, 0)
	if err != nil || len(revisions) != 3 {
		t.Fatal("missing review history", err)
	}
	for _, revision := range revisions {
		if revision.InternalReason != "" || revision.ReasonCode != "" || revision.Body != input.Body || revision.Rating != 1 {
			t.Fatal("moderation rewrote author data or leaked notes")
		}
	}
	// Later financial state changes label history, never silently remove the published low rating.
	if _, err = f.auth.client.OrderContract.UpdateOneID(paid.Contract.ID).SetPaymentState(ordercontract.PaymentStateFundsDetected).Save(ctx); err != nil {
		t.Fatal(err)
	}
	feed, err = f.reviews.Public(ctx, f.game.Slug, "", "", "")
	if err != nil || feed.Count != 1 || feed.RatingSum != 1 || feed.Items[0].PurchaseStatus != "purchase_status_updated" {
		t.Fatal("financial reversal erased feedback", err)
	}
	if _, err = f.auth.client.OrderContract.UpdateOneID(paid.Contract.ID).SetPaymentState(ordercontract.PaymentStateSettled).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.catalog.Mutate(ctx, f.admin, f.game.ID, "archive", catalog.Change{Revision: f.game.Revision}); err != nil {
		t.Fatal(err)
	}
	feed, err = f.reviews.Public(ctx, f.game.Slug, "", "", "")
	if err != nil || feed.Count != 1 || !feed.Game.Paused {
		t.Fatal("retiring sales erased feedback", err)
	}
}

func TestReviewsEditsModerationRacesAndWithdrawal(t *testing.T) {
	f := reviewDB(t)
	ctx := t.Context()
	paid := f.completed(t)
	input := f.feedback()
	var wg sync.WaitGroup
	var ids sync.Map
	for range 4 {
		wg.Go(func() {
			v, e := f.reviews.Save(ctx, f.buyer, paid.Order.ID, input)
			if e != nil {
				t.Error(e)
				return
			}
			ids.Store(v.Review.ID, true)
		})
	}
	wg.Wait()
	count := 0
	ids.Range(func(_, _ any) bool { count++; return true })
	if count != 1 {
		t.Fatal("multiple reviews for purchase")
	}
	v, err := f.reviews.Save(ctx, f.buyer, paid.Order.ID, input)
	if err != nil {
		t.Fatal(err)
	}
	v = f.publish(t, v)
	v, err = f.reviews.Moderate(ctx, f.admin, v.Review.ID, "respond", reviews.Action{Version: v.Review.Version, PolicyChecked: true, Response: "Response to the first revision."})
	if err != nil {
		t.Fatal(err)
	}
	input.Version = v.Review.Version
	input.Body = "Edited buyer feedback after discussing the issue."
	input.Rating = 3
	var wins atomic.Int64
	for range 3 {
		wg.Go(func() {
			_, e := f.reviews.Save(ctx, f.buyer, paid.Order.ID, input)
			if e == nil {
				wins.Add(1)
			} else if !errors.Is(e, reviews.ErrConflict) {
				t.Error(e)
			}
		})
	}
	wg.Wait()
	if wins.Load() != 1 {
		t.Fatal("stale edits committed")
	}
	v, err = f.reviews.Get(ctx, f.buyer, v.Review.ID, false)
	if err != nil || v.Response != "" || v.Review.State != "pending" || v.Review.Rating != 3 {
		t.Fatal("edit did not require moderation", err)
	}
	feed, err := f.reviews.Public(ctx, f.game.Slug, "", "", "")
	if err != nil || feed.Count != 0 {
		t.Fatal("unmoderated revision visible", err)
	}
	wins.Store(0)
	wg.Go(func() {
		_, e := f.reviews.Moderate(ctx, f.admin, v.Review.ID, "publish", reviews.Action{Version: v.Review.Version, PolicyChecked: true, Note: "Reviewed new feedback"})
		if e == nil {
			wins.Add(1)
		} else if !errors.Is(e, reviews.ErrConflict) {
			t.Error(e)
		}
	})
	wg.Go(func() {
		_, e := f.reviews.Withdraw(ctx, f.buyer, paid.Order.ID, v.Review.Version)
		if e == nil {
			wins.Add(1)
		} else if !errors.Is(e, reviews.ErrConflict) {
			t.Error(e)
		}
	})
	wg.Wait()
	if wins.Load() != 1 {
		t.Fatal("withdrawal/publication race")
	}
	v, err = f.reviews.Get(ctx, f.buyer, v.Review.ID, false)
	if err != nil {
		t.Fatal(err)
	}
	if v.Review.State != "withdrawn" {
		v, err = f.reviews.Withdraw(ctx, f.buyer, paid.Order.ID, v.Review.Version)
		if err != nil {
			t.Fatal(err)
		}
	}
	if _, err = f.reviews.Moderate(ctx, f.admin, v.Review.ID, "publish", reviews.Action{Version: v.Review.Version, PolicyChecked: true, Note: "Try to override author withdrawal"}); !errors.Is(err, reviews.ErrConflict) {
		t.Fatal("withdrawn review republished", err)
	}
	history, err := f.reviews.History(ctx, f.buyer, v.Review.ID, false, 0)
	if err != nil || len(history) != v.Review.Version || history[0].Body == history[3].Body {
		t.Fatal("revision history overwritten", err)
	}
}

func TestReviewsFreshFactorsSelfModerationAndAuditRollback(t *testing.T) {
	f := reviewDB(t)
	ctx := t.Context()
	paid := f.completed(t)
	second := f.completed(t)
	v, err := f.reviews.Save(ctx, f.buyer, paid.Order.ID, f.feedback())
	if err != nil {
		t.Fatal(err)
	}
	now := time.Unix(f.auth.clock.Load(), 0)
	action := reviews.Action{Version: v.Review.Version, PolicyChecked: true, Note: "Documented review decision"}
	if _, err = f.auth.client.AuthSession.UpdateOneID(f.admin.Session.ID).SetAuthenticatedAt(now.Add(-11 * time.Minute)).SetMfaVerifiedAt(now.Add(-11 * time.Minute)).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.reviews.Moderate(ctx, f.admin, v.Review.ID, "publish", action); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("two stale factors accepted", err)
	}
	if _, err = f.auth.client.AuthSession.UpdateOneID(f.admin.Session.ID).SetAuthenticatedAt(now).ClearMfaVerifiedAt().Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.reviews.Moderate(ctx, f.admin, v.Review.ID, "publish", action); !errors.Is(err, identity.ErrMFA) {
		t.Fatal("incomplete MFA sign-in accepted", err)
	}
	if _, err = f.auth.client.AuthSession.UpdateOneID(f.admin.Session.ID).SetMfaVerifiedAt(now).Save(ctx); err != nil {
		t.Fatal(err)
	}
	f.auth.clock.Add(121)
	_, customerStaff := f.auth.staffLogin(t, f.buyer.User.Email, identity.RoleAdmin)
	_, _, customerStaff = f.auth.enroll(t, customerStaff)
	if customerStaff.User.ID == f.buyer.User.ID {
		t.Fatal("staff account reused customer identity")
	}
	if _, err = f.reviews.Moderate(ctx, customerStaff, v.Review.ID, "publish", action); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("same-email self-moderation accepted", err)
	}
	if _, err = f.reviews.Save(ctx, customerStaff, second.Order.ID, f.feedback()); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("staff purchase review accepted", err)
	}
	if _, err = f.auth.db.ExecContext(ctx, "DROP TABLE auth_audits"); err != nil {
		t.Fatal(err)
	}
	if _, err = f.reviews.Moderate(ctx, f.admin, v.Review.ID, "publish", action); err == nil {
		t.Fatal("unaudited publication")
	}
	if _, err = f.reviews.Save(ctx, f.buyer, second.Order.ID, f.feedback()); err == nil {
		t.Fatal("unaudited feedback")
	}
	row, err := f.reviews.Get(ctx, f.buyer, v.Review.ID, false)
	if err != nil || row.Review.Version != 1 || row.Review.State != "pending" {
		t.Fatal("publication rollback failed", err)
	}
	if count, e := f.auth.client.Review.Query().Count(ctx); e != nil || count != 1 {
		t.Fatal("feedback rollback failed", e)
	}
	if count, e := f.auth.client.ReviewRevision.Query().Count(ctx); e != nil || count != 1 {
		t.Fatal("history rollback failed", e)
	}
	if count, e := f.auth.client.Notification.Query().Count(ctx); e != nil || count != 0 {
		t.Fatal("notice rollback failed", e)
	}
}

func TestReviewsPolicyChangesAndInputBounds(t *testing.T) {
	f := reviewDB(t)
	ctx := t.Context()
	paid := f.completed(t)
	input := f.feedback()
	for _, rating := range []int{-1, 0, 6, 128, 2147483647} {
		bad := input
		bad.Rating = rating
		if _, err := f.reviews.Save(ctx, f.buyer, paid.Order.ID, bad); !errors.Is(err, reviews.ErrInvalid) {
			t.Fatal("invalid rating accepted", rating, err)
		}
	}
	for _, body := range []string{"", strings.Repeat("界", 4001), "private\x00data", string([]byte{255})} {
		bad := input
		bad.Body = body
		if _, err := f.reviews.Save(ctx, f.buyer, paid.Order.ID, bad); !errors.Is(err, reviews.ErrInvalid) {
			t.Fatal("invalid body accepted", err)
		}
	}
	bad := input
	bad.AcceptPolicy = false
	if _, err := f.reviews.Save(ctx, f.buyer, paid.Order.ID, bad); !errors.Is(err, reviews.ErrInvalid) {
		t.Fatal("unaccepted policy", err)
	}
	v, err := f.reviews.Save(ctx, f.buyer, paid.Order.ID, input)
	if err != nil {
		t.Fatal(err)
	}
	previous := v.Policy.Policy.Content
	c := f.game.Configuration
	c.ReviewPolicy = &catalog.ReviewPolicy{Content: "A new synthetic publication policy.", Fields: []catalog.Field{{Key: "new_feedback", Label: "Updated feedback", Stage: "order", Type: "short_text", Required: true, MaxLength: 80}}}
	f.game, err = f.catalog.Mutate(ctx, f.admin, f.game.ID, "save", catalog.Change{Revision: f.game.Revision, Configuration: c})
	if err != nil {
		t.Fatal(err)
	}
	f.game, err = f.catalog.Mutate(ctx, f.admin, f.game.ID, "publish", catalog.Change{Revision: f.game.Revision})
	if err != nil {
		t.Fatal(err)
	}
	input.Version = v.Review.Version
	if _, err = f.reviews.Save(ctx, f.buyer, paid.Order.ID, input); !errors.Is(err, reviews.ErrConflict) {
		t.Fatal("unseen policy accepted", err)
	}
	input.PolicyReleaseID = f.game.CurrentRelease
	input.Answers = catalog.Answers{}
	if _, err = f.reviews.Save(ctx, f.buyer, paid.Order.ID, input); err == nil {
		t.Fatal("new required feedback bypassed")
	}
	input.Answers = catalog.Answers{"new_feedback": json.RawMessage(`"Synthetic updated answer"`)}
	input.Body = strings.Repeat("界", 4000)
	v, err = f.reviews.Save(ctx, f.buyer, paid.Order.ID, input)
	if err != nil || v.Policy.Policy.Content == previous {
		t.Fatal("new policy not saved", err)
	}
	history, err := f.reviews.History(ctx, f.buyer, v.Review.ID, false, 0)
	if err != nil || history[0].Policy.Policy.Content != previous || history[0].Body == history[1].Body {
		t.Fatal("accepted history overwritten", err)
	}
	if _, err = f.auth.client.User.UpdateOneID(f.buyer.User.ID).SetSuspended(true).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.reviews.Get(ctx, f.buyer, v.Review.ID, false); err == nil {
		t.Fatal("suspended author retained private access")
	}
}

func TestReviewsSnapshotCountsDuringModeration(t *testing.T) {
	f := reviewDB(t)
	ctx := t.Context()
	paid := f.completed(t)
	v, err := f.reviews.Save(ctx, f.buyer, paid.Order.ID, f.feedback())
	if err != nil {
		t.Fatal(err)
	}
	v = f.publish(t, v)
	var wg sync.WaitGroup
	wg.Go(func() {
		current := v
		for range 15 {
			next, e := f.reviews.Moderate(ctx, f.admin, current.Review.ID, "hide", reviews.Action{Version: current.Review.Version, ReasonCode: "privacy", Note: "Synthetic privacy moderation contention"})
			if e != nil {
				t.Error(e)
				return
			}
			current, e = f.reviews.Moderate(ctx, f.admin, next.Review.ID, "publish", reviews.Action{Version: next.Review.Version, PolicyChecked: true, Note: "Synthetic publication contention"})
			if e != nil {
				t.Error(e)
				return
			}
		}
	})
	for range 30 {
		feed, e := f.reviews.Public(ctx, f.game.Slug, "", "", "")
		if e != nil {
			t.Fatal(e)
		}
		if feed.Count != len(feed.Items) || feed.RatingSum != feed.Count || feed.Histogram[0].Count != feed.Count {
			t.Errorf("rating aggregate and page came from different snapshots: count=%d items=%d sum=%d buckets=%v", feed.Count, len(feed.Items), feed.RatingSum, feed.Histogram)
		}
	}
	wg.Wait()
}

func TestReviewsRepeatableSnapshotSQL(t *testing.T) {
	f := reviewDB(t)
	ctx := t.Context()
	paid := f.completed(t)
	v, err := f.reviews.Save(ctx, f.buyer, paid.Order.ID, f.feedback())
	if err != nil {
		t.Fatal(err)
	}
	v = f.publish(t, v)
	tx, err := f.auth.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelRepeatableRead})
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if e := tx.Rollback(); e != nil {
			t.Error(e)
		}
	}()
	var before, after int
	if err = tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM reviews WHERE game_id=? AND state='published' AND published_at IS NOT NULL", f.game.ID).Scan(&before); err != nil {
		t.Fatal(err)
	}
	if _, err = f.reviews.Moderate(ctx, f.admin, v.Review.ID, "hide", reviews.Action{Version: v.Review.Version, ReasonCode: "privacy", Note: "Test privacy decision"}); err != nil {
		t.Fatal(err)
	}
	if err = tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM reviews WHERE game_id=? AND state='published' AND published_at IS NOT NULL", f.game.ID).Scan(&after); err != nil {
		t.Fatal(err)
	}
	if before != after {
		t.Fatalf("snapshot changed: %d to %d", before, after)
	}
	var state string
	var published sql.NullTime
	if err = tx.QueryRowContext(ctx, "SELECT state,published_at FROM reviews WHERE game_id=? AND state='published' AND published_at IS NOT NULL ORDER BY published_at DESC,id DESC LIMIT 21", f.game.ID).Scan(&state, &published); err != nil {
		t.Fatal(err)
	}
	if state != "published" || !published.Valid {
		t.Fatalf("inconsistent indexed row state=%s published=%v", state, published.Valid)
	}
}

func TestReviewsPaginationFiltersAndRequestKeyScope(t *testing.T) {
	f := reviewDB(t)
	ctx := t.Context()
	seen := map[string]bool{}
	first := f.completed(t)
	input := f.feedback()
	v, err := f.reviews.Save(ctx, f.buyer, first.Order.ID, input)
	if err != nil {
		t.Fatal(err)
	}
	f.publish(t, v)
	second := f.completed(t)
	if _, err = f.reviews.Save(ctx, f.buyer, second.Order.ID, input); !errors.Is(err, reviews.ErrConflict) {
		t.Fatal("request key reused for another order", err)
	}
	for i := 1; i < 22; i++ {
		paid := second
		if i > 1 {
			paid = f.completed(t)
		}
		next := f.feedback()
		next.Rating = i%5 + 1
		row, e := f.reviews.Save(ctx, f.buyer, paid.Order.ID, next)
		if e != nil {
			t.Fatal(e)
		}
		f.publish(t, row)
	}
	cursor := ""
	total := 0
	for {
		feed, e := f.reviews.Public(ctx, f.game.Slug, "boost", "pack", cursor)
		if e != nil {
			t.Fatal(e)
		}
		if feed.Count != 22 || len(feed.Items) > 20 {
			t.Fatal("incorrect bounded aggregate", feed.Count, len(feed.Items))
		}
		for _, row := range feed.Items {
			if seen[row.ID] {
				t.Fatal("duplicate cursor result")
			}
			seen[row.ID] = true
			total++
		}
		if feed.Next == "" {
			break
		}
		if feed.Next == cursor {
			t.Fatal("nonprogressing cursor")
		}
		cursor = feed.Next
	}
	if total != 22 {
		t.Fatal("cursor lost results", total)
	}
	filtered, err := f.reviews.Public(ctx, f.game.Slug, "missing", "", "")
	if err != nil || filtered.Count != 0 || len(filtered.Items) != 0 {
		t.Fatal("service filter ignored", err)
	}
	own, err := f.reviews.List(ctx, f.buyer, false, "", "published")
	if err != nil || len(own.Items) != 22 {
		t.Fatal("own listing", err)
	}
	foreign, err := f.reviews.List(ctx, f.other, false, "", "")
	if err != nil || len(foreign.Items) != 0 {
		t.Fatal("foreign reviews listed", err)
	}
	for _, bad := range []string{"invalid!", strings.Repeat("x", 161)} {
		if _, err = f.reviews.Public(ctx, f.game.Slug, "", "", bad); !errors.Is(err, reviews.ErrInvalid) {
			t.Fatal("invalid public cursor", err)
		}
		if _, err = f.reviews.List(ctx, f.buyer, false, bad, ""); !errors.Is(err, reviews.ErrInvalid) {
			t.Fatal("invalid private cursor", err)
		}
	}
	if _, err = f.reviews.List(ctx, f.buyer, false, "", "invented"); !errors.Is(err, reviews.ErrInvalid) {
		t.Fatal("invalid state filter", err)
	}
	if _, err = f.reviews.History(ctx, f.buyer, v.Review.ID, false, -1); !errors.Is(err, reviews.ErrInvalid) {
		t.Fatal("invalid history offset", err)
	}
}

func TestReviewsMigratedUnverifiedCustomerStillConflictsWithStaff(t *testing.T) {
	f := reviewDB(t)
	ctx := t.Context()
	paid := f.completed(t)
	view, err := f.reviews.Save(ctx, f.buyer, paid.Order.ID, f.feedback())
	if err != nil {
		t.Fatal(err)
	}
	cloneID, err := identity.LegacyCustomerID(f.admin.User.ID)
	if err != nil {
		t.Fatal(err)
	}
	clone, err := f.auth.client.User.Create().SetID(cloneID).SetPortal(string(identity.PortalCustomer)).SetEmail(f.admin.User.Email).Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	executeSQL(t, f.auth.db, `INSERT INTO identity_namespace_splits (original_id,customer_id,created_at) VALUES (?,?,UTC_TIMESTAMP(6))`, f.admin.User.ID, clone.ID)
	// Model ownership as migration 41 records it, before the new customer has
	// performed any first verification. The immutable agreement stays intact.
	executeSQL(t, f.auth.db, "UPDATE reviews SET user_id=? WHERE id=?", clone.ID, view.Review.ID)
	executeSQL(t, f.auth.db, "UPDATE orders SET user_id=? WHERE id=?", clone.ID, paid.Order.ID)
	action := reviews.Action{Version: view.Review.Version, PolicyChecked: true, Note: "Reviewed feedback"}
	if _, err = f.reviews.Moderate(ctx, f.admin, view.Review.ID, "publish", action); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("original staff moderated its unverified migrated customer's review", err)
	}
}
