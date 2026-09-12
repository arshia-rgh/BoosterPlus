package availability

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"strconv"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	delivery "github.com/arshia-rgh/BoosterPlus/backend/ent/availabilitydelivery"
	sub "github.com/arshia-rgh/BoosterPlus/backend/ent/availabilitysubscription"
	target "github.com/arshia-rgh/BoosterPlus/backend/ent/availabilitytarget"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/sitecontent"
)

type fanoutRef struct {
	TargetID string `json:"target_id"`
	Cycle    int    `json:"cycle"`
	After    string `json:"after"`
}

func enqueue(ctx context.Context, tx *ent.Tx, kind, key string, ref any) error {
	raw, e := json.Marshal(ref)
	if e != nil {
		return e
	}
	_, e = jobs.EnqueueEntTx(ctx, tx, kind, key, raw)
	return e
}
func (s *Store) refresh(ctx context.Context, tx *ent.Tx, t *ent.AvailabilityTarget) (*ent.AvailabilityTarget, error) {
	offer, e := readTarget(ctx, tx.Client(), t)
	if e != nil {
		return nil, e
	}
	update := tx.AvailabilityTarget.UpdateOne(t).SetAvailable(offer.available).SetCheckedAt(s.now())
	opened := offer.available && (!t.Available || t.Criteria != nil && offer.marker > t.StockMarker)
	if offer.marker > t.StockMarker {
		update.SetStockMarker(offer.marker)
	}
	if opened {
		if t.Cycle >= maxVersion {
			return nil, ErrConflict
		}
		update.AddCycle(1)
	}
	t, e = update.Save(ctx)
	if e != nil {
		return nil, e
	}
	if opened {
		e = enqueue(ctx, tx, "availability.fanout", "availability-fanout:"+t.ID+":"+strconv.Itoa(t.Cycle), fanoutRef{TargetID: t.ID, Cycle: t.Cycle})
	}
	return t, e
}

// ChangedHandler reconciles current capacity, coalescing fleeting/reordered changes.
func (s *Store) ChangedHandler() jobs.Handler {
	return func(ctx context.Context, job jobs.Job) error {
		var ref struct {
			GameID string `json:"game_id"`
		}
		if e := json.Unmarshal(job.Payload, &ref); e != nil || !validID(ref.GameID) {
			return ErrInvalid
		}
		return s.reconcile(ctx, ref.GameID)
	}
}

// Reconcile repairs missed events in bounded target pages, including unfinished fanout.
func (s *Store) Reconcile(ctx context.Context) error { return s.reconcile(ctx, "") }
func (s *Store) reconcile(ctx context.Context, gameID string) error {
	after := ""
	for {
		next, err := s.reconcilePage(ctx, gameID, after)
		if err != nil {
			return err
		}
		if next == "" {
			return nil
		}
		after = next
	}
}

// reconcilePage advances past individual failed targets so one broken offering cannot
// starve later subscriptions. The next complete sweep retries those failed targets.
func (s *Store) reconcilePage(ctx context.Context, gameID, after string) (string, error) {
	q := s.client.AvailabilityTarget.Query().Where(target.IDGT(after)).Order(ent.Asc(target.FieldID)).Limit(50)
	if gameID != "" {
		q.Where(target.GameIDEQ(gameID))
	}
	rows, err := q.All(ctx)
	if err != nil {
		return after, err
	}
	var failures error
	for _, row := range rows {
		err = s.fenced(ctx, func(tx *ent.Tx) error {
			t, e := tx.AvailabilityTarget.Get(ctx, row.ID)
			if e != nil {
				return e
			}
			t, e = s.refresh(ctx, tx, t)
			if e != nil {
				return e
			}
			return s.fanout(ctx, tx, fanoutRef{TargetID: t.ID, Cycle: t.Cycle})
		})
		failures = errors.Join(failures, err)
		after = row.ID
		if ctx.Err() != nil {
			return after, errors.Join(failures, ctx.Err())
		}
	}
	if len(rows) < 50 {
		return "", failures
	}
	return after, failures
}

