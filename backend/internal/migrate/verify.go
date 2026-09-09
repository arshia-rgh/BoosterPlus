package migrate

import (
	"context"
	"errors"
	"fmt"

	"github.com/go-sql-driver/mysql"
)

// Verify compares the immutable SQL journal with the runner's actual version log.
// It is read-only and rejects unknown versions, gaps, and missing bookkeeping.
func (r *Runner) Verify(ctx context.Context) (result error) {
	statuses, err := r.Status(ctx)
	if err != nil {
		return err
	}
	applied := make(map[int64]bool)
	rows, err := r.db.QueryContext(ctx, "SELECT version_id, is_applied FROM goose_db_version ORDER BY id")
	if err != nil {
		var mysqlErr *mysql.MySQLError
		if !errors.As(err, &mysqlErr) || mysqlErr.Number != 1146 {
			return fmt.Errorf("read version log: %w", err)
		}
	} else {
		defer func() { result = errors.Join(result, rows.Close()) }()
		for rows.Next() {
			var version int64
			var active bool
			if scanErr := rows.Scan(&version, &active); scanErr != nil {
				return fmt.Errorf("read version entry: %w", scanErr)
			}
			if version < 0 || version > int64(len(r.files)) {
				return fmt.Errorf("%w: unknown version %d", ErrDrift, version)
			}
			if version != 0 {
				applied[version] = active
			}
		}
		if readErr := rows.Err(); readErr != nil {
			return fmt.Errorf("read version log: %w", readErr)
		}
	}
	seenPending := false
	for _, status := range statuses {
		isApplied := status.State == "applied"
		if applied[status.Version] != isApplied {
			return fmt.Errorf("%w: journal/version mismatch at %d", ErrDrift, status.Version)
		}
		if isApplied && seenPending {
			return fmt.Errorf("%w: noncontiguous applied versions", ErrDrift)
		}
		if !isApplied {
			seenPending = true
		}
	}
	return nil
}
