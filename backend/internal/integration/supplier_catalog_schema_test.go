//go:build integration

package integration

import (
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
)

func TestSupplierCatalogMigrationStartupReadiness(t *testing.T) {
	db := testDB(t)
	migration := runner(t, db)
	if err := migration.Apply(t.Context(), 43); err != nil {
		t.Fatal(err)
	}
	if database.Ready(t.Context(), db) == nil {
		t.Fatal("previous schema accepted")
	}
	if err := migration.Apply(t.Context(), 0); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(t.Context(), db); err != nil {
		t.Fatal("migrated supplier schema failed actual startup readiness", err)
	}
	if _, err := db.ExecContext(t.Context(), "ALTER TABLE supplier_items MODIFY COLUMN data TEXT NOT NULL"); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(t.Context(), db); err == nil || !strings.Contains(err.Error(), "supplier_items.data") {
		t.Fatal("supplier schema drift accepted", err)
	}
}
