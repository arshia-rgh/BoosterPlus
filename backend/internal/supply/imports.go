package supply

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierconnection"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierimport"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplieritem"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// ImportView exposes progress and a safe issue code, never raw provider failures.
type ImportView struct {
	ID           string               `json:"id"`
	Connection   suppliers.Connection `json:"connection"`
	State        string               `json:"state"`
	ProductCount int                  `json:"product_count"`
	OfferCount   int                  `json:"offer_count"`
	Issue        string               `json:"issue"`
	UpdatedAt    time.Time            `json:"updated_at"`
}

func importView(row *ent.SupplierImport) ImportView {
	return ImportView{row.ID, suppliers.Connection(row.ConnectionID), row.State, row.ProductCount, row.OfferCount, row.Issue, row.UpdatedAt}
}

// RequestImport queues a bounded read. The caller's UUID is also its idempotency key.
func (s *Store) RequestImport(ctx context.Context, p *identity.Principal, id suppliers.Connection, requestID string) (out ImportView, err error) {
	if !validConnection(id) || !validID(requestID) {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, current *identity.Principal) error {
		if s.readers[id] == nil {
			return ErrUnavailable
		}
		existing, e := tx.SupplierImport.Get(ctx, requestID)
		if e == nil {
			if existing.ConnectionID != string(id) || existing.CreatedBy != current.User.ID {
				return ErrConflict
			}
			out = importView(existing)
			return nil
		}
		if !ent.IsNotFound(e) {
			return e
		}
		row, e := connection(ctx, tx, id, s.now())
		if e != nil {
			return e
		}
		if row.ActiveImport != "" {
			return ErrConflict
		}
		now := s.now()
		run, e := tx.SupplierImport.Create().SetID(requestID).SetConnectionID(string(id)).SetCreatedBy(current.User.ID).
			SetAuthVersion(current.User.AuthVersion).SetCreatedAt(now).SetUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		if _, e = tx.SupplierConnection.UpdateOne(row).SetActiveImport(run.ID).SetUpdatedAt(now).Save(ctx); e != nil {
			return e
		}
		raw, e := json.Marshal(importJob{run.ID})
		if e != nil {
			return e
		}
		if _, e = jobs.EnqueueEntTx(ctx, tx, "supplier.import", "supplier-import:"+run.ID, raw); e != nil {
			return e
		}
		if e = audit(ctx, tx, current.User.ID, run.ID, "import_requested", 1, now); e != nil {
			return e
		}
		out = importView(run)
		return nil
	})
	return out, err
}

// Import rechecks portal authority before returning private progress.
func (s *Store) Import(ctx context.Context, p *identity.Principal, id string) (out ImportView, err error) {
	if !validID(id) {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, _ *identity.Principal) error {
		row, e := tx.SupplierImport.Get(ctx, id)
		if e != nil {
			return e
		}
		out = importView(row)
		return nil
	})
	return out, err
}

// CancelImport fences late workers; the previous complete catalog stays available.
func (s *Store) CancelImport(ctx context.Context, p *identity.Principal, id string) error {
	if !validID(id) {
		return ErrInvalid
	}
	return s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, current *identity.Principal) error {
		row, err := tx.SupplierImport.Get(ctx, id)
		if err != nil {
			return err
		}
		if row.State == "cancelled" {
			return nil
		}
		if row.State != "queued" && row.State != "loading" {
			return ErrConflict
		}
		if _, err = tx.SupplierImport.UpdateOne(row).SetState("cancelled").SetIssue("cancelled").SetLeaseOwner("").ClearLeaseUntil().SetUpdatedAt(s.now()).Save(ctx); err != nil {
			return err
		}
		if _, err = tx.SupplierConnection.Update().Where(supplierconnection.IDEQ(row.ConnectionID), supplierconnection.ActiveImportEQ(id)).SetActiveImport("").Save(ctx); err != nil {
			return err
		}
		return audit(ctx, tx, current.User.ID, id, "import_cancelled", 1, s.now())
	})
}

type importJob struct {
	ID string `json:"import_id"`
}

const importLease = 6 * time.Minute

// ImportHandler fetches outside SQL and only swaps the pointer after a complete import.
func (s *Store) ImportHandler() jobs.Handler {
	return func(ctx context.Context, job jobs.Job) error {
		var input importJob
		if json.Unmarshal(job.Payload, &input) != nil || !validID(input.ID) {
			return ErrInvalid
		}
		row, err := s.client.SupplierImport.Get(ctx, input.ID)
		if err != nil {
			return err
		}
		if row.State == "complete" || row.State == "failed" || row.State == "cancelled" {
			return nil
		}
		reader := s.readers[suppliers.Connection(row.ConnectionID)]
		if reader == nil {
			return ErrUnavailable
		}
		lease := uuid.NewString()
		claimed := false
		err = s.auth.StaffJobTransaction(ctx, row.CreatedBy, row.AuthVersion, func(tx *ent.Tx) error {
			current, e := tx.SupplierImport.Get(ctx, row.ID)
			if e != nil {
				return e
			}
			conn, e := tx.SupplierConnection.Get(ctx, row.ConnectionID)
			if e != nil {
				return e
			}
			if conn.ActiveImport != row.ID || current.State == "cancelled" || current.State == "failed" || current.State == "complete" {
				return nil
			}
			if current.State == "loading" && current.LeaseUntil != nil && current.LeaseUntil.After(s.now()) {
				return ErrConflict
			}
			if _, e = tx.SupplierItem.Delete().Where(supplieritem.ImportIDEQ(row.ID)).Exec(ctx); e != nil {
				return e
			}
			_, e = tx.SupplierImport.UpdateOne(current).SetState("loading").SetLeaseOwner(lease).SetLeaseUntil(s.now().Add(importLease)).SetProductCount(0).SetOfferCount(0).SetIssue("").SetUpdatedAt(s.now()).Save(ctx)
			claimed = e == nil
			return e
		})
		if err != nil || !claimed {
			return err
		}
		catalog, fetchErr := reader.Catalog(ctx)
		if fetchErr != nil {
			return s.finishFailed(ctx, row, lease, "supplier_unavailable")
		}
		if catalog.Connection != suppliers.Connection(row.ConnectionID) || len(catalog.Products) > 100000 {
			return s.finishFailed(ctx, row, lease, "catalog_invalid")
		}
		return s.writeImport(ctx, row, lease, catalog)
	}
}

