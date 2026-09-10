package fulfillment

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"entgo.io/ent/dialect/sql"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/booking"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/scheduling"
)

// Forecast exposes only an operational range, without other customers' workloads.
type Forecast struct {
	CalculatedAt   time.Time `json:"calculated_at"`
	Rule           string    `json:"rule"`
	Zone           string    `json:"zone"`
	StartEarliest  time.Time `json:"start_earliest"`
	StartLatest    time.Time `json:"start_latest"`
	FinishEarliest time.Time `json:"finish_earliest"`
	FinishLatest   time.Time `json:"finish_latest"`
}

// ForecastPreview is explicitly computed; GET never moves a saved estimate.
type ForecastPreview struct {
	Status   string    `json:"status"`
	Reason   string    `json:"reason"`
	Basis    string    `json:"basis"`
	Forecast *Forecast `json:"forecast"`
}

// ForecastApply binds a reviewed calculation to observed execution and workload.
type ForecastApply struct {
	Version      int       `json:"version"`
	OrderVersion int       `json:"order_version"`
	CalculatedAt time.Time `json:"calculated_at"`
	Basis        string    `json:"basis"`
	Note         string    `json:"note"`
}
type savedForecast struct {
	Forecast Forecast `json:"forecast"`
	Version  int      `json:"version"`
	Workload int      `json:"workload"`
}

func forecastWorkload(ctx context.Context, c *ent.Client, work *ent.Fulfillment) (int, error) {
	return c.Fulfillment.Query().Where(fulfillment.AssignedIDEQ(work.AssignedID), fulfillment.IDNEQ(work.ID), func(s *sql.Selector) {
		o, contract := sql.Table(order.Table), sql.Table(ordercontract.Table)
		s.Join(o).On(s.C(fulfillment.FieldOrderID), o.C(order.FieldID)).
			Join(contract).On(o.C(order.FieldCurrentContract), contract.C(ordercontract.FieldID)).
			Where(sql.And(sql.In(o.C(order.FieldState), "queued", "in_progress", "on_hold"),
				sql.EQ(contract.C(ordercontract.FieldPaymentState), "settled"),
				sql.ColumnsEQ(contract.C(ordercontract.FieldOrderID), o.C(order.FieldID)),
				sql.ColumnsEQ(contract.C(ordercontract.FieldActiveOrderID), o.C(order.FieldID)),
				sql.ColumnsEQ(contract.C(ordercontract.FieldUserID), o.C(order.FieldUserID))))
	}).Count(ctx)
}

func forecastBasis(row *ent.Order, work *ent.Fulfillment, count int, forecast Forecast) (string, error) {
	raw, err := json.Marshal(struct {
		ID, AssignedID                  string
		Version, OrderVersion, Workload int
		Forecast                        Forecast
	}{work.ID, work.AssignedID, work.Version, row.Version, count, forecast})
	if err != nil {
		return "", err
	}
	digest := sha256.Sum256(raw)
	return hex.EncodeToString(digest[:]), nil
}

func calculateForecast(service catalog.ServiceDefinition, rule catalog.DeliveryRule, sessions []scheduling.Interval, count int, anchor time.Time) (Forecast, error) {
	result := Forecast{CalculatedAt: anchor, Rule: rule.Key, Zone: service.Delivery.Calendar.Zone}
	advance := func(after time.Time, minutes int) (time.Time, error) {
		return scheduling.AdvanceCalendar(service.Delivery.Calendar, after, minutes)
	}
	workTime := advance
	if rule.Mode == "together" {
		workTime = func(after time.Time, minutes int) (time.Time, error) {
			return scheduling.AdvanceIntervals(sessions, after, minutes)
		}
	}
	for _, bound := range []struct {
		wait, duration int
		start, finish  *time.Time
	}{
		{rule.WaitMinMinutes, rule.MinMinutes, &result.StartEarliest, &result.FinishEarliest},
		{rule.WaitMaxMinutes, rule.MaxMinutes, &result.StartLatest, &result.FinishLatest},
	} {
		ready, err := advance(anchor, bound.wait+count*rule.WorkloadMinutes)
		if err != nil {
			return result, err
		}
		*bound.start, err = workTime(ready, 0)
		if err != nil {
			return result, err
		}
		*bound.finish, err = workTime(*bound.start, bound.duration)
		if err != nil {
			return result, err
		}
		if bound.finish.After(anchor.Add(90 * 24 * time.Hour)) {
			return result, scheduling.ErrCapacity
		}
	}
	return result, nil
}

