//go:build integration

package integration

import (
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
)

func TestChatFormMigrationStartupReadiness(t *testing.T) {
	db := testDB(t)
	r := runner(t, db)
	if err := r.Apply(t.Context(), 42); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(t.Context(), db); err == nil {
		t.Fatal("schema42 must not start a schema43 application")
	}
	if err := r.Apply(t.Context(), 0); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(t.Context(), db); err != nil {
		t.Fatal("migrated chat forms must pass actual API/worker startup readiness:", err)
	}
	if _, err := db.ExecContext(t.Context(), "ALTER TABLE conversation_messages MODIFY COLUMN purpose VARCHAR(32) NOT NULL DEFAULT 'message'"); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(t.Context(), db); err == nil || !strings.Contains(err.Error(), "conversation_messages.purpose") {
		t.Fatal("readiness must still reject schema drift:", err)
	}
}
