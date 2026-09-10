// Package submissions owns private seller intake before any commercial agreement.
package submissions

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountsubmission"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// ErrConflict requires reloading the observed submission or current intake catalog.
var ErrConflict = errors.New("submission changed or unavailable")

// ErrInvalid never echoes private ownership information.
var ErrInvalid = errors.New("invalid submission input")

// Store shares the identity authorization fence with private conversations and catalog changes.
type Store struct {
	client *ent.Client
	auth   *identity.Service
	now    func() time.Time
}

// New never runs migrations or creates commercial terms.
func New(client *ent.Client, auth *identity.Service, now func() time.Time) *Store {
	if now == nil {
		now = time.Now
	}
	return &Store{client, auth, now}
}
func capability(admin bool) string {
	if admin {
		return "admin"
	}
	return "account"
}
func text(value string, minimum, maximum int) bool {
	return utf8.ValidString(value) && utf8.RuneCountInString(strings.TrimSpace(value)) >= minimum && utf8.RuneCountInString(value) <= maximum && !strings.ContainsRune(value, 0)
}
func document(value any) (map[string]any, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	var out map[string]any
	err = json.Unmarshal(raw, &out)
	return out, err
}
func decode[T any](value map[string]any) (T, error) {
	var out T
	raw, err := json.Marshal(value)
	if err != nil {
		return out, err
	}
	err = json.Unmarshal(raw, &out)
	return out, err
}
func owned(ctx context.Context, c *ent.Client, p *identity.Principal, id string, admin bool) (*ent.AccountSubmission, error) {
	if err := identity.Require(p, capability(admin)); err != nil {
		return nil, err
	}
	q := c.AccountSubmission.Query().Where(accountsubmission.IDEQ(id))
	if !admin {
		q.Where(accountsubmission.UserIDEQ(p.User.ID))
	}
	return q.Only(ctx)
}

// CreateInput binds one private draft to the catalog the seller actually saw.
type CreateInput struct {
	RequestKey string `json:"request_key"`
	Slug       string `json:"slug"`
	ReleaseID  string `json:"release_id"`
	Title      string `json:"title"`
}

// Edit contains ordinary private data; screenshots belong to the scanned review conversation.
type Edit struct {
	Version           int             `json:"version"`
	Title             string          `json:"title"`
	Answers           catalog.Answers `json:"answers"`
	OwnershipNotes    string          `json:"ownership_notes"`
	OwnershipDeclared bool            `json:"ownership_declared"`
}

// Action cannot issue or accept commercial offers, mark ownership transferred or create payouts.
type Action struct {
	Version int    `json:"version"`
	Note    string `json:"note"`
}

// Summary omits form answers, account identities and ownership evidence from lists.
type Summary struct {
	ID        string    `json:"id"`
	Version   int       `json:"version"`
	Title     string    `json:"title"`
	Game      string    `json:"game"`
	State     string    `json:"state"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// View is private to the seller and authenticated administrators, never assigned boosters.
type View struct {
	Submission        Summary         `json:"submission"`
	Offer             catalog.Release `json:"offer"`
	Answers           catalog.Answers `json:"answers"`
	OwnershipNotes    string          `json:"ownership_notes"`
	OwnershipDeclared bool            `json:"ownership_declared"`
	Note              string          `json:"note"`
	ConversationID    string          `json:"conversation_id"`
}

func summary(row *ent.AccountSubmission) Summary {
	return Summary{row.ID, row.Version, row.Title, row.GameName, string(row.State), row.CreatedAt, row.UpdatedAt}
}
func view(ctx context.Context, c *ent.Client, row *ent.AccountSubmission) (View, error) {
	release, err := decode[catalog.Release](row.Snapshot)
	if err != nil {
		return View{}, err
	}
	answers, err := decode[catalog.Answers](row.Answers)
	if err != nil {
		return View{}, err
	}
	thread, err := c.Conversation.Query().Where(conversation.SubmissionIDEQ(row.ID), conversation.UserIDEQ(row.UserID), conversation.KindEQ(conversation.KindSubmission)).Only(ctx)
	if err != nil {
		return View{}, err
	}
	return View{summary(row), release, answers, row.OwnershipNotes, row.OwnershipDeclared, row.CurrentNote, thread.ID}, nil
}

// Get rechecks current account authority inside the read transaction.
func (s *Store) Get(ctx context.Context, p *identity.Principal, id string, admin bool) (View, error) {
	var result View
	err := s.auth.AuthorizedTransaction(ctx, p, capability(admin), false, func(tx *ent.Tx, current *identity.Principal) error {
		row, err := owned(ctx, tx.Client(), current, id, admin)
		if err != nil {
			return err
		}
		result, err = view(ctx, tx.Client(), row)
		return err
	})
	return result, err
}
