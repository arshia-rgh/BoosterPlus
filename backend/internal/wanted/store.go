package wanted

import (
	"context"
	"database/sql"
	"errors"
	"strconv"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/game"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/wantedaccount"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Store applies live staff authorization and recent verification to every change.
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

func (s *Store) instant() time.Time { return s.now().UTC().Truncate(time.Microsecond) }

func audit(ctx context.Context, tx *ent.Tx, actor, action string, row *ent.WantedAccount, now time.Time) error {
	_, err := tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(actor).SetActorReference(actor).SetAction("wanted_account_" + action).SetTargetID(row.ID).
		SetMetadata(map[string]string{"game_id": row.GameID, "version": strconv.Itoa(row.Version), "visible": strconv.FormatBool(row.Visible)}).SetCreatedAt(now).Save(ctx)
	return err
}

func ordered(ctx context.Context, tx *ent.Tx, gameID string) ([]*ent.WantedAccount, error) {
	return tx.WantedAccount.Query().Where(wantedaccount.GameIDEQ(gameID)).Order(ent.Asc(wantedaccount.FieldPosition), ent.Asc(wantedaccount.FieldID)).All(ctx)
}

func shown(rows []*ent.WantedAccount, except string) int {
	count := 0
	for _, row := range rows {
		if row.Visible && row.ID != except {
			count++
		}
	}
	return count
}

func list(ctx context.Context, tx *ent.Tx, g *ent.Game) (List, error) {
	out := List{GameID: g.ID, GameName: g.Name, GameSlug: g.Slug, Limit: MaxPerGame, Shown: MaxShown, Items: []Entry{}}
	open, err := catalog.AccountSalesOpen(ctx, tx.Client(), g)
	if err != nil {
		return out, err
	}
	out.Open = open
	rows, err := ordered(ctx, tx, g.ID)
	for _, row := range rows {
		out.Items = append(out.Items, view(row))
	}
	return out, err
}

// List returns every entry for one game, including hidden entries.
func (s *Store) List(ctx context.Context, p *identity.Principal, gameID string) (out List, err error) {
	if !validID(gameID) {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, _ *identity.Principal) error {
		g, e := tx.Game.Get(ctx, gameID)
		if e != nil {
			return e
		}
		out, e = list(ctx, tx, g)
		return e
	})
	return out, err
}

// Create appends an entry. A retried request key returns the original entry.
func (s *Store) Create(ctx context.Context, p *identity.Principal, in CreateInput) (out Entry, err error) {
	if !validID(in.RequestKey) || !validID(in.GameID) {
		return out, ErrInvalid
	}
	in.Input = normalize(in.Input)
	if issues := Validate(in.Input); len(issues) > 0 {
		return out, &catalog.Invalid{Issues: issues}
	}
	hash := requestHash(in.GameID, in.Input)
	err = s.auth.StaffTransaction(ctx, p, true, func(tx *ent.Tx, current *identity.Principal) error {
		g, e := tx.Game.Get(ctx, in.GameID)
		if e != nil {
			return e
		}
		old, e := tx.WantedAccount.Query().Where(wantedaccount.GameIDEQ(g.ID), wantedaccount.RequestKeyEQ(in.RequestKey)).Only(ctx)
		if e == nil {
			if old.RequestHash != hash {
				return ErrConflict
			}
			out = view(old)
			return nil
		}
		if !ent.IsNotFound(e) {
			return e
		}
		if g.Archived {
			return ErrConflict
		}
		rows, e := ordered(ctx, tx, g.ID)
		if e != nil {
			return e
		}
		if len(rows) >= MaxPerGame {
			return ErrConflict
		}
		if in.Visible && shown(rows, "") >= MaxShown {
			return shownLimit()
		}
		position := 0
		if len(rows) > 0 {
			position = rows[len(rows)-1].Position + 1
		}
		now := s.instant()
		row, e := tx.WantedAccount.Create().SetGameID(g.ID).SetTitle(in.Title).SetDescription(in.Description).SetVisible(in.Visible).SetPosition(position).
			SetRequestKey(in.RequestKey).SetRequestHash(hash).SetCreatedBy(current.User.ID).SetUpdatedBy(current.User.ID).SetCreatedAt(now).SetUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		out = view(row)
		return audit(ctx, tx, current.User.ID, "created", row, now)
	})
	return out, err
}

