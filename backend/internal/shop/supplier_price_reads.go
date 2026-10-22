package shop

import (
	"context"
	"strconv"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopproduct"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierprice"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierpricereview"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierpricerun"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// PriceReview is a private staff view of the latest automatic supplier check.
// Supplier amounts are exact USD decimals for the published quantity; selling
// amounts are USD cents.
type PriceReview struct {
	ProductID         string     `json:"product_id"`
	Title             string     `json:"title"`
	Game              string     `json:"game"`
	State             string     `json:"state"`
	SupplierProductID string     `json:"supplier_product_id"`
	Status            string     `json:"status"`
	Attention         string     `json:"attention"`
	Version           int        `json:"version"`
	Quantity          string     `json:"quantity"`
	BaselineTotal     string     `json:"baseline_total"`
	SupplierTotal     string     `json:"supplier_total"`
	SellingMinor      string     `json:"selling_minor"`
	Failures          int        `json:"failures"`
	CheckedAt         time.Time  `json:"checked_at"`
	DetectedAt        *time.Time `json:"detected_at"`
	RepricedAt        *time.Time `json:"repriced_at"`
	RepricedFromMinor string     `json:"repriced_from_minor"`
	RepricedToMinor   string     `json:"repriced_to_minor"`
	RepricedFromTotal string     `json:"repriced_from_total"`
	RepricedToTotal   string     `json:"repriced_to_total"`
}

// PriceRun summarizes one scheduled check window without provider details.
type PriceRun struct {
	State      string     `json:"state"`
	StartedAt  time.Time  `json:"started_at"`
	FinishedAt *time.Time `json:"finished_at"`
	Checked    int        `json:"checked"`
	Repriced   int        `json:"repriced"`
	Flagged    int        `json:"flagged"`
	Deferred   int        `json:"deferred"`
	Failed     int        `json:"failed"`
	Issue      string     `json:"issue"`
}

// PriceSync is the bounded admin overview of automatic supplier pricing.
type PriceSync struct {
	IntervalMinutes int           `json:"interval_minutes"`
	Configured      bool          `json:"configured"`
	LastRun         *PriceRun     `json:"last_run"`
	NextCheckAt     *time.Time    `json:"next_check_at"`
	AttentionCount  int           `json:"attention_count"`
	Attention       []PriceReview `json:"attention"`
	Repriced        []PriceReview `json:"repriced"`
}

const recentReprices = 7 * 24 * time.Hour

func (s *Store) configuredConnection() suppliers.Connection {
	if s.supplier == nil {
		return ""
	}
	for _, id := range []suppliers.Connection{suppliers.NexusProduction, suppliers.NexusSandbox} {
		if s.supplier.ConfiguredMerchant(id) != "" {
			return id
		}
	}
	return ""
}

func priceView(row *ent.SupplierPriceReview, product *ent.ShopProduct, source string) PriceReview {
	out := PriceReview{ProductID: row.ID, SupplierProductID: source, Status: row.Status, Attention: row.Attention, Version: row.Version, Quantity: row.Quantity, BaselineTotal: row.BaselineTotal, SupplierTotal: row.SupplierTotal, SellingMinor: row.SellingMinor, Failures: row.Failures,
		CheckedAt: row.CheckedAt, DetectedAt: row.DetectedAt, RepricedAt: row.RepricedAt, RepricedFromMinor: row.RepricedFromMinor, RepricedToMinor: row.RepricedToMinor, RepricedFromTotal: row.RepricedFromTotal, RepricedToTotal: row.RepricedToTotal}
	if product != nil {
		out.Title, out.Game, out.State = product.Title, product.GameName, product.State
	}
	return out
}

func priceViews(ctx context.Context, tx *ent.Tx, rows []*ent.SupplierPriceReview) ([]PriceReview, error) {
	out := make([]PriceReview, 0, len(rows))
	if len(rows) == 0 {
		return out, nil
	}
	ids := make([]string, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.ID)
	}
	products, err := tx.ShopProduct.Query().Where(shopproduct.IDIn(ids...)).All(ctx)
	if err != nil {
		return nil, err
	}
	sources, err := tx.SupplierPrice.Query().Where(supplierprice.ShopProductIDIn(ids...)).All(ctx)
	if err != nil {
		return nil, err
	}
	byID, source := map[string]*ent.ShopProduct{}, map[string]string{}
	for _, product := range products {
		byID[product.ID] = product
	}
	for _, price := range sources {
		if price.ShopProductID != nil {
			source[*price.ShopProductID] = price.ProductID
		}
	}
	for _, row := range rows {
		out = append(out, priceView(row, byID[row.ID], source[row.ID]))
	}
	return out, nil
}

