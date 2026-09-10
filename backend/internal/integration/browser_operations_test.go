//go:build integration && browsertest

package integration

import (
	"encoding/json"
	"errors"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
)

// seedBrowserOperations creates failed synthetic ping jobs only in the isolated test database.
func seedBrowserOperations(t *testing.T, f *authFixture, fixtures map[string]string) {
	t.Helper()
	for _, project := range []string{"desktop", "mobile"} {
		tx, err := f.db.BeginTx(t.Context(), nil)
		if err != nil {
			t.Fatal(err)
		}
		id, err := jobs.EnqueueTx(t.Context(), tx, "system.ping", "browser-operations-"+project, json.RawMessage(`{"private":"Synthetic task payload must not appear in staff task views"}`))
		if err != nil {
			t.Fatal(errors.Join(err, tx.Rollback()))
		}
		if err = tx.Commit(); err != nil {
			t.Fatal(err)
		}
		executeSQL(t, f.db, "UPDATE jobs SET state='failed',attempts=max_attempts,last_error='handler_failed' WHERE id=?", id)
		fixtures[project+"_failed_job"] = id
	}
}
