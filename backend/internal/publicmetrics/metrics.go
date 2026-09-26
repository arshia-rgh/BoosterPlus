// Package publicmetrics exposes aggregate evidence, never private report rows.
package publicmetrics

import (
	"context"
	"time"

	"entgo.io/ent/dialect/sql"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/orderevent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
)

// Policy is explicitly reviewed before public statistics are enabled. There is
// no editorial numeric override or default policy for unpublished configuration.
type Policy struct {
	WindowDays     int `json:"window_days"`
	MinimumSample  int `json:"minimum_sample"`
	MaximumAgeSecs int `json:"maximum_age_seconds"`
}

// Valid bounds both source queries and small-sample disclosure.
func (p Policy) Valid() bool {
	return p.WindowDays >= 1 && p.WindowDays <= 366 && p.MinimumSample >= 5 && p.MinimumSample <= 1000000 && p.MaximumAgeSecs >= 30 && p.MaximumAgeSecs <= 86400
}

// Metric omits values and sample sizes when evidence is absent or suppressed.
// Dates are UTC; period_end is exclusive except for point-in-time active counts.
type Metric struct {
	Key         string     `json:"key"`
	Label       string     `json:"label"`
	Definition  string     `json:"definition"`
	State       string     `json:"state"`
	Value       *int       `json:"value,omitempty"`
	SampleSize  *int       `json:"sample_size,omitempty"`
	PeriodStart *time.Time `json:"period_start,omitempty"`
	PeriodEnd   time.Time  `json:"period_end"`
	RefreshedAt time.Time  `json:"refreshed_at"`
	StaleAt     *time.Time `json:"stale_at,omitempty"`
}

// Read performs two bounded-time indexed aggregates. A database outage yields
// unavailable metrics, never invented zeroes or a success from stale evidence.
func Read(ctx context.Context, client *ent.Client, policy *Policy, gameID string, now time.Time) []Metric {
	now = now.UTC()
	metrics := []Metric{
		{Key: "active_orders", Label: "Active orders", Definition: "Orders currently in progress with a verified settled active payment contract and no open service case.", State: "unconfigured", PeriodEnd: now, RefreshedAt: now},
		{Key: "completed_orders", Label: "Completed orders", Definition: "Distinct orders currently completed, with verified settled payment and a recorded completion or buyer acknowledgement during the labeled period; cancelled orders are excluded.", State: "unconfigured", PeriodEnd: now, RefreshedAt: now},
		{Key: "win_rate", Label: "Win rate", Definition: "Eligible recorded match wins divided by eligible completed matches in the labeled period. No authoritative match-result source is configured.", State: "unavailable", PeriodEnd: now, RefreshedAt: now},
	}
	if policy == nil || !policy.Valid() {
		return metrics
	}
	start := now.AddDate(0, 0, -policy.WindowDays)
	stale := now.Add(time.Duration(policy.MaximumAgeSecs) * time.Second)
	metrics[1].PeriodStart, metrics[2].PeriodStart = &start, &start
	for i := range metrics {
		metrics[i].State = "unavailable"
		metrics[i].StaleAt = &stale
	}
	bounded, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	// One read transaction keeps both counts on a coherent TiDB snapshot. It
	// acquires no global authorization lock and creates no business records.
	tx, err := client.Tx(bounded)
	if err != nil {
		return metrics
	}
	committed := false
	defer func() {
		if !committed {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				// Failed cleanup cannot qualify evidence. No private query or
				// database error is exposed in the anonymous projection.
				for i := range metrics {
					metrics[i].State = "unavailable"
					metrics[i].Value, metrics[i].SampleSize = nil, nil
				}
			}
		}
	}()
	base := tx.Order.Query().Where(verifiedContract)
	if gameID != "" {
		base.Where(order.GameIDEQ(gameID))
	}
	active, err := base.Clone().Where(order.StateEQ(order.StateInProgress), withoutActiveCase).Count(bounded)
	if err != nil {
		return metrics
	}
	completed, err := base.Clone().Where(order.StateEQ(order.StateCompleted), func(s *sql.Selector) {
		events := sql.Table(orderevent.Table)
		s.Where(sql.Exists(sql.Select(events.C(orderevent.FieldID)).From(events).Where(sql.And(
			sql.ColumnsEQ(events.C(orderevent.FieldOrderID), s.C(order.FieldID)),
			sql.In(events.C(orderevent.FieldAction), "approve_completion", "account_acknowledge"),
			sql.GTE(events.C(orderevent.FieldCreatedAt), start), sql.LT(events.C(orderevent.FieldCreatedAt), now),
		))))
	}).Count(bounded)
	if err != nil {
		return metrics
	}
	if err = tx.Commit(); err != nil {
		return metrics
	}
	committed = true
	for i, count := range []int{active, completed} {
		metrics[i].State = "insufficient_sample"
		if count >= policy.MinimumSample {
			metrics[i].State = "available"
			metrics[i].Value, metrics[i].SampleSize = &count, &count
		}
	}
	return metrics
}

func verifiedContract(s *sql.Selector) {
	contract := sql.Table(ordercontract.Table)
	s.Where(sql.Exists(sql.Select(contract.C(ordercontract.FieldID)).From(contract).Where(sql.And(
		sql.ColumnsEQ(contract.C(ordercontract.FieldID), s.C(order.FieldCurrentContract)),
		sql.ColumnsEQ(contract.C(ordercontract.FieldOrderID), s.C(order.FieldID)),
		sql.ColumnsEQ(contract.C(ordercontract.FieldActiveOrderID), s.C(order.FieldID)),
		sql.ColumnsEQ(contract.C(ordercontract.FieldUserID), s.C(order.FieldUserID)),
		sql.EQ(contract.C(ordercontract.FieldPaymentState), "settled"),
	))))
}
func withoutActiveCase(s *sql.Selector) {
	cases := sql.Table(servicecase.Table)
	s.Where(sql.Not(sql.Exists(sql.Select(cases.C(servicecase.FieldID)).From(cases).Where(sql.ColumnsEQ(cases.C(servicecase.FieldActiveOrderID), s.C(order.FieldID))))))
}
