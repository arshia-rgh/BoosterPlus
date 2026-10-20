package shop

import (
	"context"
	"encoding/json"
	"errors"
	"slices"
	"strconv"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopstock"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/supply"
)

// ErrConflict requires reviewing the current product or capacity revision.
var ErrConflict = errors.New("shop revision or state changed")

// Invalid returns safe configuration findings.
type Invalid struct{ Issues []Issue }

func (e *Invalid) Error() string { return "shop validation failed" }

// Store uses current portal authority and explicit SQL-owned persistence.
type Store struct {
	client   *ent.Client
	auth     *identity.Service
	now      func() time.Time
	supplier *supply.Purchaser
}

// New constructs a store without running migrations or seeding commercial terms.
func New(client *ent.Client, auth *identity.Service, now func() time.Time) *Store {
	if now == nil {
		now = time.Now
	}
	return &Store{client: client, auth: auth, now: now}
}

// WithSupplier attaches a fixed-environment purchaser without enabling buying.
func (s *Store) WithSupplier(purchaser *supply.Purchaser) *Store {
	s.supplier = purchaser
	return s
}

// Stock separates commitments from declared capacity.
type Stock struct {
	VariantKey string `json:"variant_key"`
	Version    int    `json:"version"`
	Total      int    `json:"total"`
	Reserved   int    `json:"reserved"`
	Committed  int    `json:"committed"`
	Available  int    `json:"available"`
}

