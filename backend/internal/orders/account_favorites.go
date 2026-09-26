package orders

import (
	"context"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountlisting"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/favorite"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Account favorites store only previously published labels, never seller metadata.
// Package is the public listing ID for this distinct kind, preserving the existing API shape.
func (s *Store) saveAccountFavorite(ctx context.Context, p *identity.Principal, input FavoriteInput) (FavoriteView, error) {
	var result FavoriteView
	id, parseErr := uuid.Parse(input.Package)
	if input.Service != "" || parseErr != nil || id.String() != input.Package {
		return result, ErrConflict
	}
	err := s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		listing, e := tx.AccountListing.Query().Where(accountlisting.IDEQ(input.Package), accountlisting.SlugEQ(input.Slug), accountlisting.StateIn("published", "reserved", "sold")).Only(ctx)
		if e != nil {
			return e
		}
		key := "account:" + listing.ID
		row, e := tx.Favorite.Query().Where(favorite.UserIDEQ(current.User.ID), favorite.TargetEQ(key)).Only(ctx)
		if ent.IsNotFound(e) {
			count, countErr := tx.Favorite.Query().Where(favorite.UserIDEQ(current.User.ID)).Count(ctx)
			if countErr != nil {
				return countErr
			}
			if count >= 500 {
				return identity.ErrLimited
			}
			row, e = tx.Favorite.Create().SetUserID(current.User.ID).SetTarget(key).SetSlug(listing.Slug).SetKind(favorite.KindAccount).SetPackageKey(listing.ID).SetName(listing.PublicTitle).SetCreatedAt(s.instant()).Save(ctx)
		}
		if e != nil {
			return e
		}
		available, e := accountFavoriteAvailable(ctx, tx.Client(), row)
		result = favoriteView(row, available)
		return e
	})
	return result, err
}
func accountFavoriteAvailable(ctx context.Context, client *ent.Client, row *ent.Favorite) (bool, error) {
	listing, err := client.AccountListing.Query().Where(accountlisting.IDEQ(row.PackageKey), accountlisting.StateEQ("published")).Only(ctx)
	if ent.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	game, err := client.Game.Get(ctx, listing.GameID)
	if err != nil {
		return false, err
	}
	return catalog.GameAvailable(ctx, client, game, "accounts")
}