// PriceSync rechecks current administrator authority on every read.
func (s *Store) PriceSync(ctx context.Context, p *identity.Principal) (out PriceSync, err error) {
	out = PriceSync{IntervalMinutes: int(s.interval() / time.Minute), Attention: []PriceReview{}, Repriced: []PriceReview{}}
	connection := s.configuredConnection()
	out.Configured = connection != ""
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, _ *identity.Principal) error {
		if connection != "" {
			run, e := tx.SupplierPriceRun.Query().Where(supplierpricerun.ConnectionIDEQ(string(connection))).Order(ent.Desc(supplierpricerun.FieldWindowStart)).First(ctx)
			if e != nil && !ent.IsNotFound(e) {
				return e
			}
			if run != nil {
				out.LastRun = &PriceRun{run.State, run.CreatedAt, run.FinishedAt, run.Checked, run.Repriced, run.Flagged, run.Deferred, run.Failed, run.Issue}
				next := run.WindowStart.Add(s.interval())
				out.NextCheckAt = &next
			}
		}
		count, e := tx.SupplierPriceReview.Query().Where(supplierpricereview.AttentionEQ("open")).Count(ctx)
		if e != nil {
			return e
		}
		out.AttentionCount = count
		open, e := tx.SupplierPriceReview.Query().Where(supplierpricereview.AttentionEQ("open")).Order(ent.Asc(supplierpricereview.FieldDetectedAt), ent.Asc(supplierpricereview.FieldID)).Limit(50).All(ctx)
		if e != nil {
			return e
		}
		if out.Attention, e = priceViews(ctx, tx, open); e != nil {
			return e
		}
		recent, e := tx.SupplierPriceReview.Query().Where(supplierpricereview.RepricedAtGT(s.now().Add(-recentReprices))).Order(ent.Desc(supplierpricereview.FieldRepricedAt), ent.Asc(supplierpricereview.FieldID)).Limit(20).All(ctx)
		if e != nil {
			return e
		}
		out.Repriced, e = priceViews(ctx, tx, recent)
		return e
	})
	return out, err
}

// AcknowledgePrice keeps the current selling price after staff review. For an
// overridden product the reviewed supplier amount becomes the new baseline, so
// only a further supplier change raises another alert.
func (s *Store) AcknowledgePrice(ctx context.Context, p *identity.Principal, id string, version int) (out PriceReview, err error) {
	if !validID(id) || !validVersion(version) {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.SupplierPriceReview.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Version != version {
			return ErrConflict
		}
		if row.Attention == "open" {
			now := s.now()
			update := tx.SupplierPriceReview.UpdateOne(row).SetAttention("acknowledged").SetAcknowledgedBy(current.User.ID).SetAcknowledgedAt(now).AddVersion(1).SetUpdatedAt(now)
			if row.Status == priceOverride {
				update.SetStatus(priceCurrent).SetBaselineTotal(row.SupplierTotal)
			}
			if row, e = update.Save(ctx); e != nil {
				return e
			}
			if _, e = tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(current.User.ID).SetActorReference(current.User.ID).SetAction("shop_product_price_acknowledged").SetTargetID(row.ID).
				SetMetadata(map[string]string{"version": strconv.Itoa(row.Version), "release": row.ReleaseID}).SetCreatedAt(now).Save(ctx); e != nil {
				return e
			}
		} else if row.Attention != "acknowledged" {
			return ErrConflict
		}
		views, e := priceViews(ctx, tx, []*ent.SupplierPriceReview{row})
		if e != nil {
			return e
		}
		out = views[0]
		return nil
	})
	return out, err
}

// productPrices annotates staff list rows without changing their order.
func productPrices(ctx context.Context, tx *ent.Tx, ids []string) (map[string]*ent.SupplierPriceReview, error) {
	out := map[string]*ent.SupplierPriceReview{}
	if len(ids) == 0 {
		return out, nil
	}
	rows, err := tx.SupplierPriceReview.Query().Where(supplierpricereview.IDIn(ids...)).All(ctx)
	for _, row := range rows {
		out[row.ID] = row
	}
	return out, err
}
