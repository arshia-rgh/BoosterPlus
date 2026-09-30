//go:build integration

package integration

import (
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/opsmetrics"
)

func TestOperationalMetricsQueueAgesAndPayloadIsolation(t *testing.T) {
	db := queueDB(t)
	enqueue(t, db, "private-reference-must-not-be-a-label")
	executeSQL(t, db, "UPDATE jobs SET available_at=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 10 MINUTE)")
	got, err := opsmetrics.Read(t.Context(), db)
	if err != nil {
		t.Fatal(err)
	}
	if got.Values["jobs_runnable"] != 1 || got.Values["jobs_oldest_runnable_seconds"] < 600 || got.Values["jobs_failed"] != 0 {
		t.Fatal("incorrect queue aggregate", got.Values)
	}
	executeSQL(t, db, "UPDATE jobs SET state='failed'")
	got, err = opsmetrics.Read(t.Context(), db)
	if err != nil || got.Values["jobs_failed"] != 1 || got.Values["jobs_runnable"] != 0 || got.Values["jobs_oldest_runnable_seconds"] != 0 {
		t.Fatal("empty runnable queue and failure not represented correctly", err)
	}
}
