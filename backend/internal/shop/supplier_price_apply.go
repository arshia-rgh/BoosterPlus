package shop

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// errSkipped means an administrator changed the product after it was read; the
// next window checks the newer release instead of overwriting it.
var errSkipped = errors.New("supplier price check skipped")

// applyPrice records one check and, for markup-priced products only, publishes a
// new immutable release with the supplier's new cost. History, accepted orders,
// quotes and purchase snapshots keep their own releases and amounts.
func (s *Store) applyPrice(ctx context.Context, runID, lease string, seen priceObservation, outcome priceOutcome) (status string, err error) {
	err = s.auth.SystemTransaction(ctx, func(tx *ent.Tx) error {
		if _, e := s.fencedRun(ctx, tx, runID, lease); e != nil {
			return e
		}
		row, e := tx.ShopProduct.Get(ctx, seen.ProductID)
		if ent.IsNotFound(e) {
			return errSkipped
		}
		if e != nil {
			return e
		}
		if row.CurrentRelease != seen.ReleaseID || row.State != "published" && row.State != "paused" {
			return errSkipped
		}
		previous, e := tx.SupplierPriceReview.Get(ctx, row.ID)
		if e != nil && !ent.IsNotFound(e) {
			return e
		}
		releaseID := seen.ReleaseID
		if outcome.Status == priceRepriced {
			releaseID, e = s.reprice(ctx, tx, row, seen, outcome, runID)
			var invalid *Invalid
			if errors.As(e, &invalid) || errors.Is(e, ErrConflict) {
				outcome, releaseID, e = priceOutcome{Status: priceRefresh}, seen.ReleaseID, nil
			}
			if e != nil {
				return e
			}
		}
		var prior *reviewState
		if previous != nil {
			prior = &reviewState{Status: previous.Status, Attention: previous.Attention, ReleaseID: previous.ReleaseID, Quantity: previous.Quantity, Baseline: previous.BaselineTotal, Supplier: previous.SupplierTotal, Selling: previous.SellingMinor, Failures: previous.Failures, Version: previous.Version, DetectedAt: previous.DetectedAt, RepricedAt: previous.RepricedAt, FromMinor: previous.RepricedFromMinor, ToMinor: previous.RepricedToMinor, FromTotal: previous.RepricedFromTotal, ToTotal: previous.RepricedToTotal}
		}
		next := nextReview(prior, seen, outcome, releaseID, s.now())
		status = next.Status
		now := s.now()
		if previous == nil {
			_, e = tx.SupplierPriceReview.Create().SetID(row.ID).SetConnectionID(string(seen.Binding.Connection)).SetVersion(next.Version).SetStatus(next.Status).SetAttention(next.Attention).SetReleaseID(next.ReleaseID).
				SetQuantity(next.Quantity).SetBaselineTotal(next.Baseline).SetSupplierTotal(next.Supplier).SetSellingMinor(next.Selling).SetFailures(next.Failures).SetRunID(runID).SetCheckedAt(now).
				SetNillableDetectedAt(next.DetectedAt).SetNillableRepricedAt(next.RepricedAt).SetRepricedFromMinor(next.FromMinor).SetRepricedToMinor(next.ToMinor).SetRepricedFromTotal(next.FromTotal).SetRepricedToTotal(next.ToTotal).SetUpdatedAt(now).Save(ctx)
			return e
		}
		update := tx.SupplierPriceReview.UpdateOne(previous).SetConnectionID(string(seen.Binding.Connection)).SetVersion(next.Version).SetStatus(next.Status).SetAttention(next.Attention).SetReleaseID(next.ReleaseID).
			SetQuantity(next.Quantity).SetBaselineTotal(next.Baseline).SetSupplierTotal(next.Supplier).SetSellingMinor(next.Selling).SetFailures(next.Failures).SetRunID(runID).SetCheckedAt(now).
			SetNillableRepricedAt(next.RepricedAt).SetRepricedFromMinor(next.FromMinor).SetRepricedToMinor(next.ToMinor).SetRepricedFromTotal(next.FromTotal).SetRepricedToTotal(next.ToTotal).SetUpdatedAt(now)
		if next.DetectedAt == nil {
			update.ClearDetectedAt()
		} else {
			update.SetDetectedAt(*next.DetectedAt)
		}
		if next.Attention != "acknowledged" {
			update.SetAcknowledgedBy("").ClearAcknowledgedAt()
		}
		_, e = update.Save(ctx)
		return e
	})
	return status, err
}

