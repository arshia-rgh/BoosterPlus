package catalog

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/catalogrelease"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/game"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/availabilityevents"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// ErrConflict requires the editor/customer to reload; stale writes never win silently.
var ErrConflict = errors.New("catalog revision changed")

// Invalid reports bounded configuration errors with safe paths and explanations.
type Invalid struct{ Issues []Issue }

func (e *Invalid) Error() string { return "catalog validation failed" }

// Store uses Ent queries and identity's authorization transaction boundary.
type Store struct {
	client *ent.Client
	auth   *identity.Service
}

// New constructs the catalog without running schema migrations or seed jobs.
func New(client *ent.Client, auth *identity.Service) *Store { return &Store{client, auth} }

// Draft includes publication state separately from editable public configuration.
type Draft struct {
	ID             string        `json:"id"`
	Slug           string        `json:"slug"`
	Revision       int           `json:"revision"`
	Published      bool          `json:"published"`
	Paused         bool          `json:"paused"`
	Archived       bool          `json:"archived"`
	CurrentRelease string        `json:"current_release"`
	Configuration  Configuration `json:"configuration"`
}

// Listing is a bounded page of catalog summaries without unpublished configuration.
type Listing struct {
	Games []Summary `json:"games"`
	Next  string    `json:"next"`
}

// Summary deliberately takes the public name/description from a release, not a draft.
type Summary struct {
	HeroLayout    *HeroLayout        `json:"hero_layout,omitempty"`
	Capabilities  []CapabilityPolicy `json:"capabilities"`
	IntakeEnabled bool               `json:"intake_enabled,omitempty"`
	ID            string             `json:"id"`
	Slug          string             `json:"slug"`
	Name          string             `json:"name"`
	Description   string             `json:"description"`
	Asset         string             `json:"asset"`
	AssetAlt      string             `json:"asset_alt"`
	Paused        bool               `json:"paused"`
	Published     bool               `json:"published"`
	Archived      bool               `json:"archived"`
	Revision      int                `json:"revision"`
}

// Release is customer-safe, excludes actor identity and always pins all components.
type Release struct {
	ID            string        `json:"id"`
	GameID        string        `json:"game_id"`
	Slug          string        `json:"slug"`
	Version       int           `json:"version"`
	Paused        bool          `json:"paused"`
	CreatedAt     time.Time     `json:"created_at"`
	Configuration Configuration `json:"configuration"`
}

func configuration(data map[string]any) (Configuration, error) {
	raw, err := json.Marshal(data)
	if err != nil {
		return Configuration{}, err
	}
	var c Configuration
	err = json.Unmarshal(raw, &c)
	return c, err
}
func document(c Configuration) (map[string]any, error) {
	raw, err := json.Marshal(c)
	if err != nil {
		return nil, err
	}
	var value map[string]any
	err = json.Unmarshal(raw, &value)
	return value, err
}
func draft(g *ent.Game) (Draft, error) {
	c, err := configuration(g.Configuration)
	return Draft{g.ID, g.Slug, g.Version, g.Published, g.Paused, g.Archived, g.CurrentRelease, c}, err
}

// List returns at most 50 entries with a stable slug cursor.
func (s *Store) List(ctx context.Context, p *identity.Principal, admin bool, after string) (Listing, error) {
	result := Listing{Games: []Summary{}}
	if admin {
		if err := identity.Require(p, "admin"); err != nil {
			return result, err
		}
	}
	if after != "" && !slugPattern.MatchString(after) {
		return result, &Invalid{[]Issue{{"after", "Invalid catalog cursor."}}}
	}
	query := s.client.Game.Query().Order(ent.Asc(game.FieldSlug)).Limit(51)
	if !admin {
		query.Where(game.PublishedEQ(true), game.ArchivedEQ(false))
	}
	if after != "" {
		query.Where(game.SlugGT(after))
	}
	rows, err := query.All(ctx)
	if err != nil {
		return result, err
	}
	if len(rows) > 50 {
		result.Next = rows[49].Slug
		rows = rows[:50]
	}
	releases := map[string]*ent.CatalogRelease{}
	if !admin && len(rows) > 0 {
		ids := make([]string, 0, len(rows))
		for _, g := range rows {
			ids = append(ids, g.CurrentRelease)
		}
		published, readErr := s.client.CatalogRelease.Query().Where(catalogrelease.IDIn(ids...)).All(ctx)
		if readErr != nil {
			return result, readErr
		}
		for _, release := range published {
			releases[release.ID] = release
		}
	}
	for _, g := range rows {
		var c Configuration
		if admin {
			c, err = configuration(g.Configuration)
		} else {
			release, ok := releases[g.CurrentRelease]
			if !ok || release.GameID != g.ID {
				return result, ErrConflict
			}
			c, err = configuration(release.Configuration)
		}
		if err != nil {
			return result, err
		}
		result.Games = append(result.Games, Summary{
			HeroLayout:   c.HeroLayout,
			Capabilities: Capabilities(c, g.Paused), IntakeEnabled: c.Intake != nil && Available(c, g.Paused, "accounts"),
			ID: g.ID, Slug: g.Slug, Name: c.Name, Description: c.Description, Asset: c.Asset, AssetAlt: c.AssetAlt,
			Paused: g.Paused, Published: g.Published, Archived: g.Archived, Revision: g.Version,
		})
	}
	return result, nil
}