// Draft is a private staff projection, never the public catalog response.
type Draft struct {
	ID             string     `json:"id"`
	GameID         string     `json:"game_id"`
	Slug           string     `json:"slug"`
	Game           string     `json:"game"`
	Version        int        `json:"version"`
	State          string     `json:"state"`
	Definition     Definition `json:"draft"`
	CurrentRelease string     `json:"current_release"`
	Stocks         []Stock    `json:"stocks"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

func document(value Definition) (map[string]any, error) {
	if value.Variants == nil {
		value.Variants = []Variant{}
	}
	if value.Recipient == nil {
		value.Recipient = []RecipientField{}
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	var out map[string]any
	err = json.Unmarshal(raw, &out)
	return out, err
}
func definition(value map[string]any) (Definition, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return Definition{}, err
	}
	var out Definition
	err = json.Unmarshal(raw, &out)
	return out, err
}
func validID(value string) bool {
	id, err := uuid.Parse(value)
	return err == nil && id.String() == value
}
func validVersion(value int) bool { return value >= 1 && value < 2147483645 }
func draft(ctx context.Context, tx *ent.Tx, row *ent.ShopProduct) (Draft, error) {
	value, err := definition(row.Draft)
	if err != nil {
		return Draft{}, err
	}
	keys := make([]string, 0, len(value.Variants))
	for _, v := range value.Variants {
		keys = append(keys, v.Key)
	}
	if row.CurrentRelease != "" {
		release, e := tx.ShopProductRelease.Get(ctx, row.CurrentRelease)
		if e != nil {
			return Draft{}, e
		}
		if release.ProductID != row.ID {
			return Draft{}, ErrConflict
		}
		current, e := definition(release.Data)
		if e != nil {
			return Draft{}, e
		}
		for _, v := range current.Variants {
			if !slices.Contains(keys, v.Key) {
				keys = append(keys, v.Key)
			}
		}
	}
	stocks, err := tx.ShopStock.Query().Where(shopstock.ProductIDEQ(row.ID), shopstock.VariantKeyIn(keys...)).Order(ent.Asc(shopstock.FieldVariantKey)).Limit(61).All(ctx)
	if err != nil {
		return Draft{}, err
	}
	if len(stocks) > 60 {
		return Draft{}, ErrConflict
	}
	out := Draft{ID: row.ID, GameID: row.GameID, Slug: row.Slug, Game: row.GameName, Version: row.Version, State: row.State, Definition: value, CurrentRelease: row.CurrentRelease, Stocks: []Stock{}, UpdatedAt: row.UpdatedAt}
	for _, stock := range stocks {
		available := stock.Total - stock.Reserved - stock.Committed
		if available < 0 {
			return Draft{}, ErrConflict
		}
		out.Stocks = append(out.Stocks, Stock{stock.VariantKey, stock.Version, stock.Total, stock.Reserved, stock.Committed, available})
	}
	return out, nil
}
func event(ctx context.Context, tx *ent.Tx, current *identity.Principal, row *ent.ShopProduct, action, note string, now time.Time) error {
	_, err := tx.ShopProductEvent.Create().SetProductID(row.ID).SetVersion(row.Version).SetAction(action).SetActorID(current.User.ID).SetNote(note).SetCreatedAt(now).Save(ctx)
	if ent.IsConstraintError(err) {
		return ErrConflict
	}
	if err != nil {
		return err
	}
	_, err = tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(current.User.ID).SetActorReference(current.User.ID).SetAction("shop_product_" + action).SetTargetID(row.ID).SetMetadata(map[string]string{"version": strconv.Itoa(row.Version)}).SetCreatedAt(now).Save(ctx)
	return err
}

// Create begins an unpublished product with no purchasable stock.
func (s *Store) Create(ctx context.Context, p *identity.Principal, gameID string, value Definition) (out Draft, err error) {
	if !validID(gameID) || value.Supplier != nil {
		return out, ErrInvalid
	}
	if issues := Validate(value, false); len(issues) > 0 {
		return out, &Invalid{issues}
	}
	data, err := document(value)
	if err != nil {
		return out, err
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, current *identity.Principal) error {
		if artworkErr := checkArtwork(ctx, tx.Client(), value); artworkErr != nil {
			return artworkErr
		}
		game, e := tx.Game.Get(ctx, gameID)
		if e != nil {
			return e
		}
		if game.Archived {
			return ErrConflict
		}
		id := uuid.NewString()
		now := s.now()
		row, e := tx.ShopProduct.Create().SetID(id).SetGameID(game.ID).SetGameName(game.Name).SetSlug(id).SetTitle(value.Title).SetDraft(data).SetCreatedAt(now).SetUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		if e = event(ctx, tx, current, row, "created", "", now); e != nil {
			return e
		}
		out, e = draft(ctx, tx, row)
		return e
	})
	return out, err
}

// Draft rechecks current administrator identity on every read.
func (s *Store) Draft(ctx context.Context, p *identity.Principal, id string) (out Draft, err error) {
	if !validID(id) {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, _ *identity.Principal) error {
		row, e := tx.ShopProduct.Get(ctx, id)
		if e != nil {
			return e
		}
		out, e = draft(ctx, tx, row)
		return e
	})
	return out, err
}

// Save preserves immutable publications and rejects stale editors atomically.
func (s *Store) Save(ctx context.Context, p *identity.Principal, id string, version int, value Definition) (out Draft, err error) {
	if !validID(id) || !validVersion(version) {
		return out, ErrInvalid
	}
	if issues := Validate(value, false); len(issues) > 0 {
		return out, &Invalid{issues}
	}
	data, err := document(value)
	if err != nil {
		return out, err
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, current *identity.Principal) error {
		if artworkErr := checkArtwork(ctx, tx.Client(), value); artworkErr != nil {
			return artworkErr
		}
		row, e := tx.ShopProduct.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Version != version || row.State == "archived" {
			return ErrConflict
		}
		previous, e := definition(row.Draft)
		if e != nil {
			return e
		}
		if !sameSupplier(previous.Supplier, value.Supplier) || previous.Supplier != nil && !slices.Equal(previous.Variants, value.Variants) {
			return &Invalid{[]Issue{{Path: "supplier", Message: "Refresh supplier pricing and delivery requirements from the supplier library."}}}
		}
		now := s.now()
		row, e = tx.ShopProduct.UpdateOne(row).AddVersion(1).SetDraft(data).SetTitle(value.Title).SetUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		if e = event(ctx, tx, current, row, "saved", "", now); e != nil {
			return e
		}
		out, e = draft(ctx, tx, row)
		return e
	})
	return out, err
}
