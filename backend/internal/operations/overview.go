package operations

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountsubmission"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/booking"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/mediafile"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/moneytransfer"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentattempt"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/privacyrequest"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/review"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Overview returns defined workflow counts and bounded action samples under current staff authority.
func (s *Store) Overview(ctx context.Context, p *identity.Principal) (out Overview, err error) {
	err = s.private(ctx, p, false, func(tx *ent.Tx, current *identity.Principal) error {
		now := s.now().UTC()
		out = Overview{ObservedAt: now, Cards: []Card{}, Requests: []Item{}, Sessions: []Item{}, Jobs: []Job{}}
		queries := []struct {
			key, label, detail, href string
			count                    func(context.Context) (int, error)
		}{
			{"financial_exceptions", "Payments requiring review", "Payment attempts with unresolved evidence or route issues.", "/admin/finance", tx.PaymentAttempt.Query().Where(paymentattempt.IssueNEQ("")).Count},
			{"outgoing", "Outgoing obligations pending", "Refund and seller payout obligations not yet confirmed or cancelled.", "/admin/finance", tx.MoneyTransfer.Query().Where(moneytransfer.StateNotIn("confirmed", "cancelled")).Count},
			{"cases", "Active service cases", "Open disputes and remedy cases holding an order.", "/admin/finance", tx.ServiceCase.Query().Where(servicecase.ActiveOrderIDNotNil()).Count},
			{"expiring_checkout", "Checkouts expiring within 24 hours", "Active payment attempts whose deadline is approaching.", "/admin/finance", tx.PaymentAttempt.Query().Where(paymentattempt.ActiveContractIDNotNil(), paymentattempt.ExpiresAtGT(now), paymentattempt.ExpiresAtLTE(now.Add(24*time.Hour))).Count},
			{"media_processing", "Files awaiting scanning", "Private uploads queued for antivirus and sanitization.", "/admin/media", tx.MediaFile.Query().Where(mediafile.StateEQ(mediafile.StateQueued)).Count},
			{"media_cleanup", "Files awaiting purge", "Revoked private files whose object cleanup is still pending.", "/admin/media", tx.MediaFile.Query().Where(mediafile.StateEQ(mediafile.StateDeleted), mediafile.PurgedAtIsNil()).Count},
			{"requests", "Requests to review", "Custom orders submitted for administrator review.", "/admin/orders", tx.Order.Query().Where(order.StateEQ(order.StateSubmitted)).Count},
			{"customer", "Waiting for customers", "Orders needing information or awaiting quote acceptance.", "/admin/orders", tx.Order.Query().Where(order.StateIn(order.StateNeedsInformation, order.StateQuoted)).Count},
			{"payment", "Awaiting payment", "Accepted commercial orders awaiting payment; this is not a settlement or revenue total.", "/admin/orders", tx.Order.Query().Where(order.StateEQ(order.StateAwaitingPayment)).Count},
			{"execution", "Queued and active orders", "Orders currently queued, in progress or on hold.", "/admin/orders", tx.Order.Query().Where(order.StateIn(order.StateQueued, order.StateInProgress, order.StateOnHold)).Count},
			{"completion", "Completion reviews", "Assigned work submitted for administrator completion review.", "/admin/orders", tx.Fulfillment.Query().Where(fulfillment.CompletionPendingEQ(true)).Count},
			{"intake", "Account submissions to review", "Submitted private account intake awaiting a staff decision.", "/admin/submissions", tx.AccountSubmission.Query().Where(accountsubmission.StateEQ(accountsubmission.StateSubmitted)).Count},
			{"terms", "Account reviews awaiting terms", "Reviewed submissions with no finalized resale agreement.", "/admin/submissions", tx.AccountSubmission.Query().Where(accountsubmission.StateEQ(accountsubmission.StateApprovedPendingTerms)).Count},
			{"reviews", "Purchase reviews to moderate", "Customer feedback pending its publication-policy decision.", "/admin/reviews", tx.Review.Query().Where(review.StateEQ(review.StatePending)).Count},
			{"support", "Unresolved support conversations", "Open or waiting conversations across private support workflows.", "/admin/support", tx.Conversation.Query().Where(conversation.StateIn(conversation.StateOpen, conversation.StateWaiting)).Count},
			{"unassigned", "Unassigned support conversations", "Unresolved conversations without an assigned administrator.", "/admin/support", tx.Conversation.Query().Where(conversation.StateIn(conversation.StateOpen, conversation.StateWaiting), conversation.AssignedToEQ("")).Count},
			{"sessions", "Confirmed sessions in the next 24 hours", "Confirmed bookings starting within the next 24 hours, measured in UTC.", "/admin/calendar", tx.Booking.Query().Where(booking.StateEQ(booking.StateConfirmed), booking.StartsAtGTE(now), booking.StartsAtLT(now.Add(24*time.Hour))).Count},
			{"proposals", "Session proposals to review", "Customer session proposals awaiting confirmation.", "/admin/calendar", tx.Booking.Query().Where(booking.StateEQ(booking.StateProposed)).Count},
		}
		for _, q := range queries {
			n, e := q.count(ctx)
			if e != nil {
				return e
			}
			out.Cards = append(out.Cards, Card{q.key, q.label, n, q.detail, q.href})
		}
		if current.User.Role == identity.RoleOwner {
			n, e := tx.PrivacyRequest.Query().Where(privacyrequest.StateNotIn("completed", "cancelled")).Count(ctx)
			if e != nil {
				return e
			}
			out.Cards = append(out.Cards, Card{"privacy", "Privacy requests requiring review", n, "Owner review, retention holds or pending file cleanup.", "/admin/privacy"})
		}
		requests, e := tx.Order.Query().Where(order.StateEQ(order.StateSubmitted)).Order(ent.Asc(order.FieldCreatedAt), ent.Asc(order.FieldID)).Limit(6).All(ctx)
		if e != nil {
			return e
		}
		for _, v := range requests {
			out.Requests = append(out.Requests, Item{v.GameName, string(v.State), "/admin/orders/" + v.ID, v.CreatedAt})
		}
		sessions, e := tx.Booking.Query().Where(booking.StateEQ(booking.StateConfirmed), booking.StartsAtGTE(now), booking.StartsAtLT(now.Add(24*time.Hour))).Order(ent.Asc(booking.FieldStartsAt), ent.Asc(booking.FieldID)).Limit(6).All(ctx)
		if e != nil {
			return e
		}
		for _, v := range sessions {
			out.Sessions = append(out.Sessions, Item{"Confirmed play-together session", string(v.State), "/admin/orders/" + v.OrderID, v.StartsAt})
		}
		queue, e := queuePage(ctx, tx, "failed", "", time.Time{}, "")
		if e != nil {
			return e
		}
		out.Jobs = queue.Items[:min(6, len(queue.Items))]
		return queueHealth(ctx, tx, &out)
	})
	return out, err
}
func queueHealth(ctx context.Context, tx *ent.Tx, out *Overview) (err error) {
	rows, e := tx.QueryContext(ctx, "SELECT state,COUNT(*) FROM jobs WHERE state IN ('failed','running') OR (state='pending' AND available_at<=UTC_TIMESTAMP(6)) GROUP BY state")
	if e != nil {
		return e
	}
	counts := map[string]int{"failed": 0, "running": 0, "pending": 0}
	for rows.Next() {
		var state string
		var n int
		if e = rows.Scan(&state, &n); e != nil {
			return errors.Join(e, rows.Close())
		}
		counts[state] = n
	}
	if e = errors.Join(rows.Err(), rows.Close()); e != nil {
		return e
	}
	out.Cards = append(out.Cards, Card{"failed_jobs", "Failed background tasks", counts["failed"], "Tasks that exhausted automatic retries. Inspect before retrying.", "/admin/jobs"}, Card{"due_jobs", "Runnable background tasks", counts["pending"], "Pending tasks whose scheduled run time has arrived.", "/admin/jobs?state=pending"}, Card{"running_jobs", "Running background tasks", counts["running"], "Tasks with a claimed worker lease; expired leases are recovered by the worker.", "/admin/jobs?state=running"})
	rows, e = tx.QueryContext(ctx, "SELECT MIN(available_at) FROM jobs WHERE state='pending' AND available_at<=UTC_TIMESTAMP(6)")
	if e != nil {
		return e
	}
	defer func() { err = errors.Join(err, rows.Close()) }()
	var at sql.NullTime
	if !rows.Next() {
		return errors.Join(errors.New("queue aggregate unavailable"), rows.Err())
	}
	if e = rows.Scan(&at); e != nil {
		return e
	}
	if at.Valid {
		out.OldestRunnableAt = &at.Time
	}
	return rows.Err()
}
