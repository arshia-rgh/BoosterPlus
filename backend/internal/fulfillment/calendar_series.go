package fulfillment

import (
	"context"
	"crypto/sha256"
	"fmt"
	"slices"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// AvailabilitySeries publishes a finite set of reviewed dates, never an open-ended recurrence.
type AvailabilitySeries struct {
	RequestKey string        `json:"request_key"`
	Windows    []WindowInput `json:"windows"`
}

// AvailabilitySeriesResult returns each committed dated window in review order.
type AvailabilitySeriesResult struct {
	Windows []WindowView `json:"windows"`
}

// AddAvailabilitySeries atomically publishes at most twelve explicitly reviewed windows.
// Every derived key binds the full batch digest, so retries cannot append or change dates.
func (s *Store) AddAvailabilitySeries(ctx context.Context, p *identity.Principal, id string, admin bool, input AvailabilitySeries) (AvailabilitySeriesResult, error) {
	result := AvailabilitySeriesResult{Windows: []WindowView{}}
	if key, err := uuid.Parse(input.RequestKey); err != nil || key.String() != input.RequestKey || len(input.Windows) < 1 || len(input.Windows) > 12 {
		return result, ErrInvalid
	}
	digest, err := requestDigest(s, "availability_series", input)
	if err != nil {
		return result, err
	}
	input.Windows = slices.Clone(input.Windows)
	starts, ends := make([]time.Time, len(input.Windows)), make([]time.Time, len(input.Windows))
	for i, window := range input.Windows {
		if window.RequestKey != "" {
			return result, ErrInvalid
		}
		sum := sha256.Sum256([]byte(fmt.Sprintf("availability-series:%s:%d", input.RequestKey, i)))
		key := uuid.UUID(sum[:16])
		key[6] = (key[6] & 15) | 128
		key[8] = (key[8] & 63) | 128
		window.RequestKey = key.String()
		starts[i], ends[i], err = resolveWindow(window)
		if err != nil {
			return result, err
		}
		input.Windows[i] = window
	}
	err = s.auth.AuthorizedTransaction(ctx, p, staffCapability(admin), admin, func(tx *ent.Tx, current *identity.Principal) error {
		if e := staffTarget(ctx, tx.Client(), current, id, admin); e != nil {
			return e
		}
		for i, window := range input.Windows {
			row, e := s.addAvailability(ctx, tx, current, id, window, starts[i], ends[i], digest)
			if e != nil {
				return e
			}
			result.Windows = append(result.Windows, row)
		}
		return nil
	})
	if err != nil {
		return AvailabilitySeriesResult{}, err
	}
	return result, nil
}
