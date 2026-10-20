package supply

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// SetPurchases controls new purchases only. Existing provider obligations still
// reconcile while paused. Test activation cannot enable a live connection.
func (s *Store) SetPurchases(ctx context.Context, p *identity.Principal, id suppliers.Connection, version int, enabled bool) (out ConnectionView, err error) {
	if !validVersion(version) || (id != suppliers.NexusSandbox && id != suppliers.NexusProduction) {
		return out, ErrInvalid
	}
	if enabled && (!s.testPurchases || id != suppliers.NexusSandbox) {
		return out, suppliers.ErrReadOnly
	}
	err = s.auth.StaffTransaction(ctx, p, true, func(tx *ent.Tx, current *identity.Principal) error {
		if current.User.Role != identity.RoleOwner {
			return identity.ErrForbidden
		}
		row, e := tx.SupplierConnection.Get(ctx, string(id))
		if e != nil {
			return e
		}
		if row.Version != version {
			return ErrConflict
		}
		reader := s.readers[id]
		if enabled && (reader == nil || row.CurrentImport == "" || reader.MerchantID() != row.MerchantID) {
			return ErrConflict
		}
		row, e = tx.SupplierConnection.UpdateOne(row).SetPurchasesEnabled(enabled).AddVersion(1).SetUpdatedAt(s.now()).Save(ctx)
		if e != nil {
			return e
		}
		if e = audit(ctx, tx, current.User.ID, row.ID, "purchasing_changed", row.Version, s.now()); e != nil {
			return e
		}
		out = connectionView(row, reader != nil)
		return nil
	})
	return out, err
}
