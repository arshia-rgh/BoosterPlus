package news

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Store retains immutable editorial revisions and live authorization.
type Store struct {
	client *ent.Client
	auth   *identity.Service
	now    func() time.Time
}

// New never migrates or seeds public content.
func New(c *ent.Client, a *identity.Service, now func() time.Time) *Store {
	if now == nil {
		now = time.Now
	}
	return &Store{c, a, now}
}

// Draft is a private saved editorial state, independent from its public revision.
type Draft struct {
	GameName          string     `json:"game_name"`
	ScheduleState     string     `json:"schedule_state"`
	ID                string     `json:"id"`
	GameID            string     `json:"game_id"`
	Version           int        `json:"version"`
	State             string     `json:"state"`
	RevisionID        string     `json:"revision_id"`
	CurrentRevision   string     `json:"current_revision"`
	ScheduledRevision string     `json:"scheduled_revision"`
	ScheduledAt       *time.Time `json:"scheduled_at"`
	PublishedAt       *time.Time `json:"published_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	Definition        Definition `json:"definition"`
}

func validID(v string) bool   { id, e := uuid.Parse(v); return e == nil && id.String() == v }
func validVersion(v int) bool { return v > 0 && v < 2147483645 }
func document(d Definition) (map[string]any, error) {
	if d.Blocks == nil {
		d.Blocks = []Block{}
	}
	raw, e := json.Marshal(d)
	if e != nil {
		return nil, e
	}
	var v map[string]any
	e = json.Unmarshal(raw, &v)
	return v, e
}
func decode(v map[string]any) (Definition, error) {
	raw, e := json.Marshal(v)
	if e != nil {
		return Definition{}, e
	}
	var d Definition
	e = json.Unmarshal(raw, &d)
	return d, e
}
func draft(ctx context.Context, tx *ent.Tx, row *ent.Article) (Draft, error) {
	r, e := tx.ArticleRevision.Get(ctx, row.DraftRevision)
	if e != nil {
		return Draft{}, e
	}
	if r.ArticleID != row.ID {
		return Draft{}, ErrConflict
	}
	d, e := decode(r.Data)
	if e != nil {
		return Draft{}, e
	}
	game, e := tx.Game.Get(ctx, row.GameID)
	if e != nil {
		return Draft{}, e
	}
	state, e := scheduleState(ctx, tx, row.ScheduleToken)
	if e != nil {
		return Draft{}, e
	}
	return Draft{GameName: game.Name, ScheduleState: state, ID: row.ID, GameID: row.GameID, Version: row.Version, State: row.State, RevisionID: row.DraftRevision, CurrentRevision: row.CurrentRevision, ScheduledRevision: row.ScheduledRevision, ScheduledAt: row.ScheduledAt, PublishedAt: row.PublishedAt, UpdatedAt: row.UpdatedAt, Definition: d}, nil
}
func event(ctx context.Context, tx *ent.Tx, row *ent.Article, actor, action, revision string, now time.Time) error {
	_, e := tx.ArticleEvent.Create().SetArticleID(row.ID).SetVersion(row.Version).SetAction(action).SetActorID(actor).SetRevisionID(revision).SetCreatedAt(now).Save(ctx)
	if e != nil {
		return e
	}
	_, e = tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(actor).SetActorReference(actor).SetAction("article_" + action).SetTargetID(row.ID).SetMetadata(map[string]string{"version": strconv.Itoa(row.Version), "revision": revision}).SetCreatedAt(now).Save(ctx)
	return e
}
func revision(ctx context.Context, tx *ent.Tx, id string, version int, d Definition, now time.Time) (*ent.ArticleRevision, error) {
	data, e := document(d)
	if e != nil {
		return nil, e
	}
	return tx.ArticleRevision.Create().SetArticleID(id).SetVersion(version).SetData(data).SetTitle(d.Title).SetSlug(d.Slug).SetKind(d.Kind).SetAuthor(d.Author).SetCreatedAt(now).Save(ctx)
}

// Create begins a private draft for a nonarchived game.
func (s *Store) Create(ctx context.Context, p *identity.Principal, gameID string, d Definition) (out Draft, err error) {
	if !validID(gameID) {
		return out, ErrInvalid
	}
	if issues := Validate(d, false); len(issues) > 0 {
		return out, &Invalid{issues}
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, current *identity.Principal) error {
		g, e := tx.Game.Get(ctx, gameID)
		if e != nil {
			return e
		}
		if g.Archived {
			return ErrConflict
		}
		now, id := s.now(), uuid.NewString()
		r, e := revision(ctx, tx, id, 1, d, now)
		if e != nil {
			return e
		}
		row, e := tx.Article.Create().SetID(id).SetGameID(gameID).SetState("draft").SetDraftRevision(r.ID).SetTitle(d.Title).SetKind(d.Kind).SetAuthor(d.Author).SetCreatedAt(now).SetUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		if e = event(ctx, tx, row, current.User.ID, "created", r.ID, now); e != nil {
			return e
		}
		out, e = draft(ctx, tx, row)
		return e
	})
	return out, err
}

// Draft checks the live administrator portal before disclosing private content.
func (s *Store) Draft(ctx context.Context, p *identity.Principal, id string) (out Draft, err error) {
	if !validID(id) {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, _ *identity.Principal) error {
		row, e := tx.Article.Get(ctx, id)
		if e != nil {
			return e
		}
		out, e = draft(ctx, tx, row)
		return e
	})
	return out, err
}

// Save creates an immutable revision; an existing scheduled revision remains pinned.
func (s *Store) Save(ctx context.Context, p *identity.Principal, id string, version int, d Definition) (out Draft, err error) {
	if !validID(id) || !validVersion(version) {
		return out, ErrInvalid
	}
	if issues := Validate(d, false); len(issues) > 0 {
		return out, &Invalid{issues}
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.Article.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Version != version || row.State == "archived" {
			return ErrConflict
		}
		now := s.now()
		r, e := revision(ctx, tx, id, version+1, d, now)
		if e != nil {
			return e
		}
		row, e = tx.Article.UpdateOne(row).AddVersion(1).SetDraftRevision(r.ID).SetTitle(d.Title).SetKind(d.Kind).SetAuthor(d.Author).SetUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		if e = event(ctx, tx, row, current.User.ID, "saved", r.ID, now); e != nil {
			return e
		}
		out, e = draft(ctx, tx, row)
		return e
	})
	return out, err
}

func scheduleState(ctx context.Context, tx *ent.Tx, token string) (state string, resultErr error) {
	if token == "" {
		return "", nil
	}
	rows, err := tx.QueryContext(ctx, "SELECT state FROM jobs WHERE idempotency_key=?", "article:"+token)
	if err != nil {
		return "", err
	}
	defer func() { resultErr = errors.Join(resultErr, rows.Close()) }()
	if !rows.Next() {
		return "missing", rows.Err()
	}
	if err = rows.Scan(&state); err != nil {
		return "", err
	}
	return state, rows.Err()
}
