package availability

import (
	"context"
	"net/http"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/availabilitydelivery"
	sub "github.com/arshia-rgh/BoosterPlus/backend/ent/availabilitysubscription"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// StaffView exposes consent and delivery metadata without email addresses, hashes or unsubscribe tokens.
type StaffView struct {
	Subscription      View       `json:"subscription"`
	UserID            string     `json:"user_id"`
	ConsentVersion    string     `json:"consent_version"`
	SuppressionReason string     `json:"suppression_reason"`
	DeliveryState     string     `json:"delivery_state"`
	LastSentAt        *time.Time `json:"last_sent_at"`
}

// StaffListing is a bounded operational page.
type StaffListing struct {
	Subscriptions []StaffView `json:"subscriptions"`
	Next          string      `json:"next"`
}

// StaffList requires current staff authority on every page.
func (s *Store) StaffList(ctx context.Context, p *identity.Principal, after, userID, state string) (out StaffListing, err error) {
	out.Subscriptions = []StaffView{}
	if after != "" && !validID(after) || userID != "" && !validID(userID) {
		return out, ErrInvalid
	}
	if state != "" && state != "active" && state != "suppressed" && state != "unsubscribed" {
		return out, ErrInvalid
	}
	err = s.auth.AuthorizedTransaction(ctx, p, "admin", false, func(tx *ent.Tx, _ *identity.Principal) error {
		q := tx.AvailabilitySubscription.Query().Order(ent.Asc(sub.FieldID)).Limit(51)
		if after != "" {
			q.Where(sub.IDGT(after))
		}
		if userID != "" {
			q.Where(sub.UserIDEQ(userID))
		}
		if state != "" {
			q.Where(sub.StateEQ(state))
		}
		rows, e := q.All(ctx)
		if e != nil {
			return e
		}
		if len(rows) > 50 {
			out.Next = rows[49].ID
			rows = rows[:50]
		}
		for _, row := range rows {
			v, readErr := s.view(ctx, tx.Client(), row)
			if readErr != nil {
				return readErr
			}
			item := StaffView{Subscription: v, UserID: row.UserID, ConsentVersion: row.ConsentVersion, SuppressionReason: row.SuppressionReason}
			delivery, readErr := tx.AvailabilityDelivery.Query().Where(availabilitydelivery.SubscriptionIDEQ(row.ID)).Order(ent.Desc(availabilitydelivery.FieldCreatedAt), ent.Desc(availabilitydelivery.FieldID)).First(ctx)
			if readErr != nil && !ent.IsNotFound(readErr) {
				return readErr
			}
			if delivery != nil {
				item.DeliveryState = delivery.State
				item.LastSentAt = delivery.SentAt
			}
			out.Subscriptions = append(out.Subscriptions, item)
		}
		return nil
	})
	return out, err
}

// Suppress revokes delivery eligibility atomically; staff cannot manufacture customer consent.
func (s *Store) Suppress(ctx context.Context, p *identity.Principal, id string, version int) error {
	if !validID(id) || version < 1 || version >= maxVersion {
		return ErrInvalid
	}
	return s.auth.AuthorizedTransaction(ctx, p, "admin", true, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.AvailabilitySubscription.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Version != version {
			return ErrConflict
		}
		if _, e = tx.AvailabilitySubscription.UpdateOne(row).AddVersion(1).SetState("suppressed").SetSuppressionReason("staff_review").SetUpdatedAt(s.now()).Save(ctx); e != nil {
			return e
		}
		return s.audit(ctx, tx, current.User.ID, "", "staff_suppressed", id)
	})
}
func (s *Store) registerAdministration(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/admin/availability", s.auth.ProtectRate("admin", "staff-alerts", 120, time.Hour, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		v, e := s.StaffList(r.Context(), p, r.URL.Query().Get("after"), r.URL.Query().Get("customer"), r.URL.Query().Get("state"))
		if e != nil {
			return failure(w, e)
		}
		return write(w, v)
	}))
	mux.HandleFunc("POST /api/v1/admin/availability/{id}/suppress", s.auth.ProtectRate("admin", "staff-alerts", 120, time.Hour, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input struct {
			Version int `json:"version"`
		}
		if e := read(r, &input); e != nil {
			return failure(w, e)
		}
		if e := s.Suppress(r.Context(), p, r.PathValue("id"), input.Version); e != nil {
			return failure(w, e)
		}
		w.WriteHeader(http.StatusNoContent)
		return nil
	}))
}