func (s *Store) fenced(ctx context.Context, tx *ent.Tx, row *ent.SupplierImport, lease string) error {
	current, err := tx.SupplierImport.Get(ctx, row.ID)
	if err != nil {
		return err
	}
	conn, err := tx.SupplierConnection.Get(ctx, row.ConnectionID)
	if err != nil {
		return err
	}
	if conn.ActiveImport != row.ID || current.State != "loading" || current.LeaseOwner != lease || current.LeaseUntil == nil || !current.LeaseUntil.After(s.now()) {
		return ErrConflict
	}
	return nil
}

func (s *Store) finishFailed(ctx context.Context, row *ent.SupplierImport, lease, issue string) error {
	return s.auth.StaffJobTransaction(ctx, row.CreatedBy, row.AuthVersion, func(tx *ent.Tx) error {
		if err := s.fenced(ctx, tx, row, lease); err != nil {
			return err
		}
		if _, err := tx.SupplierImport.UpdateOneID(row.ID).SetState("failed").SetIssue(issue).SetLeaseOwner("").ClearLeaseUntil().SetUpdatedAt(s.now()).Save(ctx); err != nil {
			return err
		}
		_, err := tx.SupplierConnection.UpdateOneID(row.ConnectionID).SetActiveImport("").SetUpdatedAt(s.now()).Save(ctx)
		return err
	})
}

func (s *Store) writeImport(ctx context.Context, row *ent.SupplierImport, lease string, catalog suppliers.Catalog) error {
	// Bound each transaction; none of these rows is selectable until finalization.
	offers := 0
	for start := 0; start < len(catalog.Products); start += 50 {
		end := min(start+50, len(catalog.Products))
		err := s.auth.StaffJobTransaction(ctx, row.CreatedBy, row.AuthVersion, func(tx *ent.Tx) error {
			if e := s.fenced(ctx, tx, row, lease); e != nil {
				return e
			}
			builders := make([]*ent.SupplierItemCreate, 0, end-start)
			for i := start; i < end; i++ {
				product := catalog.Products[i]
				builders = append(builders, tx.SupplierItem.Create().SetID(uuid.NewString()).SetImportID(row.ID).SetConnectionID(row.ConnectionID).
					SetProductID(product.ID).SetGameID(product.GameID).SetCategoryID(product.CategoryID).SetTitle(product.Name).SetData(&product).SetCreatedAt(s.now()))
			}
			return tx.SupplierItem.CreateBulk(builders...).Exec(ctx)
		})
		if err != nil {
			return err
		}
	}
	for _, product := range catalog.Products {
		offers += len(product.Offers)
	}
	raw, err := json.Marshal(struct {
		Games      []suppliers.Game     `json:"games"`
		Categories []suppliers.Category `json:"categories"`
	}{catalog.Games, catalog.Categories})
	if err != nil {
		return ErrInvalid
	}
	var metadata map[string]any
	if json.Unmarshal(raw, &metadata) != nil {
		return ErrInvalid
	}
	return s.auth.StaffJobTransaction(ctx, row.CreatedBy, row.AuthVersion, func(tx *ent.Tx) error {
		if e := s.fenced(ctx, tx, row, lease); e != nil {
			return e
		}
		count, e := tx.SupplierItem.Query().Where(supplieritem.ImportIDEQ(row.ID)).Count(ctx)
		if e != nil {
			return e
		}
		if count != len(catalog.Products) {
			return ErrConflict
		}
		if _, e = tx.SupplierImport.Update().Where(supplierimport.IDEQ(row.ID), supplierimport.LeaseOwnerEQ(lease)).SetState("complete").SetMetadata(metadata).
			SetProductCount(count).SetOfferCount(offers).SetLeaseOwner("").ClearLeaseUntil().SetUpdatedAt(s.now()).Save(ctx); e != nil {
			return e
		}
		if _, e = tx.SupplierConnection.UpdateOneID(row.ConnectionID).SetCurrentImport(row.ID).SetActiveImport("").AddVersion(1).SetUpdatedAt(s.now()).Save(ctx); e != nil {
			return e
		}
		return audit(ctx, tx, row.CreatedBy, row.ID, "import_completed", 1, s.now())
	})
}