func (s *Store) forecastInTx(ctx context.Context, c *ent.Client, row *ent.Order, work *ent.Fulfillment, anchor time.Time) (ForecastPreview, int, error) {
	result := ForecastPreview{Status: "needs_review"}
	if row.State != order.StateQueued || work.Progress != 0 {
		result.Reason = "Automatic ranges apply to queued, unstarted work. Review remaining work and use a manual estimate."
		return result, 0, nil
	}
	if err := activeStaff(ctx, c, work.AssignedID); err != nil {
		return result, 0, err
	}
	_, service, answers, err := definition(row)
	if err != nil {
		return result, 0, err
	}
	rule, err := catalog.Delivery(service, answers, string(work.Mode))
	if errors.Is(err, catalog.ErrDeliveryPolicy) {
		result.Reason = "The purchased release has no matching delivery rule. Review and enter a manual estimate."
		return result, 0, nil
	}
	if err != nil {
		return result, 0, err
	}
	validation, err := handoffValidation(row, work)
	if err != nil {
		return result, 0, err
	}
	if len(validation.Issues) > 0 {
		result.Reason = "Required fulfillment information is incomplete."
		return result, 0, nil
	}
	count, err := forecastWorkload(ctx, c, work)
	if err != nil {
		return result, 0, err
	}
	if count > 100 {
		result.Reason = "The assigned queue exceeds the forecast limit; staff review is required."
		return result, count, nil
	}
	sessions := []scheduling.Interval{}
	if work.Mode == fulfillment.ModeTogether {
		rows, readErr := c.Booking.Query().Where(booking.OrderIDEQ(row.ID), booking.AssignedIDEQ(work.AssignedID), booking.StateEQ(booking.StateConfirmed), booking.EndsAtGT(anchor)).Order(ent.Asc(booking.FieldStartsAt)).Limit(21).All(ctx)
		if readErr != nil {
			return result, count, readErr
		}
		if len(rows) > 20 {
			return result, count, ErrConflict
		}
		for _, value := range rows {
			sessions = append(sessions, scheduling.Interval{Start: value.StartsAt, End: value.EndsAt})
		}
	}
	forecast, err := calculateForecast(service, rule, sessions, count, anchor)
	if errors.Is(err, scheduling.ErrCapacity) || errors.Is(err, scheduling.ErrTime) {
		result.Reason = "The declared calendar or confirmed sessions cannot support the range within 90 days. Review availability and clock changes."
		return result, count, nil
	}
	if err != nil {
		return result, count, err
	}
	result.Basis, err = forecastBasis(row, work, count, forecast)
	result.Status, result.Forecast = "ready", &forecast
	result.Reason = "Operational estimate, conditional on continued availability and required game access. Accepted delivery terms remain unchanged."
	return result, count, err
}

// PreviewForecast calculates a private administrative proposal under live authorization.
func (s *Store) PreviewForecast(ctx context.Context, p *identity.Principal, id string) (ForecastPreview, error) {
	var result ForecastPreview
	err := s.auth.AuthorizedTransaction(ctx, p, "admin", false, func(tx *ent.Tx, _ *identity.Principal) error {
		row, err := paid(ctx, tx.Client(), id)
		if err != nil {
			return err
		}
		work, err := record(ctx, tx.Client(), id)
		if err != nil {
			return err
		}
		result, _, err = s.forecastInTx(ctx, tx.Client(), row, work, s.now().UTC().Truncate(time.Second))
		return err
	})
	return result, err
}

// ApplyForecast recomputes the reviewed basis atomically, with recent primary and MFA checks.
func (s *Store) ApplyForecast(ctx context.Context, p *identity.Principal, id string, input ForecastApply) (View, error) {
	if input.Version < 1 || input.Version >= 2147483646 || input.OrderVersion < 1 || input.OrderVersion >= 2147483646 || !bounded(input.Note, 1, 2000) || len(input.Basis) != 64 {
		return View{}, ErrInvalid
	}
	var result View
	err := s.auth.AuthorizedTransaction(ctx, p, "admin", true, func(tx *ent.Tx, current *identity.Principal) error {
		now := s.now().UTC()
		if input.CalculatedAt.After(now) || input.CalculatedAt.Before(now.Add(-10*time.Minute)) {
			return ErrConflict
		}
		row, err := paid(ctx, tx.Client(), id)
		if err != nil {
			return err
		}
		work, err := record(ctx, tx.Client(), id)
		if err != nil {
			return err
		}
		if work.Version != input.Version || row.Version != input.OrderVersion {
			return ErrConflict
		}
		preview, count, err := s.forecastInTx(ctx, tx.Client(), row, work, input.CalculatedAt.UTC())
		if err != nil {
			return err
		}
		if preview.Forecast == nil || preview.Basis != input.Basis {
			return ErrConflict
		}
		data, err := document(savedForecast{*preview.Forecast, work.Version + 1, count})
		if err != nil {
			return err
		}
		work, err = tx.Fulfillment.UpdateOneID(work.ID).AddVersion(1).SetForecast(data).SetEstimatedStart(preview.Forecast.StartEarliest).SetEstimatedFinish(preview.Forecast.FinishLatest).SetCurrentNote(input.Note).SetUpdatedAt(now).Save(ctx)
		if err != nil {
			return err
		}
		row, err = tx.Order.UpdateOneID(row.ID).AddVersion(1).SetUpdatedAt(now).Save(ctx)
		if err != nil {
			return err
		}
		f := preview.Forecast
		message := fmt.Sprintf("%s\nOperational forecast (%s, rule %s): start %s – %s; finish %s – %s. Accepted delivery terms unchanged.", input.Note, f.Zone, f.Rule, f.StartEarliest.Format(time.RFC3339), f.StartLatest.Format(time.RFC3339), f.FinishEarliest.Format(time.RFC3339), f.FinishLatest.Format(time.RFC3339))
		if err = audit(ctx, tx, current, row, "delivery_forecast", message, now); err != nil {
			return err
		}
		result, err = view(ctx, tx.Client(), row, work, "admin")
		return err
	})
	return result, err
}
