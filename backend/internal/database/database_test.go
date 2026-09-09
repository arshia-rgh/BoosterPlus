package database_test

import (
	"errors"
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
)

func TestUnsafeDatabaseConfigurationIsRejectedWithoutLeakingSecrets(t *testing.T) {
	t.Parallel()
	for _, dsn := range []string{"not-a-dsn", "root:private-test-value@tcp(localhost:4000)/test", "root@tcp(localhost:4000)/test?tls=skip-verify", "root@tcp(localhost:4000)/test?tls=true&multiStatements=true", "root@unix(/tmp/mysql.sock)/test"} {
		t.Run(dsn, func(t *testing.T) {
			t.Parallel()
			_, err := database.Open(t.Context(), dsn, "production")
			if !errors.Is(err, database.ErrConfiguration) {
				t.Fatalf("expected configuration rejection, got %v", err)
			}
			if strings.Contains(err.Error(), "private-test-value") {
				t.Fatal("secret leaked in error")
			}
		})
	}
}
