package operations

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Attempt exposes only recorded timing and safe execution state.
type Attempt struct {
	Generation int64      `json:"generation"`
	Number     int        `json:"number"`
	Outcome    string     `json:"outcome"`
	StartedAt  time.Time  `json:"started_at"`
	FinishedAt *time.Time `json:"finished_at"`
}

// AttemptPage distinguishes missing old history from a fabricated success.
type AttemptPage struct {
	Items []Attempt `json:"items"`
	Next  string    `json:"next"`
}

func attemptCursor(v string) (int64, int, error) {
	if len(v) > 40 {
		return 0, 0, ErrInvalid
	}
	parts := strings.Split(v, ":")
	if len(parts) != 2 {
		return 0, 0, ErrInvalid
	}
	generation, e := strconv.ParseInt(parts[0], 10, 32)
	if e != nil || generation < 0 {
		return 0, 0, ErrInvalid
	}
	number, e := strconv.Atoi(parts[1])
	if e != nil || number < 1 || number > 2147483647 {
		return 0, 0, ErrInvalid
	}
	return generation, number, nil
}

// Attempts reads recorded attempts under current administrator authorization.
func (s *Store) Attempts(ctx context.Context, p *identity.Principal, id, after string) (out AttemptPage, err error) {
	out.Items = []Attempt{}
	if !validID(id) {
		return out, ErrInvalid
	}
	var generation int64
	var number int
	if after != "" {
		generation, number, err = attemptCursor(after)
		if err != nil {
			return out, err
		}
	}
	err = s.private(ctx, p, false, func(tx *ent.Tx, _ *identity.Principal) (resultErr error) {
		if _, e := jobByID(ctx, tx, id); e != nil {
			return e
		}
		query := "SELECT retry_generation,attempt,outcome,started_at,finished_at FROM job_attempts WHERE job_id=?"
		args := []any{id}
		if after != "" {
			query += " AND (retry_generation<? OR (retry_generation=? AND attempt<?))"
			args = append(args, generation, generation, number)
		}
		query += " ORDER BY retry_generation DESC,attempt DESC LIMIT 51"
		rows, e := tx.QueryContext(ctx, query, args...)
		if e != nil {
			return e
		}
		defer func() { resultErr = errors.Join(resultErr, rows.Close()) }()
		for rows.Next() {
			var item Attempt
			if e = rows.Scan(&item.Generation, &item.Number, &item.Outcome, &item.StartedAt, &item.FinishedAt); e != nil {
				return e
			}
			switch item.Outcome {
			case "running", "complete", "handler_failed", "lease_expired":
			default:
				item.Outcome = "unavailable"
			}
			out.Items = append(out.Items, item)
		}
		if e = rows.Err(); e != nil {
			return e
		}
		if len(out.Items) > 50 {
			last := out.Items[49]
			out.Next = strconv.FormatInt(last.Generation, 10) + ":" + strconv.Itoa(last.Number)
			out.Items = out.Items[:50]
		}
		return nil
	})
	return out, err
}
