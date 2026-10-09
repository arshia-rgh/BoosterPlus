package orders

import (
	"context"
	"slices"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/favorite"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// FavoriteInput identifies a current public offering by stable keys.
type FavoriteInput struct {
	Kind    string `json:"kind"`
	Slug    string `json:"slug"`
	Service string `json:"service"`
	Package string `json:"package"`
}

// FavoriteView retains the previously public name when an offering is unavailable.
type FavoriteView struct {
	ID        string `json:"id"`
	Kind      string `json:"kind"`
	Slug      string `json:"slug"`
	Service   string `json:"service"`
	Package   string `json:"package"`
	Name      string `json:"name"`
	Available bool   `json:"available"`
}

// FavoriteListing exposes one customer's saved offers only.
type FavoriteListing struct {
	Favorites []FavoriteView `json:"favorites"`
	Next      string         `json:"next"`
}

func favoriteName(release catalog.Release, input FavoriteInput) (string, error) {
	switch input.Kind {
	case "game":
		if input.Service != "" || input.Package != "" {
			return "", ErrConflict
		}
		return release.Configuration.Name, nil
	case "service":
		if input.Package != "" {
			return "", ErrConflict
		}
		i := slices.IndexFunc(release.Configuration.Services, func(s catalog.ServiceDefinition) bool { return s.Key == input.Service })
		if i < 0 {
			return "", ErrConflict
		}
		return release.Configuration.Name + " / " + release.Configuration.Services[i].Name, nil
	case "package":
		if input.Service != "" {
			return "", ErrConflict
		}
		i := slices.IndexFunc(release.Configuration.Packages, func(p catalog.Package) bool { return p.Key == input.Package })
		if i < 0 {
			return "", ErrConflict
		}
		return release.Configuration.Name + " / " + release.Configuration.Packages[i].Name, nil
	default:
		return "", invalid("kind", "Save a game, service or package.")
	}
}
func favoriteView(row *ent.Favorite, available bool) FavoriteView {
	return FavoriteView{row.ID, string(row.Kind), row.Slug, row.Service, row.PackageKey, row.Name, available}
}

func favoriteAvailable(release catalog.Release, kind string) bool {
	if kind == "game" {
		return slices.ContainsFunc(catalog.Capabilities(release.Configuration, release.Paused), func(policy catalog.CapabilityPolicy) bool {
			return policy.State == "active"
		})
	}
	return catalog.Available(release.Configuration, release.Paused, "boost")
}

// SaveFavorite is unique and idempotent per customer/offer, without reserving stock.
func (s *Store) SaveFavorite(ctx context.Context, p *identity.Principal, input FavoriteInput) (FavoriteView, error) {
	if len(input.Slug) > 80 || len(input.Service) > 48 || len(input.Package) > 48 {
		return FavoriteView{}, ErrConflict
	}
	if input.Kind == "account" {
		return s.saveAccountFavorite(ctx, p, input)
	}
	var result FavoriteView
	err := s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		release, readErr := catalog.New(tx.Client(), s.auth).Published(ctx, input.Slug)
		if readErr != nil {
			return readErr
		}
		name, readErr := favoriteName(release, input)
		if readErr != nil {
			return readErr
		}
		target := input.Kind + ":" + input.Slug + ":" + input.Service + ":" + input.Package
		row, readErr := tx.Favorite.Query().Where(favorite.UserIDEQ(current.User.ID), favorite.TargetEQ(target)).Only(ctx)
		if ent.IsNotFound(readErr) {
			row, readErr = tx.Favorite.Create().SetUserID(current.User.ID).SetTarget(target).SetSlug(input.Slug).SetService(input.Service).SetPackageKey(input.Package).SetKind(favorite.Kind(input.Kind)).SetName(name).SetCreatedAt(s.instant()).Save(ctx)
		}
		if readErr != nil {
			return readErr
		}
		result = favoriteView(row, favoriteAvailable(release, input.Kind))
		return nil
	})
	return result, err
}

// Favorites never exposes another customer's record, even through a guessed cursor.
func (s *Store) Favorites(ctx context.Context, p *identity.Principal, after string) (FavoriteListing, error) {
	result := FavoriteListing{Favorites: []FavoriteView{}}
	if err := identity.Require(p, "account"); err != nil {
		return result, err
	}
	q := s.client.Favorite.Query().Where(favorite.UserIDEQ(p.User.ID)).Order(ent.Asc(favorite.FieldID)).Limit(51)
	if after != "" {
		if _, err := uuid.Parse(after); err != nil {
			return result, ErrConflict
		}
		q.Where(favorite.IDGT(after))
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
		if row.Kind == favorite.KindAccount {
			available, readErr := accountFavoriteAvailable(ctx, s.client, row)
			if readErr != nil {
				return result, readErr
			}
			result.Favorites = append(result.Favorites, favoriteView(row, available))
			continue
		}
		available := false
		release, readErr := catalog.New(s.client, s.auth).Published(ctx, row.Slug)
		if readErr != nil && !ent.IsNotFound(readErr) {
			return result, readErr
		}
		if readErr == nil {
			_, nameErr := favoriteName(release, FavoriteInput{string(row.Kind), row.Slug, row.Service, row.PackageKey})
			available = nameErr == nil && favoriteAvailable(release, string(row.Kind))
		}
		result.Favorites = append(result.Favorites, favoriteView(row, available))
	}
	return result, nil
}

