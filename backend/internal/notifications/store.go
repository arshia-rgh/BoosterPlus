// Package notifications owns private activity notices and reference-only delivery jobs.
package notifications

import (
	"context"
	"encoding/json"
	"errors"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/notification"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/sitecontent"
)

// Store sends generic activity notices; message bodies never enter email jobs.
type Store struct {
	client *ent.Client
	auth   *identity.Service
	origin string
}

// New validates the operator-configured origin used for links, never customer URLs.
func New(client *ent.Client, auth *identity.Service, origin string) (*Store, error) {
	u, err := url.Parse(origin)
	if err != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || u.Path != "" && u.Path != "/" || (u.Scheme != "http" && u.Scheme != "https") {
		return nil, errors.New("notification origin invalid")
	}
	return &Store{client, auth, strings.TrimRight(origin, "/")}, nil
}

// Enqueue persists a deduplicated notice and delivery reference in the caller's business transaction.
func Enqueue(ctx context.Context, tx *ent.Tx, userID, resourceID, eventID, kind string, now time.Time) error {
	if _, ok := path(kind, resourceID); !ok {
		return errors.New("notification kind invalid")
	}
	existing, err := tx.Notification.Query().Where(notification.UserIDEQ(userID), notification.MessageIDEQ(eventID)).Only(ctx)
	if err == nil {
		if existing.ResourceID != resourceID || existing.Kind != kind {
			return errors.New("notification idempotency conflict")
		}
		return nil
	}
	if !ent.IsNotFound(err) {
		return err
	}
	id, idErr := uuid.NewV7()
	if idErr != nil {
		return idErr
	}
	n, err := tx.Notification.Create().SetID(id.String()).SetUserID(userID).SetResourceID(resourceID).SetMessageID(eventID).SetKind(kind).SetCreatedAt(now).Save(ctx)
	if err != nil {
		return err
	}
	payload, err := json.Marshal(map[string]string{"notification_id": n.ID})
	if err != nil {
		return err
	}
	_, err = jobs.EnqueueEntTx(ctx, tx, "activity.email", "activity:"+n.ID, payload)
	return err
}
func path(kind, id string) (string, bool) {
	switch kind {
	case "review_customer":
		return "/orders/" + url.PathEscape(id) + "#purchase-review", true
	case "submission_seller":
		return "/sell/" + url.PathEscape(id), true
	case "coordination_booster":
		return "/booster/support/" + url.PathEscape(id), true
	case "conversation_customer":
		return "/support/" + url.PathEscape(id), true
	case "conversation_staff":
		return "/admin/support/" + url.PathEscape(id), true
	case "booking_staff", "order_staff":
		return "/booster/orders/" + url.PathEscape(id), true
	case "order_customer", "booking_customer":
		return "/orders/" + url.PathEscape(id), true
	default:
		return "", false
	}
}

// View exposes no email, private text, or provider delivery details.
type View struct {
	ID        string    `json:"id"`
	Kind      string    `json:"kind"`
	Href      string    `json:"href"`
	Read      bool      `json:"read"`
	CreatedAt time.Time `json:"created_at"`
}

// Listing is bounded and uses a UUID cursor within the authenticated account.
type Listing struct {
	Notifications []View `json:"notifications"`
	Next          string `json:"next"`
}

// List reads only the authenticated customer's notices.
func (s *Store) List(ctx context.Context, p *identity.Principal, after string) (Listing, error) {
	result := Listing{Notifications: []View{}}
	if err := identity.Require(p, "account"); err != nil {
		return result, err
	}
	if len(after) > 36 {
		return result, identity.ErrInvalid
	}
	q := s.client.Notification.Query().Where(notification.UserIDEQ(p.User.ID)).Order(ent.Desc(notification.FieldID)).Limit(51)
	if after != "" {
		q.Where(notification.IDLT(after))
	}
	rows, err := q.All(ctx)
	if err != nil {
		return result, err
	}
	if len(rows) > 50 {
		result.Next = rows[49].ID
		rows = rows[:50]
	}
	for _, row := range rows {
		href, ok := path(row.Kind, row.ResourceID)
		if !ok {
			return result, errors.New("notification kind invalid")
		}
		result.Notifications = append(result.Notifications, View{row.ID, row.Kind, href, row.ReadAt != nil, row.CreatedAt})
	}
	return result, nil
}