// reprice repeats the publication checks for the current release with only the
// supplier cost and resulting variant price changed. A matching untouched draft
// receives the same price so a later manual publish does not restore it.
func (s *Store) reprice(ctx context.Context, tx *ent.Tx, row *ent.ShopProduct, seen priceObservation, outcome priceOutcome, runID string) (string, error) {
	release, err := tx.ShopProductRelease.Get(ctx, row.CurrentRelease)
	if err != nil {
		return "", err
	}
	current, err := tx.SupplierBinding.Get(ctx, release.ID)
	if err != nil {
		return "", err
	}
	if release.ProductID != row.ID || current.Data == nil || current.ShopProductID != row.ID {
		return "", ErrConflict
	}
	value, err := definition(release.Data)
	if err != nil {
		return "", err
	}
	if value.Supplier == nil || len(value.Variants) != 1 || value.Variants[0].UnitAmountMinor != seen.SellingMinor || current.Data.OverrideMinor != "" || current.Data.MarkupBPS != seen.Binding.MarkupBPS {
		return "", ErrConflict
	}
	binding := *current.Data
	binding.Product.Offers = append([]suppliers.Offer{}, binding.Product.Offers...)
	changed := false
	for i := range binding.Product.Offers {
		if binding.Product.Offers[i].ID == binding.OfferID {
			binding.Product.Offers[i].Cost, changed = outcome.UnitCost, true
		}
	}
	value.Variants[0].UnitAmountMinor = outcome.NewMinor
	if !changed || !supplierMatches(value, &binding) || !s.supplier.MerchantConfigured(binding.Connection, binding.MerchantID) {
		return "", ErrConflict
	}
	if issues := validateCurrentPublication(value); len(issues) > 0 {
		return "", &Invalid{issues}
	}
	if err = checkArtwork(ctx, tx.Client(), value); err != nil {
		return "", err
	}
	game, err := tx.Game.Get(ctx, row.GameID)
	if err != nil {
		return "", err
	}
	conn, err := tx.SupplierConnection.Get(ctx, string(binding.Connection))
	if err != nil {
		return "", err
	}
	if game.Archived || conn.MerchantID != binding.MerchantID {
		return "", ErrConflict
	}
	data, err := document(value)
	if err != nil {
		return "", err
	}
	now := s.now()
	next, err := tx.ShopProductRelease.Create().SetProductID(row.ID).SetVersion(row.Version + 1).SetData(data).SetCreatedAt(now).Save(ctx)
	if ent.IsConstraintError(err) {
		return "", ErrConflict
	}
	if err != nil {
		return "", err
	}
	if _, err = tx.SupplierBinding.Create().SetID(next.ID).SetReleaseID(next.ID).SetShopProductID(row.ID).SetData(&binding).SetCreatedAt(now).Save(ctx); err != nil {
		return "", err
	}
	update := tx.ShopProduct.UpdateOne(row).AddVersion(1).SetCurrentRelease(next.ID).SetUpdatedAt(now)
	if draftData, ok, draftErr := s.repriceDraft(ctx, tx, row, current.Data, &binding, seen.SellingMinor, outcome.NewMinor); draftErr != nil {
		return "", draftErr
	} else if ok {
		update.SetDraft(draftData)
	}
	row, err = update.Save(ctx)
	if err != nil {
		return "", err
	}
	note := "Automatic supplier price update " + seen.SellingMinor + " to " + outcome.NewMinor + " minor units."
	if _, err = tx.ShopProductEvent.Create().SetProductID(row.ID).SetVersion(row.Version).SetAction("supplier_repriced").SetActorID("").SetNote(note).SetCreatedAt(now).Save(ctx); err != nil {
		if ent.IsConstraintError(err) {
			return "", ErrConflict
		}
		return "", err
	}
	_, err = tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID("").SetActorReference("system:supplier-price-sync").SetAction("shop_product_supplier_repriced").SetTargetID(row.ID).
		SetMetadata(map[string]string{"version": strconv.Itoa(row.Version), "run": runID, "release": next.ID, "from_minor": seen.SellingMinor, "to_minor": outcome.NewMinor}).SetCreatedAt(now).Save(ctx)
	return next.ID, err
}

func (s *Store) repriceDraft(ctx context.Context, tx *ent.Tx, row *ent.ShopProduct, published, binding *suppliers.ListingBinding, from, to string) (map[string]any, bool, error) {
	draftBinding, err := tx.SupplierBinding.Get(ctx, row.ID)
	if ent.IsNotFound(err) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	value, err := definition(row.Draft)
	if err != nil {
		return nil, false, err
	}
	a, err := json.Marshal(draftBinding.Data)
	if err != nil {
		return nil, false, err
	}
	b, err := json.Marshal(published)
	if err != nil {
		return nil, false, err
	}
	if string(a) != string(b) || draftBinding.ReleaseID != nil || value.Supplier == nil || len(value.Variants) != 1 || value.Variants[0].UnitAmountMinor != from {
		return nil, false, nil
	}
	value.Variants[0].UnitAmountMinor = to
	data, err := document(value)
	if err != nil {
		return nil, false, err
	}
	if _, err = tx.SupplierBinding.UpdateOne(draftBinding).SetData(binding).Save(ctx); err != nil {
		return nil, false, err
	}
	return data, true, nil
}
