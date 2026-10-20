package supply

import (
	"context"
	"encoding/json"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierpurchase"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/suppliersignal"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// RecordStatusSignal authenticates the raw bytes on the selected connection,
// stores only a receipt and schedules GET reconciliation. It cannot settle a
// customer payment, claim a POST, complete delivery or disclose recipient data.
// Interactive signals have a separate workflow and are not acknowledged here.
func (s *Purchaser) RecordStatusSignal(ctx context.Context, connection suppliers.Connection, raw []byte, signatures []string) error {
	provider := s.providers[connection]
	if provider == nil {
		return suppliers.ErrSignature
	}
	signal, err := provider.VerifyWebhook(raw, signatures)
	if err != nil {
		return err
	}
	if signal.Connection != connection {
		return suppliers.ErrSignature
	}
	if !signal.Recognized {
		return nil
	}
	if signal.Type != "statusChange" {
		return ErrUnavailable
	}
	return s.transaction(ctx, func(tx *ent.Tx) error {
		exists, e := tx.SupplierSignal.Query().Where(suppliersignal.ConnectionIDEQ(string(connection)), suppliersignal.DigestEQ(signal.Digest)).Exist(ctx)
		if e != nil || exists {
			return e
		}
		query := tx.SupplierPurchase.Query().Where(supplierpurchase.ConnectionIDEQ(string(connection)), supplierpurchase.PostClaimedEQ(true))
		if validID(signal.Reference) {
			query.Where(supplierpurchase.IDEQ(signal.Reference))
		} else {
			query.Where(supplierpurchase.ProviderIDEQ(signal.OrderID))
		}
		row, e := query.Only(ctx)
		if ent.IsNotFound(e) {
			return ErrConflict
		}
		if e != nil {
			return e
		}
		if row.ProviderID != nil && *row.ProviderID != signal.OrderID {
			return ErrConflict
		}
		if e = s.purchaseConnection(ctx, tx, row, false); e != nil {
			return e
		}
		// The signed callback is still only a hint; a reference-only match never
		// binds an unknown provider ID without an authoritative matching order read.
		_, e = tx.SupplierSignal.Create().SetConnectionID(string(connection)).SetDigest(signal.Digest).SetPurchaseID(row.ID).SetProviderID(signal.OrderID).SetSignalType(signal.Type).SetCreatedAt(s.now()).Save(ctx)
		if e != nil {
			return e
		}
		payload, e := json.Marshal(map[string]string{"purchase_id": row.ID})
		if e != nil {
			return e
		}
		_, e = jobs.EnqueueEntTx(ctx, tx, "supplier.reconcile", "supplier-signal:"+string(connection)+":"+signal.Digest, payload)
		return e
	})
}

// ReconcileHandler cannot issue a create POST, even for a forged queue payload.
func (s *Purchaser) ReconcileHandler() jobs.Handler {
	return func(ctx context.Context, job jobs.Job) error {
		var input struct {
			ID string `json:"purchase_id"`
		}
		if json.Unmarshal(job.Payload, &input) != nil || !validID(input.ID) {
			return ErrInvalid
		}
		return s.Reconcile(ctx, input.ID)
	}
}