// Read marks an owned notice read and is idempotent for missing/unowned IDs.
func (s *Store) Read(ctx context.Context, p *identity.Principal, id string) error {
	return s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		_, err := tx.Notification.Update().Where(notification.IDEQ(id), notification.UserIDEQ(current.User.ID), notification.ReadAtIsNil()).SetReadAt(time.Now()).Save(ctx)
		return err
	})
}

// EmailHandler honors current preferences and authority. SMTP is at least once;
// retries after an ambiguous remote acceptance can duplicate email, never notices.
func (s *Store) EmailHandler(sender identity.Sender) jobs.Handler {
	return func(ctx context.Context, job jobs.Job) error {
		var ref struct {
			ID string `json:"notification_id"`
		}
		if err := json.Unmarshal(job.Payload, &ref); err != nil || ref.ID == "" {
			return errors.New("activity reference invalid")
		}
		row, err := s.client.Notification.Get(ctx, ref.ID)
		if ent.IsNotFound(err) {
			return nil
		}
		if err != nil {
			return err
		}
		if row.EmailState != notification.EmailStatePending {
			return nil
		}
		account, err := s.client.User.Get(ctx, row.UserID)
		if err != nil && !ent.IsNotFound(err) {
			return err
		}
		state := notification.EmailStateSuppressed
		if account != nil && !account.Suspended && account.NotifyUpdates && row.ReadAt == nil && row.CreatedAt.After(time.Now().Add(-7*24*time.Hour)) {
			allowed := row.Kind != "conversation_staff" || account.Role == identity.RoleAdmin || account.Role == identity.RoleOwner
			if row.Kind == "review_customer" {
				purchase, readErr := s.client.Order.Get(ctx, row.ResourceID)
				if readErr != nil && !ent.IsNotFound(readErr) {
					return readErr
				}
				allowed = purchase != nil && purchase.UserID == account.ID
			}
			if row.Kind == "submission_seller" {
				submission, readErr := s.client.AccountSubmission.Get(ctx, row.ResourceID)
				if readErr != nil && !ent.IsNotFound(readErr) {
					return readErr
				}
				allowed = submission != nil && submission.UserID == account.ID
			}
			if row.Kind == "booking_customer" || row.Kind == "booking_staff" {
				allowed, err = s.bookingAllowed(ctx, row, account)
				if err != nil {
					return err
				}
			}
			if row.Kind == "coordination_booster" {
				allowed, err = s.coordinationAllowed(ctx, row, account)
				if err != nil {
					return err
				}
			}
			if row.Kind == "order_staff" {
				allowed, err = s.staffOrderAllowed(ctx, row, account)
				if err != nil {
					return err
				}
			}
			href, ok := path(row.Kind, row.ResourceID)
			if !ok {
				return errors.New("activity kind invalid")
			}
			if allowed {
				messageCopy, copyErr := sitecontent.NotificationCopy(ctx, s.client)
				if copyErr != nil {
					return copyErr
				}
				if err = sender.Send(ctx, identity.Message{To: account.Email, Subject: messageCopy.ActivitySubject, Body: messageCopy.ActivityIntro + "\nSign in to read it:\n" + s.origin + href + "\n\nChange activity email preferences in your account settings.\n\n" + messageCopy.Footer}); err != nil {
					return errors.New("activity email delivery unavailable")
				}
				state = notification.EmailStateSent
			}
		}
		_, err = s.client.Notification.Update().Where(notification.IDEQ(row.ID), notification.EmailStateEQ(notification.EmailStatePending)).SetEmailState(state).SetEmailedAt(time.Now()).Save(ctx)
		return err
	}
}
