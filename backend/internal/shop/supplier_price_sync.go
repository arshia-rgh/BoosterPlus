package shop

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"strconv"
	"time"

	"entgo.io/ent/dialect/sql"
	"entgo.io/ent/dialect/sql/sqljson"
	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopproduct"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierbinding"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierpricerun"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierquote"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

const (
	priceJobKind  = "supplier.price_sync"
	priceBatch    = 10
	priceLease    = 4 * time.Minute
	priceQuoteMax = 20 * time.Second
	priceOutage   = 3
)

// priceGap paces read-only provider requests; tests may shorten it.
var priceGap = 250 * time.Millisecond

// WithPriceSync sets the automatic supplier price check cadence.
func (s *Store) WithPriceSync(interval time.Duration) *Store {
	s.priceInterval = interval
	return s
}

func (s *Store) interval() time.Duration {
	if s.priceInterval <= 0 {
		return 8 * time.Hour
	}
	return s.priceInterval
}

type priceJob struct {
	Connection suppliers.Connection `json:"connection"`
	Window     int64                `json:"window"`
	Batch      int                  `json:"batch"`
}

func priceKey(input priceJob) string {
	key := "supplier-price-sync:" + string(input.Connection) + ":" + strconv.FormatInt(input.Window, 10)
	if input.Batch > 0 {
		key += ":" + strconv.Itoa(input.Batch)
	}
	return key
}

func enqueuePrice(ctx context.Context, tx *ent.Tx, input priceJob) error {
	raw, err := json.Marshal(input)
	if err != nil {
		return err
	}
	_, err = jobs.EnqueueEntTx(ctx, tx, priceJobKind, priceKey(input), raw)
	return err
}

// ScheduleSupplierPrices enqueues the current window once per configured Nexus
// connection. The queue's idempotency key makes concurrent workers harmless.
func (s *Store) ScheduleSupplierPrices(ctx context.Context) error {
	if s.supplier == nil {
		return nil
	}
	window := s.now().UTC().Truncate(s.interval()).Unix()
	for _, id := range []suppliers.Connection{suppliers.NexusSandbox, suppliers.NexusProduction} {
		if s.supplier.ConfiguredMerchant(id) == "" {
			continue
		}
		tx, err := s.client.Tx(ctx)
		if err != nil {
			return err
		}
		if err = enqueuePrice(ctx, tx, priceJob{Connection: id, Window: window}); err != nil {
			return errors.Join(err, tx.Rollback())
		}
		if err = tx.Commit(); err != nil {
			return err
		}
	}
	return nil
}

