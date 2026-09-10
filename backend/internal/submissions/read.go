package submissions

import (
	"context"
	"encoding/base64"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountsubmission"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/submissionevent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Listing uses stable chronological pagination and omits private evidence.
type Listing struct {
	Items []Summary `json:"items"`
	Next  string    `json:"next"`
}

// List scopes customer histories at the SQL boundary; only admins can search the review queue.
func (s *Store) List(ctx context.Context, p *identity.Principal, admin bool, cursor, state string) (Listing, error) {
	result := Listing{Items: []Summary{}}
	if state != "" && accountsubmission.StateValidator(accountsubmission.State(state)) != nil {
		return result, ErrInvalid
	}
	if len(cursor) > 160 {
		return result, ErrInvalid
	}
	err := s.auth.AuthorizedTransaction(ctx, p, capability(admin), false, func(tx *ent.Tx, current *identity.Principal) error {
		result = Listing{Items: []Summary{}}
		q := tx.AccountSubmission.Query().Order(ent.Desc(accountsubmission.FieldCreatedAt), ent.Desc(accountsubmission.FieldID)).Limit(51)
		if !admin {
			q.Where(accountsubmission.UserIDEQ(current.User.ID))
		}
		if state != "" {
			q.Where(accountsubmission.StateEQ(accountsubmission.State(state)))
		}
		if cursor != "" {
			raw, err := base64.RawURLEncoding.DecodeString(cursor)
			if err != nil {
				return ErrInvalid
			}
			parts := strings.Split(string(raw), "\n")
			if len(parts) != 2 {
				return ErrInvalid
			}
			at, err := time.Parse(time.RFC3339Nano, parts[0])
			if err != nil {
				return ErrInvalid
			}
			if _, err = uuid.Parse(parts[1]); err != nil {
				return ErrInvalid
			}
			q.Where(accountsubmission.Or(accountsubmission.CreatedAtLT(at), accountsubmission.And(accountsubmission.CreatedAtEQ(at), accountsubmission.IDLT(parts[1]))))
		}
		rows, err := q.All(ctx)
		if err != nil {
			return err
		}
		if len(rows) > 50 {
			last := rows[49]
			result.Next = base64.RawURLEncoding.EncodeToString([]byte(last.CreatedAt.Format(time.RFC3339Nano) + "\n" + last.ID))
			rows = rows[:50]
		}
		for _, row := range rows {
			result.Items = append(result.Items, summary(row))
		}
		return nil
	})
	return result, err
}

// Event is private lifecycle history with roles rather than personal actor identities.
type Event struct {
	Version   int       `json:"version"`
	Action    string    `json:"action"`
	State     string    `json:"state"`
	Message   string    `json:"message"`
	ActorRole string    `json:"actor_role"`
	CreatedAt time.Time `json:"created_at"`
}

// Events supports bounded forward backfill, without embedding evidence in notification payloads.
func (s *Store) Events(ctx context.Context, p *identity.Principal, id string, admin bool, after int) ([]Event, error) {
	if after < 0 || after >= 2147483647 {
		return nil, ErrInvalid
	}
	result := []Event{}
	err := s.auth.AuthorizedTransaction(ctx, p, capability(admin), false, func(tx *ent.Tx, current *identity.Principal) error {
		if _, err := owned(ctx, tx.Client(), current, id, admin); err != nil {
			return err
		}
		rows, err := tx.SubmissionEvent.Query().Where(submissionevent.SubmissionIDEQ(id), submissionevent.VersionGT(after)).Order(ent.Asc(submissionevent.FieldVersion)).Limit(50).All(ctx)
		if err != nil {
			return err
		}
		result = []Event{}
		for _, row := range rows {
			result = append(result, Event{row.Version, row.Action, row.State, row.Message, row.ActorRole, row.CreatedAt})
		}
		return nil
	})
	return result, err
}