// Draft returns an administrator's unpublished working copy.
func (s *Store) Draft(ctx context.Context, p *identity.Principal, id string) (Draft, error) {
	if err := identity.Require(p, "admin"); err != nil {
		return Draft{}, err
	}
	g, err := s.client.Game.Get(ctx, id)
	if err != nil {
		return Draft{}, err
	}
	return draft(g)
}

// Create starts a draft with a permanent slug. Names and descriptions remain editable.
func (s *Store) Create(ctx context.Context, p *identity.Principal, slug string, c Configuration) (Draft, error) {
	if !slugPattern.MatchString(slug) {
		return Draft{}, &Invalid{[]Issue{{"slug", "Use a lowercase URL slug, 1–80 characters."}}}
	}
	if issues := ValidateConfiguration(c, false); len(issues) > 0 {
		return Draft{}, &Invalid{issues}
	}
	data, err := document(c)
	if err != nil {
		return Draft{}, err
	}
	var output Draft
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, current *identity.Principal) error {
		g, createErr := tx.Game.Create().SetSlug(slug).SetName(c.Name).SetConfiguration(data).Save(ctx)
		if createErr != nil {
			if ent.IsConstraintError(createErr) {
				return ErrConflict
			}
			return createErr
		}
		output, createErr = draft(g)
		if createErr != nil {
			return createErr
		}
		return record(ctx, tx, current, "catalog.created", g.ID, g.Version)
	})
	return output, err
}

// Change is optimistic concurrency control for every catalog mutation.
type Change struct {
	Revision      int           `json:"revision"`
	Configuration Configuration `json:"configuration"`
}

// Mutate atomically saves, publishes or changes availability. Published snapshots
// are insert-only and cannot be overwritten or deleted through application APIs.
func (s *Store) Mutate(ctx context.Context, p *identity.Principal, id, action string, input Change) (Draft, error) {
	var output Draft
	if input.Revision < 1 {
		return output, ErrConflict
	}
	if action == "save" {
		if issues := ValidateConfiguration(input.Configuration, false); len(issues) > 0 {
			return output, &Invalid{issues}
		}
	}
	err := s.auth.StaffTransaction(ctx, p, action == "publish", func(tx *ent.Tx, current *identity.Principal) error {
		g, readErr := tx.Game.Get(ctx, id)
		if readErr != nil {
			return readErr
		}
		if g.Version != input.Revision || g.Version >= 2147483646 {
			return ErrConflict
		}
		update := tx.Game.Update().Where(game.IDEQ(id), game.VersionEQ(input.Revision)).AddVersion(1)
		switch action {
		case "save":
			data, encodeErr := document(input.Configuration)
			if encodeErr != nil {
				return encodeErr
			}
			update.SetConfiguration(data).SetName(input.Configuration.Name)
		case "publish":
			if g.Archived {
				return ErrConflict
			}
			c, decodeErr := configuration(g.Configuration)
			if decodeErr != nil {
				return decodeErr
			}
			if issues := ValidateConfiguration(c, true); len(issues) > 0 {
				return &Invalid{issues}
			}
			if err := validatePromotionTargets(ctx, tx.Client(), Release{GameID: g.ID, Slug: g.Slug, Configuration: c}, time.Now()); err != nil {
				return err
			}
			release, createErr := tx.CatalogRelease.Create().SetGameID(id).SetVersion(g.Version).SetConfiguration(g.Configuration).SetCreatedBy(current.User.ID).Save(ctx)
			if createErr != nil {
				return createErr
			}
			update.SetPublished(true).SetCurrentRelease(release.ID)
		case "pause":
			update.SetPaused(true)
		case "resume":
			if g.Archived {
				return ErrConflict
			}
			update.SetPaused(false)
		case "archive":
			update.SetArchived(true).SetPaused(true)
		case "restore":
			update.SetArchived(false) // Restoration keeps ordering paused until explicitly resumed.
		case "delete":
			hasHistory, historyErr := tx.CatalogRelease.Query().Where(catalogrelease.GameIDEQ(id)).Exist(ctx)
			if historyErr != nil {
				return historyErr
			}
			if hasHistory {
				return ErrConflict
			}
			count, deleteErr := tx.Game.Delete().Where(game.IDEQ(id), game.VersionEQ(input.Revision)).Exec(ctx)
			if deleteErr != nil {
				return deleteErr
			}
			if count != 1 {
				return ErrConflict
			}
			return record(ctx, tx, current, "catalog.deleted", id, g.Version)
		default:
			return &Invalid{[]Issue{{"action", "Unsupported catalog action."}}}
		}
		count, updateErr := update.Save(ctx)
		if updateErr != nil {
			return updateErr
		}
		if count != 1 {
			return ErrConflict
		}
		updated, getErr := tx.Game.Get(ctx, id)
		if getErr != nil {
			return getErr
		}
		output, getErr = draft(updated)
		if getErr != nil {
			return getErr
		}
		if action != "save" {
			if err := availabilityevents.Changed(ctx, tx, id); err != nil {
				return err
			}
		}
		return record(ctx, tx, current, "catalog."+action, id, updated.Version)
	})
	return output, err
}