// RunPriceSchedule keeps the cadence durable across restarts: a missed window
// is enqueued as soon as any worker is running.
func (s *Store) RunPriceSchedule(ctx context.Context, logger *slog.Logger) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		if err := s.ScheduleSupplierPrices(ctx); err != nil && ctx.Err() == nil {
			logger.ErrorContext(ctx, "supplier price schedule requires attention")
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

// PriceSyncHandler reads supplier prices in bounded batches. It never creates
// a supplier order and changes customer prices only through new releases.
func (s *Store) PriceSyncHandler() jobs.Handler {
	return func(ctx context.Context, job jobs.Job) error {
		var input priceJob
		decoder := json.NewDecoder(bytes.NewReader(job.Payload))
		decoder.DisallowUnknownFields()
		if decoder.Decode(&input) != nil || input.Connection != suppliers.NexusSandbox && input.Connection != suppliers.NexusProduction || input.Window <= 0 || input.Batch < 0 || input.Batch > 100000 {
			return ErrInvalid
		}
		if s.supplier == nil || s.supplier.ConfiguredMerchant(input.Connection) == "" {
			return nil
		}
		run, lease, err := s.claimPriceRun(ctx, input)
		if err != nil || run == nil {
			return err
		}
		return s.priceBatch(ctx, input, run, lease)
	}
}

func (s *Store) claimPriceRun(ctx context.Context, input priceJob) (out *ent.SupplierPriceRun, lease string, err error) {
	lease = uuid.NewString()
	window := time.Unix(input.Window, 0).UTC()
	err = s.auth.SystemTransaction(ctx, func(tx *ent.Tx) error {
		row, e := tx.SupplierPriceRun.Query().Where(supplierpricerun.ConnectionIDEQ(string(input.Connection)), supplierpricerun.WindowStartEQ(window)).Only(ctx)
		if ent.IsNotFound(e) {
			if input.Batch != 0 {
				return nil
			}
			now := s.now()
			row, e = tx.SupplierPriceRun.Create().SetID(uuid.NewString()).SetConnectionID(string(input.Connection)).SetWindowStart(window).SetCreatedAt(now).SetUpdatedAt(now).Save(ctx)
		}
		if e != nil {
			return e
		}
		// Only one job exists per batch; a retry after a lost lease takes over and
		// fences any late writes from the earlier attempt.
		if row.State != "running" || row.Batch != input.Batch {
			return nil
		}
		out, e = tx.SupplierPriceRun.UpdateOne(row).SetLeaseOwner(lease).SetLeaseUntil(s.now().Add(priceLease)).SetUpdatedAt(s.now()).Save(ctx)
		return e
	})
	return out, lease, err
}

func (s *Store) fencedRun(ctx context.Context, tx *ent.Tx, id, lease string) (*ent.SupplierPriceRun, error) {
	row, err := tx.SupplierPriceRun.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if row.State != "running" || row.LeaseOwner != lease || row.LeaseUntil == nil || !row.LeaseUntil.After(s.now()) {
		return nil, ErrConflict
	}
	return row, nil
}

// priceCandidates returns published or paused products whose current release is
// bound to this connection, in stable keyset order.
func (s *Store) priceCandidates(ctx context.Context, connection suppliers.Connection, after string) ([]*ent.ShopProduct, error) {
	q := s.client.ShopProduct.Query().Where(shopproduct.StateIn("published", "paused"), shopproduct.CurrentReleaseNEQ("")).Order(ent.Asc(shopproduct.FieldID)).Limit(priceBatch)
	if after != "" {
		q.Where(shopproduct.IDGT(after))
	}
	q.Where(func(selector *sql.Selector) {
		binding := sql.Table(supplierbinding.Table)
		bound := sql.Select(binding.C(supplierbinding.FieldID)).From(binding).Where(sqljson.ValueEQ(binding.C(supplierbinding.FieldData), string(connection), sqljson.Path("connection")))
		selector.Where(sql.In(selector.C(shopproduct.FieldCurrentRelease), bound))
	})
	return q.All(ctx)
}

type pricedProduct struct {
	seen    priceObservation
	outcome priceOutcome
	skip    bool
}

func (s *Store) observeProduct(ctx context.Context, row *ent.ShopProduct, merchant string) (priceObservation, bool, error) {
	release, err := s.client.ShopProductRelease.Get(ctx, row.CurrentRelease)
	if err != nil {
		return priceObservation{}, false, err
	}
	binding, err := s.client.SupplierBinding.Get(ctx, release.ID)
	if err != nil {
		return priceObservation{}, false, err
	}
	if release.ProductID != row.ID || binding.ShopProductID != row.ID || binding.ReleaseID == nil || *binding.ReleaseID != release.ID || binding.Data == nil || binding.Data.MerchantID != merchant {
		return priceObservation{}, false, nil
	}
	value, err := definition(release.Data)
	if err != nil {
		return priceObservation{}, false, err
	}
	seen, ok := observe(row.ID, release.ID, value, binding.Data)
	if !ok {
		// Quantity stays empty: the caller records needs_refresh, never a price.
		seen = priceObservation{ProductID: row.ID, ReleaseID: release.ID, Binding: *binding.Data}
	}
	return seen, true, nil
}

func (s *Store) priceBatch(ctx context.Context, input priceJob, run *ent.SupplierPriceRun, lease string) error {
	merchant := s.supplier.ConfiguredMerchant(input.Connection)
	rows, err := s.priceCandidates(ctx, input.Connection, run.CursorID)
	if err != nil {
		return err
	}
	results := make([]pricedProduct, 0, len(rows))
	healthy := run.Checked > run.Failed
	misses := 0
	for i, row := range rows {
		seen, bound, e := s.observeProduct(ctx, row, merchant)
		if e != nil {
			return e
		}
		if !bound {
			results = append(results, pricedProduct{skip: true, seen: priceObservation{ProductID: row.ID}})
			continue
		}
		if seen.Quantity == "" {
			results = append(results, pricedProduct{seen: seen, outcome: priceOutcome{Status: priceRefresh}})
			continue
		}
		// An unexpired, unconsumed checkout quote is left to finish on its release.
		active, e := s.client.SupplierQuote.Query().Where(supplierquote.ShopProductIDEQ(row.ID), supplierquote.ReleaseIDEQ(seen.ReleaseID), supplierquote.OrderIDIsNil(), supplierquote.ExpiresAtGT(s.now())).Exist(ctx)
		if e != nil {
			return e
		}
		if active {
			results = append(results, pricedProduct{skip: true, seen: seen})
			continue
		}
		if i > 0 && priceGap > 0 {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(priceGap):
			}
		}
		quoteCtx, cancel := context.WithTimeout(ctx, priceQuoteMax)
		quote, quoteErr := s.supplier.FreshQuote(quoteCtx, &seen.Binding, seen.Quantity)
		cancel()
		if ctx.Err() != nil {
			return ctx.Err()
		}
		outcome := evaluatePrice(seen, quote, quoteErr)
		if outcome.Status == priceUnavailable || outcome.Status == priceCheckFailed {
			misses++
		} else {
			healthy = true
		}
		results = append(results, pricedProduct{seen: seen, outcome: outcome})
	}
	// Repeated failures before any successful read look like a provider outage:
	// fail the window without marking every product unavailable.
	if !healthy && misses >= priceOutage {
		return s.finishPriceRun(ctx, run.ID, lease, "failed", "supplier_unavailable", nil)
	}
	counts := map[string]int{}
	for _, result := range results {
		if result.skip {
			counts["deferred"]++
			continue
		}
		status, e := s.applyPrice(ctx, run.ID, lease, result.seen, result.outcome)
		if errors.Is(e, errSkipped) {
			counts["deferred"]++
			continue
		}
		if e != nil {
			return e
		}
		counts[status]++
	}
	if len(rows) < priceBatch {
		return s.finishPriceRun(ctx, run.ID, lease, "complete", "", counts)
	}
	return s.auth.SystemTransaction(ctx, func(tx *ent.Tx) error {
		current, e := s.fencedRun(ctx, tx, run.ID, lease)
		if e != nil {
			return e
		}
		next := current.Batch + 1
		if _, e = addCounts(tx.SupplierPriceRun.UpdateOne(current), counts).SetCursorID(rows[len(rows)-1].ID).SetBatch(next).SetLeaseOwner("").ClearLeaseUntil().SetUpdatedAt(s.now()).Save(ctx); e != nil {
			return e
		}
		return enqueuePrice(ctx, tx, priceJob{Connection: input.Connection, Window: input.Window, Batch: next})
	})
}

func addCounts(update *ent.SupplierPriceRunUpdateOne, counts map[string]int) *ent.SupplierPriceRunUpdateOne {
	checked := 0
	for key, value := range counts {
		if key != "deferred" {
			checked += value
		}
	}
	flagged := counts[priceOverride] + counts[priceRequirements] + counts[priceRefresh]
	failed := counts[priceUnavailable] + counts[priceCheckFailed]
	return update.AddChecked(checked).AddRepriced(counts[priceRepriced]).AddFlagged(flagged).AddFailed(failed).AddDeferred(counts["deferred"])
}

func (s *Store) finishPriceRun(ctx context.Context, id, lease, state, issue string, counts map[string]int) error {
	return s.auth.SystemTransaction(ctx, func(tx *ent.Tx) error {
		current, err := s.fencedRun(ctx, tx, id, lease)
		if err != nil {
			return err
		}
		now := s.now()
		_, err = addCounts(tx.SupplierPriceRun.UpdateOne(current), counts).SetState(state).SetIssue(issue).SetLeaseOwner("").ClearLeaseUntil().SetFinishedAt(now).SetUpdatedAt(now).Save(ctx)
		return err
	})
}