// RemoveFavorite is idempotent and cannot remove another customer's saved item.
func (s *Store) RemoveFavorite(ctx context.Context, p *identity.Principal, id string) error {
	return s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		_, err := tx.Favorite.Delete().Where(favorite.IDEQ(id), favorite.UserIDEQ(current.User.ID)).Exec(ctx)
		return err
	})
}

// ReorderDraft contains fresh configuration and safe candidate choices, not an order.
type ReorderDraft struct {
	Offer   catalog.Release `json:"offer"`
	Service string          `json:"service"`
	Package string          `json:"package"`
	Variant string          `json:"variant"`
	Kind    string          `json:"kind"`
	Answers catalog.Answers `json:"answers"`
	Issues  []catalog.Issue `json:"issues"`
}

// Reorder excludes free text, attachments, credentials, quotes, discounts and payments.
func (s *Store) Reorder(ctx context.Context, p *identity.Principal, id string) (ReorderDraft, error) {
	row, err := owned(ctx, s.client, p, id, false)
	if err != nil {
		return ReorderDraft{}, err
	}
	release, err := catalog.New(s.client, s.auth).Published(ctx, row.Slug)
	if err != nil {
		return ReorderDraft{}, err
	}
	if !catalog.Available(release.Configuration, release.Paused, "boost") {
		return ReorderDraft{}, ErrConflict
	}
	i := slices.IndexFunc(release.Configuration.Services, func(service catalog.ServiceDefinition) bool { return service.Key == row.Service })
	if i < 0 {
		return ReorderDraft{}, ErrConflict
	}
	original, err := decode[catalog.Answers](row.Answers)
	if err != nil {
		return ReorderDraft{}, err
	}
	originalOffer, err := decode[catalog.Release](row.Snapshot)
	if err != nil {
		return ReorderDraft{}, err
	}
	oldIndex := slices.IndexFunc(originalOffer.Configuration.Services, func(service catalog.ServiceDefinition) bool { return service.Key == row.Service })
	if oldIndex < 0 {
		return ReorderDraft{}, ErrConflict
	}
	copied := catalog.Answers{}
	for _, field := range release.Configuration.Services[i].Fields {
		if field.Stage == "fulfillment" || !slices.Contains([]string{"select", "radio", "multiselect", "boolean", "integer", "decimal", "win_rate", "rank"}, field.Type) {
			continue
		}
		oldField := slices.IndexFunc(originalOffer.Configuration.Services[oldIndex].Fields, func(f catalog.Field) bool {
			return f.Key == field.Key && f.Type == field.Type && f.Reference == field.Reference && f.Stage != "fulfillment"
		})
		if oldField >= 0 {
			if value, ok := original[field.Key]; ok {
				copied[field.Key] = slices.Clone(value)
			}
		}
	}
	missing := []catalog.Issue{}
	for _, field := range originalOffer.Configuration.Services[oldIndex].Fields {
		if field.Stage != "fulfillment" && slices.Contains([]string{"select", "radio", "multiselect", "boolean", "integer", "decimal", "win_rate", "rank"}, field.Type) {
			if _, existed := original[field.Key]; existed {
				if _, reused := copied[field.Key]; !reused {
					missing = append(missing, catalog.Issue{Path: field.Key, Message: "This previous selection changed or was removed. Review the current offering before submitting."})
				}
			}
		}
	}
	var variant *catalog.Variant
	if row.Kind == "package" {
		variant, err = variantFor(release, row.Service, row.PackageKey, row.VariantKey)
		if err != nil {
			return ReorderDraft{}, err
		}
	}
	validated := catalog.ValidateNewAnswers(release.Configuration, row.Service, "order", copied, variant)
	validated.Issues = append(validated.Issues, missing...)
	// Invalid choices remain issues requiring correction, but never become defaults
	// silently. The form renderer can show their absence without reviving removed options.
	for _, issue := range validated.Issues {
		delete(validated.Answers, issue.Path)
	}
	safe := catalog.Answers{}
	for _, field := range release.Configuration.Services[i].Fields {
		if field.Stage != "fulfillment" && slices.Contains([]string{"select", "radio", "multiselect", "boolean", "integer", "decimal", "win_rate", "rank"}, field.Type) {
			if raw, ok := validated.Answers[field.Key]; ok {
				safe[field.Key] = slices.Clone(raw)
			}
		}
	}
	return ReorderDraft{release, row.Service, row.PackageKey, row.VariantKey, string(row.Kind), safe, validated.Issues}, nil
}