func record(ctx context.Context, tx *ent.Tx, p *identity.Principal, action, id string, revision int) error {
	_, err := tx.AuthAudit.Create().SetID(rand.Text()).SetActorID(p.User.ID).SetAction(action).SetTargetID(id).SetCreatedAt(time.Now()).SetMetadata(map[string]string{"revision": strconv.Itoa(revision)}).Save(ctx)
	return err
}

// Published resolves only the current visible release; drafts and historical URLs
// never become anonymous routes just because their IDs can be guessed.
func (s *Store) Published(ctx context.Context, slug string) (Release, error) {
	view, err := s.publishedRelease(ctx, slug)
	// Test cases and inactive/future promotion definitions are staff planning
	// data. Public offers use the bounded, current eligibility projection only.
	for i := range view.Configuration.Services {
		if plan := view.Configuration.Services[i].Pricing; plan != nil {
			plan.Cases = nil
		}
	}
	if view.Configuration.Discovery != nil {
		view.Configuration.Discovery.Promotions = nil
	}
	return view, err
}
func (s *Store) publishedRelease(ctx context.Context, slug string) (Release, error) {
	g, err := s.client.Game.Query().Where(game.SlugEQ(slug), game.PublishedEQ(true), game.ArchivedEQ(false)).Only(ctx)
	if err != nil {
		return Release{}, err
	}
	r, err := s.client.CatalogRelease.Query().Where(catalogrelease.IDEQ(g.CurrentRelease), catalogrelease.GameIDEQ(g.ID)).Only(ctx)
	if err != nil {
		return Release{}, err
	}
	return releaseView(g, r)
}
func releaseView(g *ent.Game, r *ent.CatalogRelease) (Release, error) {
	c, err := configuration(r.Configuration)
	return Release{r.ID, g.ID, g.Slug, r.Version, g.Paused, r.CreatedAt, c}, err
}

// History reads a bounded page of immutable releases, even after archiving.
func (s *Store) History(ctx context.Context, p *identity.Principal, id string, before int) ([]Release, error) {
	if err := identity.Require(p, "admin"); err != nil {
		return nil, err
	}
	g, err := s.client.Game.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	q := s.client.CatalogRelease.Query().Where(catalogrelease.GameIDEQ(id)).Order(ent.Desc(catalogrelease.FieldVersion)).Limit(20)
	if before > 0 {
		q.Where(catalogrelease.VersionLT(before))
	}
	entries, err := q.All(ctx)
	if err != nil {
		return nil, err
	}
	result := make([]Release, 0, len(entries))
	for _, entry := range entries {
		view, viewErr := releaseView(g, entry)
		if viewErr != nil {
			return nil, viewErr
		}
		result = append(result, view)
	}
	return result, nil
}