// FanoutHandler emits at most 50 deliveries per short transaction and durable continuation.
func (s *Store) FanoutHandler() jobs.Handler {
	return func(ctx context.Context, job jobs.Job) error {
		var ref fanoutRef
		if e := json.Unmarshal(job.Payload, &ref); e != nil || !validID(ref.TargetID) || ref.Cycle < 1 || ref.Cycle > maxVersion || ref.After != "" && !validID(ref.After) {
			return ErrInvalid
		}
		return s.fenced(ctx, func(tx *ent.Tx) error { return s.fanout(ctx, tx, ref) })
	}
}
func (s *Store) fanout(ctx context.Context, tx *ent.Tx, ref fanoutRef) error {
	t, e := tx.AvailabilityTarget.Get(ctx, ref.TargetID)
	if ent.IsNotFound(e) {
		return nil
	}
	if e != nil {
		return e
	}
	if !t.Available || t.Cycle != ref.Cycle || t.Cycle == 0 {
		return nil
	}
	offer, e := readTarget(ctx, tx.Client(), t)
	if e != nil {
		return e
	}
	if !offer.available {
		return nil
	}
	rows, e := tx.AvailabilitySubscription.Query().Where(sub.TargetIDEQ(t.ID), sub.StateEQ("active"), sub.LastCycleLT(t.Cycle), sub.IDGT(ref.After)).Order(ent.Asc(sub.FieldID)).Limit(50).All(ctx)
	if e != nil {
		return e
	}
	for _, row := range rows {
		account, readErr := tx.User.Get(ctx, row.UserID)
		if readErr != nil && !ent.IsNotFound(readErr) {
			return readErr
		}
		if !s.eligible(account, row) {
			if _, e = tx.AvailabilitySubscription.UpdateOne(row).SetState("suppressed").SetSuppressionReason("identity_changed").SetUpdatedAt(s.now()).Save(ctx); e != nil {
				return e
			}
			continue
		}
		exists, readErr := tx.AvailabilityDelivery.Query().Where(delivery.SubscriptionIDEQ(row.ID), delivery.CycleEQ(t.Cycle)).Exist(ctx)
		if readErr != nil {
			return readErr
		}
		if !exists {
			d, createErr := tx.AvailabilityDelivery.Create().SetSubscriptionID(row.ID).SetTargetID(t.ID).SetSubscriptionVersion(row.Version).SetCycle(t.Cycle).SetEmailFingerprint(row.EmailFingerprint).SetState("pending").SetCreatedAt(s.now()).Save(ctx)
			if createErr != nil {
				return createErr
			}
			if e = enqueue(ctx, tx, "availability.email", "availability-email:"+d.ID, map[string]string{"delivery_id": d.ID}); e != nil {
				return e
			}
		}
		if _, e = tx.AvailabilitySubscription.UpdateOne(row).SetLastCycle(t.Cycle).Save(ctx); e != nil {
			return e
		}
	}
	if len(rows) == 50 {
		ref.After = rows[49].ID
		return enqueue(ctx, tx, "availability.fanout", "availability-fanout:"+t.ID+":"+strconv.Itoa(t.Cycle)+":"+ref.After, ref)
	}
	return nil
}
func (s *Store) eligible(account *ent.User, row *ent.AvailabilitySubscription) bool {
	return account != nil && !account.Suspended && account.EmailVerifiedAt != nil && row.State == "active" && row.ConsentVersion == ConsentVersion && row.EmailFingerprint == s.fingerprint(account.Email)
}

// RunReconciliation repairs reference processing every minute without holding a transaction across pages.
func (s *Store) RunReconciliation(ctx context.Context, logger *slog.Logger) {
	after := ""
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		check, cancel := context.WithTimeout(ctx, 45*time.Second)
		next, e := s.reconcilePage(check, "", after)
		after = next
		cancel()
		if e != nil {
			logger.ErrorContext(ctx, "availability reconciliation failed")
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

// EmailHandler rechecks current consent and live capacity before SMTP. Ambiguous
// acceptance can duplicate mail; an already in-flight send cannot be recalled.
func (s *Store) EmailHandler(sender identity.Sender) jobs.Handler {
	return func(ctx context.Context, job jobs.Job) error {
		var ref struct {
			ID string `json:"delivery_id"`
		}
		if e := json.Unmarshal(job.Payload, &ref); e != nil || !validID(ref.ID) {
			return ErrInvalid
		}
		var message *identity.Message
		e := s.fenced(ctx, func(tx *ent.Tx) error {
			d, readErr := tx.AvailabilityDelivery.Get(ctx, ref.ID)
			if ent.IsNotFound(readErr) {
				return nil
			}
			if readErr != nil {
				return readErr
			}
			if d.State != "pending" {
				return nil
			}
			row, readErr := tx.AvailabilitySubscription.Get(ctx, d.SubscriptionID)
			if readErr != nil {
				return readErr
			}
			account, readErr := tx.User.Get(ctx, row.UserID)
			if readErr != nil && !ent.IsNotFound(readErr) {
				return readErr
			}
			t, readErr := tx.AvailabilityTarget.Get(ctx, d.TargetID)
			if readErr != nil {
				return readErr
			}
			offer, readErr := readTarget(ctx, tx.Client(), t)
			if readErr != nil {
				return readErr
			}
			if !s.eligible(account, row) || row.Version != d.SubscriptionVersion || row.EmailFingerprint != d.EmailFingerprint || t.Cycle != d.Cycle || !offer.available || d.CreatedAt.Before(s.now().Add(-24*time.Hour)) {
				_, readErr = tx.AvailabilityDelivery.UpdateOne(d).SetState("suppressed").Save(ctx)
				return readErr
			}
			href := targetHref(s.origin, t)
			unsubscribe := s.origin + "/availability/unsubscribe#" + row.ID + "/" + strconv.Itoa(row.Version) + "/" + s.token(row)
			messageCopy, copyErr := sitecontent.NotificationCopy(ctx, tx.Client())
			if copyErr != nil {
				return copyErr
			}
			message = &identity.Message{To: account.Email, Subject: messageCopy.AvailabilitySubject, Body: messageCopy.AvailabilityIntro + "\nCheck its current price, eligibility and availability before ordering. This email is not a reservation or purchase guarantee.\n" + href + "\n\nStop these availability emails:\n" + unsubscribe + "\n\nManage all availability alerts: " + s.origin + "/availability" + "\n\n" + messageCopy.Footer}
			return nil
		})
		if e != nil {
			return e
		}
		if message == nil {
			return nil
		}
		if e = sender.Send(ctx, *message); e != nil {
			return errors.New("availability email delivery unavailable")
		}
		_, e = s.client.AvailabilityDelivery.Update().Where(delivery.IDEQ(ref.ID), delivery.StateEQ("pending")).SetState("sent").SetSentAt(s.now()).Save(ctx)
		return e
	}
}
