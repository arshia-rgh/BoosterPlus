package supply

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

func validMerchant(value string) bool {
	if len(value) < 1 || len(value) > 20 {
		return false
	}
	for _, c := range value {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

// purchaseConnection separates a local pause from merchant identity. Pausing
// creation must still permit GET reconciliation of an existing obligation.
func (s *Purchaser) purchaseConnection(ctx context.Context, tx *ent.Tx, row *ent.SupplierPurchase, creating bool) error {
	id := suppliers.Connection(row.ConnectionID)
	provider := s.providers[id]
	if provider == nil || !validMerchant(row.MerchantID) || provider.MerchantID() != row.MerchantID {
		return ErrUnavailable
	}
	conn, err := tx.SupplierConnection.Get(ctx, row.ConnectionID)
	if err != nil {
		return err
	}
	if conn.MerchantID != row.MerchantID {
		return ErrConflict
	}
	if creating && (!s.enabled || !id.Testing() || !conn.PurchasesEnabled) {
		return suppliers.ErrReadOnly
	}
	return nil
}
