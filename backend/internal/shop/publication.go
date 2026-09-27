package shop

import (
	"context"
	"slices"
	"strconv"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopstock"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func nextState(state, action string, released bool) (string, error) {
	switch action {
	case "publish":
		if slices.Contains([]string{"draft", "published", "paused"}, state) {
			return "published", nil
		}
	case "pause":
		if state == "published" {
			return "paused", nil
		}
	case "resume":
		if state == "paused" && released {
			return "published", nil
		}
	case "archive":
		if slices.Contains([]string{"draft", "published", "paused"}, state) {
			return "archived", nil
		}
	case "restore":
		if state == "archived" {
			if released {
				return "paused", nil
			}
			return "draft", nil
		}
	}
	return "", ErrConflict
}

// Change publishes the exact saved revision or applies a reviewed lifecycle action.
// Restoration never automatically reactivates a previously public product.
func (s *Store) Change(ctx context.Context, p *identity.Principal, id string, version int, action string) (out Draft, err error) {
	if !validID(id) || !validVersion(version) || !slices.Contains([]string{"publish", "pause", "resume", "archive", "restore"}, action) {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, true, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.ShopProduct.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Version != version {
			return ErrConflict
		}
		state, e := nextState(row.State, action, row.CurrentRelease != "")
		if e != nil {
			return e
		}
		now := s.now()
		update := tx.ShopProduct.UpdateOne(row).AddVersion(1).SetState(state).SetUpdatedAt(now)
		if action == "publish" {
			value, decodeErr := definition(row.Draft)
			if decodeErr != nil {
				return decodeErr
			}
			if issues := Validate(value, true); len(issues) > 0 {
				return &Invalid{issues}
			}
			game, gameErr := tx.Game.Get(ctx, row.GameID)
			if gameErr != nil {
				return gameErr
			}
			if game.Archived {
				return ErrConflict
			}
			release, releaseErr := tx.ShopProductRelease.Create().SetProductID(id).SetVersion(row.Version + 1).SetData(row.Draft).SetCreatedAt(now).Save(ctx)
			if ent.IsConstraintError(releaseErr) {
				return ErrConflict
			}
			if releaseErr != nil {
				return releaseErr
			}
			update.SetCurrentRelease(release.ID)
			if e = publishStock(ctx, tx, id, release.ID, value, now); e != nil {
				return e
			}

		}
		row, e = update.Save(ctx)
		if e != nil {
			return e
		}
		if e = event(ctx, tx, current, row, action, "", now); e != nil {
			return e
		}
		out, e = draft(ctx, tx, row)
		return e
	})
	return out, err
}

// StockChange binds capacity updates to both current product and stock revisions.
type StockChange struct {
	Version      int    `json:"version"`
	StockVersion int    `json:"stock_version"`
	VariantKey   string `json:"variant_key"`
	Total        int    `json:"total"`
	Reason       string `json:"reason"`
}

// SetStock cannot reduce capacity below reserved or committed units.
func (s *Store) SetStock(ctx context.Context, p *identity.Principal, id string, input StockChange) (out Draft, err error) {
	if !validID(id) || !validVersion(input.Version) || !validVersion(input.StockVersion) || !keyPattern.MatchString(input.VariantKey) || input.Total < 0 || input.Total > 1000000000 || !text(input.Reason, 10, 2000) {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, true, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.ShopProduct.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Version != input.Version || row.State == "archived" || row.CurrentRelease == "" {
			return ErrConflict
		}
		release, e := tx.ShopProductRelease.Get(ctx, row.CurrentRelease)
		if e != nil {
			return e
		}
		if release.ProductID != id {
			return ErrConflict
		}
		value, e := definition(release.Data)
		if e != nil {
			return e
		}
		if !slices.ContainsFunc(value.Variants, func(v Variant) bool { return v.Key == input.VariantKey }) {
			return ErrConflict
		}
		stock, e := tx.ShopStock.Query().Where(shopstock.ProductIDEQ(id), shopstock.VariantKeyEQ(input.VariantKey)).Only(ctx)
		if e != nil {
			return e
		}
		if stock.Version != input.StockVersion || stock.Reserved < 0 || stock.Committed < 0 || stock.Reserved > 1000000000 || stock.Committed > 1000000000 || input.Total < stock.Reserved+stock.Committed {
			return ErrConflict
		}
		now := s.now()
		if _, e = tx.ShopStock.UpdateOne(stock).AddVersion(1).SetTotal(input.Total).SetUpdatedAt(now).Save(ctx); e != nil {
			return e
		}
		row, e = tx.ShopProduct.UpdateOne(row).AddVersion(1).SetUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		if e = event(ctx, tx, current, row, "stock_changed", input.Reason, now); e != nil {
			return e
		}
		out, e = draft(ctx, tx, row)
		return e
	})
	return out, err
}

// publishStock updates the searchable current-variant projection without changing commitments.
func publishStock(ctx context.Context, tx *ent.Tx, productID, releaseID string, value Definition, now time.Time) error {
	if _, err := tx.ShopStock.Update().Where(shopstock.ProductIDEQ(productID)).SetEnabled(false).Save(ctx); err != nil {
		return err
	}
	for _, variant := range value.Variants {
		row, err := tx.ShopStock.Query().Where(shopstock.ProductIDEQ(productID), shopstock.VariantKeyEQ(variant.Key)).Only(ctx)
		if ent.IsNotFound(err) {
			row, err = tx.ShopStock.Create().SetProductID(productID).SetVariantKey(variant.Key).SetUpdatedAt(now).Save(ctx)
		}
		if err != nil {
			return err
		}
		if !validVersion(row.Version) {
			return ErrConflict
		}
		if incompatible(row, variant) {
			return &Invalid{[]Issue{{Path: "variants", Message: "Published variant keys keep their region, platform and server. Use a new key for different compatibility."}}}
		}
		amount, err := strconv.ParseInt(variant.UnitAmountMinor, 10, 64)
		if err != nil {
			return ErrInvalid
		}
		_, err = tx.ShopStock.UpdateOne(row).AddVersion(1).SetReleaseID(releaseID).SetEnabled(variant.Enabled).SetLabel(variant.Label).SetRegion(variant.Region).SetPlatform(variant.Platform).SetServer(variant.Server).SetCurrency(variant.Currency).SetUnitAmountMinor(amount).SetMinQuantity(variant.MinQuantity).SetMaxQuantity(variant.MaxQuantity).SetUpdatedAt(now).Save(ctx)
		if err != nil {
			return err
		}
	}
	return nil
}

func incompatible(row *ent.ShopStock, variant Variant) bool {
	return row.ReleaseID != "" && (row.Region != variant.Region || row.Platform != variant.Platform || row.Server != variant.Server)
}
