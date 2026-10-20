package shop

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
)

func (s *Store) supplierPublication(ctx context.Context, tx *ent.Tx, row *ent.ShopProduct, value Definition, releaseID string) error {
	binding, err := tx.SupplierBinding.Get(ctx, row.ID)
	if err != nil {
		return err
	}
	if s.supplier == nil || binding.ReleaseID != nil || binding.ShopProductID != row.ID || !supplierMatches(value, binding.Data) || !s.supplier.MerchantConfigured(binding.Data.Connection, binding.Data.MerchantID) {
		return ErrConflict
	}
	conn, err := tx.SupplierConnection.Get(ctx, string(binding.Data.Connection))
	if err != nil {
		return err
	}
	if conn.MerchantID != binding.Data.MerchantID {
		return ErrConflict
	}
	if releaseID == "" {
		return nil
	}
	_, err = tx.SupplierBinding.Create().SetID(releaseID).SetReleaseID(releaseID).SetShopProductID(row.ID).SetData(binding.Data).SetCreatedAt(s.now()).Save(ctx)
	return err
}