// Update replaces title, description and visibility of the confirmed version.
func (s *Store) Update(ctx context.Context, p *identity.Principal, id string, in UpdateInput) (out Entry, err error) {
	if !validID(id) || !validVersion(in.Version) {
		return out, ErrInvalid
	}
	in.Input = normalize(in.Input)
	if issues := Validate(in.Input); len(issues) > 0 {
		return out, &catalog.Invalid{Issues: issues}
	}
	err = s.auth.StaffTransaction(ctx, p, true, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.WantedAccount.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Version != in.Version {
			return ErrConflict
		}
		if in.Visible && !row.Visible {
			rows, listErr := ordered(ctx, tx, row.GameID)
			if listErr != nil {
				return listErr
			}
			if shown(rows, row.ID) >= MaxShown {
				return shownLimit()
			}
		}
		action := "updated"
		if row.Visible != in.Visible && row.Title == in.Title && row.Description == in.Description {
			action = map[bool]string{true: "shown", false: "hidden"}[in.Visible]
		}
		now := s.instant()
		row, e = tx.WantedAccount.UpdateOne(row).SetTitle(in.Title).SetDescription(in.Description).SetVisible(in.Visible).AddVersion(1).SetUpdatedBy(current.User.ID).SetUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		out = view(row)
		return audit(ctx, tx, current.User.ID, action, row, now)
	})
	return out, err
}

// Move swaps an entry with its neighbour and returns the game's new order.
func (s *Store) Move(ctx context.Context, p *identity.Principal, id string, in MoveInput) (out List, err error) {
	if !validID(id) || !validVersion(in.Version) || (in.Direction != "up" && in.Direction != "down") {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, true, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.WantedAccount.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Version != in.Version {
			return ErrConflict
		}
		rows, e := ordered(ctx, tx, row.GameID)
		if e != nil {
			return e
		}
		index := -1
		for i, candidate := range rows {
			if candidate.ID == row.ID {
				index = i
			}
		}
		target := index - 1
		if in.Direction == "down" {
			target = index + 1
		}
		if index < 0 || target < 0 || target >= len(rows) {
			return ErrConflict
		}
		now := s.instant()
		// Renumber densely so legacy ties can never make a swap ineffective.
		rows[index], rows[target] = rows[target], rows[index]
		for position, candidate := range rows {
			if candidate.Position == position && candidate.ID != row.ID {
				continue
			}
			update := tx.WantedAccount.UpdateOne(candidate).SetPosition(position)
			if candidate.ID == row.ID {
				update.AddVersion(1).SetUpdatedBy(current.User.ID).SetUpdatedAt(now)
			}
			saved, saveErr := update.Save(ctx)
			if saveErr != nil {
				return saveErr
			}
			if saved.ID == row.ID {
				if saveErr = audit(ctx, tx, current.User.ID, "moved_"+in.Direction, saved, now); saveErr != nil {
					return saveErr
				}
			}
		}
		g, e := tx.Game.Get(ctx, row.GameID)
		if e != nil {
			return e
		}
		out, e = list(ctx, tx, g)
		return e
	})
	return out, err
}

// Delete permanently removes one confirmed entry; the audit keeps its identifier.
func (s *Store) Delete(ctx context.Context, p *identity.Principal, id string, in VersionInput) (err error) {
	if !validID(id) || !validVersion(in.Version) {
		return ErrInvalid
	}
	return s.auth.StaffTransaction(ctx, p, true, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.WantedAccount.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Version != in.Version {
			return ErrConflict
		}
		if e = tx.WantedAccount.DeleteOne(row).Exec(ctx); e != nil {
			return e
		}
		return audit(ctx, tx, current.User.ID, "deleted", row, s.instant())
	})
}

// Public returns shown entries only while the game accepts new account sales.
func (s *Store) Public(ctx context.Context, slug string) (out PublicList, err error) {
	out.Items = []PublicEntry{}
	if !slugPattern(slug) {
		return out, ErrUnavailable
	}
	ctx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()
	tx, err := s.client.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelRepeatableRead})
	if err != nil {
		return out, err
	}
	defer func() {
		if rollbackErr := tx.Rollback(); rollbackErr != nil && !errors.Is(rollbackErr, sql.ErrTxDone) {
			err = errors.Join(err, rollbackErr)
		}
	}()
	g, err := tx.Game.Query().Where(game.SlugEQ(slug)).Only(ctx)
	if ent.IsNotFound(err) {
		return out, ErrUnavailable
	}
	if err != nil {
		return out, err
	}
	available, err := catalog.AccountSalesOpen(ctx, tx.Client(), g)
	if err != nil {
		return out, err
	}
	if !available {
		return out, ErrUnavailable
	}
	rows, err := tx.WantedAccount.Query().Where(wantedaccount.GameIDEQ(g.ID), wantedaccount.VisibleEQ(true)).
		Order(ent.Asc(wantedaccount.FieldPosition), ent.Asc(wantedaccount.FieldID)).Limit(MaxShown).All(ctx)
	if err != nil {
		return out, err
	}
	for _, row := range rows {
		out.Items = append(out.Items, PublicEntry{ID: row.ID, Title: row.Title, Description: row.Description})
	}
	return out, nil
}

func slugPattern(v string) bool {
	if len(v) == 0 || len(v) > 80 || v[0] < 'a' || v[0] > 'z' {
		return false
	}
	for _, r := range v {
		if (r < 'a' || r > 'z') && (r < '0' || r > '9') && r != '-' {
			return false
		}
	}
	return true
}
