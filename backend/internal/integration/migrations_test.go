//go:build integration

// Package integration exercises real TiDB; the pre-commit gate requires this suite.
package integration

import (
	"context"
	"crypto/rand"
	"database/sql"
	"errors"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"testing/fstest"
	"time"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	"github.com/go-sql-driver/mysql"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/game"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/migrate"
	"github.com/arshia-rgh/BoosterPlus/backend/migration"
)

// Keep an exact allowlist: 14001 is the disposable local test instance, separate
// from the long-lived development service on 14000. Never accept arbitrary DSNs.
func allowedTestDatabaseAddress(address string) bool {
	switch address {
	case "127.0.0.1:14000", "127.0.0.1:14001", "tidb:4000":
		return true
	default:
		return false
	}
}

func TestDatabaseEndpointAllowlist(t *testing.T) {
	t.Parallel()
	for _, address := range []string{"127.0.0.1:14000", "127.0.0.1:14001", "tidb:4000"} {
		if !allowedTestDatabaseAddress(address) {
			t.Errorf("dedicated test endpoint rejected: %s", address)
		}
	}
	for _, address := range []string{"", "production.example:4000", "127.0.0.1:4000", "localhost:14001", "127.0.0.1:14002", "tidb:4001", "127.0.0.1:14001.evil.example", "[::1]:14001"} {
		if allowedTestDatabaseAddress(address) {
			t.Errorf("unapproved endpoint accepted: %s", address)
		}
	}
}

func testDB(t *testing.T) *sql.DB {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		t.Fatal("TEST_DATABASE_DSN is required; integration tests are never silently skipped")
	}
	cfg, parseErr := mysql.ParseDSN(dsn)
	if parseErr != nil {
		t.Fatal("invalid test database DSN")
	}
	if !allowedTestDatabaseAddress(cfg.Addr) {
		t.Fatal("integration database must use the isolated local/CI TiDB endpoint")
	}
	admin, openErr := database.Open(t.Context(), dsn, "test")
	if openErr != nil {
		t.Fatal(openErr)
	}
	name := "boosterplus_test_" + strings.ToLower(rand.Text())
	// #nosec G202 -- identifier is a fixed test prefix plus cryptographic base32, not user input.
	if _, err := admin.ExecContext(t.Context(), "CREATE DATABASE "+name+" CHARACTER SET utf8mb4 COLLATE utf8mb4_bin"); err != nil {
		if closeErr := admin.Close(); closeErr != nil {
			t.Error(closeErr)
		}
		t.Fatal(err)
	}
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.WithoutCancel(t.Context()), 10*time.Second)
		defer cancel()
		// #nosec G202 -- only the freshly created, randomly named isolated test schema is dropped.
		if _, err := admin.ExecContext(ctx, "DROP DATABASE "+name); err != nil {
			t.Error(err)
		}
		if err := admin.Close(); err != nil {
			t.Error(err)
		}
	})
	cfg.DBName = name
	db, connectErr := database.Open(t.Context(), cfg.FormatDSN(), "test")
	if connectErr != nil {
		t.Fatal(connectErr)
	}
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Error(err)
		}
	})
	return db
}

func runner(t *testing.T, db *sql.DB) *migrate.Runner {
	t.Helper()
	r, err := migrate.New(db, migration.Files)
	if err != nil {
		t.Fatal(err)
	}
	return r
}

func TestTiDBMigrationLifecycleAndEntQueries(t *testing.T) {
	db := testDB(t)
	r := runner(t, db)
	statuses, statusErr := r.Status(t.Context())
	if statusErr != nil || len(statuses) != len(r.Files()) || statuses[0].State != "pending" {
		t.Fatalf("empty status: %v %v", statuses, statusErr)
	}
	var tables int
	if err := db.QueryRowContext(t.Context(), "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()").Scan(&tables); err != nil {
		t.Fatal(err)
	}
	if tables != 0 {
		t.Fatal("status mutated an empty database")
	}
	if err := r.Apply(t.Context(), 1); err != nil {
		t.Fatal(err)
	}
	client := ent.NewClient(ent.Driver(entsql.OpenDB(dialect.MySQL, db)))
	legacyID := "00000000-0000-4000-8000-000000000001"
	if _, seedErr := db.ExecContext(t.Context(), "INSERT INTO users(id,email,display_name,created_at) VALUES (?,?,'Customer',UTC_TIMESTAMP(6))", legacyID, "customer@example.test"); seedErr != nil {
		t.Fatal(seedErr)
	}
	if err := r.Apply(t.Context(), 0); err != nil {
		t.Fatal(err)
	}
	if err := r.Apply(t.Context(), 0); err != nil {
		t.Fatal("idempotent up:", err)
	}
	user, userErr := client.User.Get(t.Context(), legacyID)
	if userErr != nil {
		t.Fatal(userErr)
	}
	if _, duplicateErr := client.User.Create().SetEmail(user.Email).Save(t.Context()); !ent.IsConstraintError(duplicateErr) {
		t.Fatal("unique constraint not enforced", duplicateErr)
	}
	created, createErr := client.Game.Create().SetSlug("migration-fixture").SetName("Mobile Legends").SetConfiguration(map[string]any{"mode": "draft", "regions": []string{"example"}}).Save(t.Context())
	if createErr != nil {
		t.Fatal(createErr)
	}
	loaded, loadErr := client.Game.Get(t.Context(), created.ID)
	if loadErr != nil || loaded.Configuration["mode"] != "draft" || loaded.Published {
		t.Fatalf("JSON/default roundtrip: %+v %v", loaded, loadErr)
	}
	tx, txErr := client.Tx(t.Context())
	if txErr != nil {
		t.Fatal(txErr)
	}
	if _, err := tx.Game.UpdateOneID(created.ID).SetName("Rolled back").Save(t.Context()); err != nil {
		t.Fatal(err)
	}
	if err := tx.Rollback(); err != nil {
		t.Fatal(err)
	}
	loaded, loadErr = client.Game.Get(t.Context(), created.ID)
	if loadErr != nil || loaded.Name != "Mobile Legends" {
		t.Fatalf("rollback failed: %v", loadErr)
	}
	if err := r.Down(t.Context(), len(r.Files())-1); err != nil {
		t.Fatal(err)
	}
	if _, err := client.Game.Query().All(t.Context()); err == nil {
		t.Fatal("down did not remove the game table")
	}
	if err := r.Apply(t.Context(), 0); err != nil {
		t.Fatal(err)
	}
	if _, err := client.User.Get(t.Context(), user.ID); err != nil {
		t.Fatal("upgrade lost existing user:", err)
	}
}

func TestConditionalClaimsHaveOneWinner(t *testing.T) {
	db := testDB(t)
	if err := runner(t, db).Apply(t.Context(), 0); err != nil {
		t.Fatal(err)
	}
	client := ent.NewClient(ent.Driver(entsql.OpenDB(dialect.MySQL, db)))
	item, err := client.Game.Create().SetSlug("claim-test").SetName("Claim test").SetConfiguration(map[string]any{}).Save(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	var won atomic.Int64
	errorsCh := make(chan error, 12)
	var wait sync.WaitGroup
	for range 12 {
		wait.Go(func() {
			count, err := client.Game.Update().Where(game.IDEQ(item.ID), game.VersionEQ(1)).SetVersion(2).Save(t.Context())
			if err != nil {
				errorsCh <- err
				return
			}
			won.Add(int64(count))
		})
	}
	wait.Wait()
	close(errorsCh)
	for err := range errorsCh {
		t.Error(err)
	}
	if won.Load() != 1 {
		t.Fatalf("conditional claim winners: %d", won.Load())
	}
}

func TestMigrationLockRejectsConcurrentRunner(t *testing.T) {
	db := testDB(t)
	r := runner(t, db)
	if err := r.Apply(t.Context(), 1); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(t.Context(), "INSERT INTO schema_migration_lock VALUES (1, 'test-runner', UTC_TIMESTAMP(6))"); err != nil {
		t.Fatal(err)
	}
	if err := r.Apply(t.Context(), 0); !errors.Is(err, migrate.ErrLocked) {
		t.Fatalf("lock bypassed: %v", err)
	}
	var locked int
	if err := db.QueryRowContext(t.Context(), "SELECT COUNT(*) FROM schema_migration_lock WHERE owner='test-runner'").Scan(&locked); err != nil {
		t.Fatal(err)
	}
	if locked != 1 {
		t.Fatal("another runner's lock was removed")
	}
}

func TestChangedSQLAndInterruptedDDLBlockFurtherMigration(t *testing.T) {
	t.Run("checksum", func(t *testing.T) {
		db := testDB(t)
		r := runner(t, db)
		if err := r.Apply(t.Context(), 0); err != nil {
			t.Fatal(err)
		}
		source := fstest.MapFS{}
		for _, file := range r.Files() {
			source[file.Name] = &fstest.MapFile{Data: []byte(file.SQL + "\n-- changed\n")}
		}
		changed, err := migrate.New(db, source)
		if err != nil {
			t.Fatal(err)
		}
		if err := changed.Apply(t.Context(), 0); !errors.Is(err, migrate.ErrDrift) {
			t.Fatalf("changed SQL accepted: %v", err)
		}
	})
	t.Run("partial DDL", func(t *testing.T) {
		db := testDB(t)
		source := fstest.MapFS{"000001_partial.sql": {Data: []byte("-- +goose NO TRANSACTION\n-- +goose Up\nCREATE TABLE partial_ddl(id INT PRIMARY KEY);\nINSERT INTO missing_table VALUES (1);\n-- +goose Down\nDROP TABLE partial_ddl;\n")}}
		r, err := migrate.New(db, source)
		if err != nil {
			t.Fatal(err)
		}
		if err := r.Apply(t.Context(), 0); err == nil {
			t.Fatal("expected partial DDL failure")
		}
		var count int
		if err := db.QueryRowContext(t.Context(), "SELECT COUNT(*) FROM partial_ddl").Scan(&count); err != nil {
			t.Fatal("test must prove DDL persisted before failure:", err)
		}
		if err := r.Apply(t.Context(), 0); !errors.Is(err, migrate.ErrDrift) {
			t.Fatalf("interrupted migration retried unsafely: %v", err)
		}
	})
}

func TestUnknownAndInvalidTargets(t *testing.T) {
	db := testDB(t)
	r := runner(t, db)
	for _, target := range []int64{-1, 99} {
		if err := r.Apply(t.Context(), target); err == nil {
			t.Fatalf("invalid target accepted: %d", target)
		}
	}
	if err := r.Down(t.Context(), 0); err == nil {
		t.Fatal("zero-step rollback accepted")
	}
}

func TestBookkeepingDriftIsRejected(t *testing.T) {
	for _, scenario := range []string{"unknown version", "missing journal", "inconsistent log"} {
		t.Run(scenario, func(t *testing.T) {
			db := testDB(t)
			r := runner(t, db)
			if err := r.Apply(t.Context(), 0); err != nil {
				t.Fatal(err)
			}
			var statement string
			switch scenario {
			case "unknown version":
				statement = "INSERT INTO goose_db_version(version_id, is_applied) VALUES (99, TRUE)"
			case "missing journal":
				statement = "DELETE FROM schema_migration_journal WHERE version=1"
			case "inconsistent log":
				statement = "UPDATE goose_db_version SET is_applied=FALSE WHERE version_id=2"
			}
			if _, err := db.ExecContext(t.Context(), statement); err != nil {
				t.Fatal(err)
			}
			if err := r.Verify(t.Context()); !errors.Is(err, migrate.ErrDrift) {
				t.Fatalf("drift not detected: %v", err)
			}
			if err := r.Apply(t.Context(), 0); !errors.Is(err, migrate.ErrDrift) {
				t.Fatalf("drift did not block changes: %v", err)
			}
		})
	}
}

func TestConcurrentMigrationInvocationsNeverApplyTwice(t *testing.T) {
	db := testDB(t)
	r := runner(t, db)
	errorsCh := make(chan error, 6)
	var wait sync.WaitGroup
	start := make(chan struct{})
	for range 6 {
		// Distinct runners cannot rely on an instance-local mutex for safety.
		concurrent := runner(t, db)
		wait.Go(func() {
			<-start
			if err := concurrent.Apply(t.Context(), 0); err != nil && !errors.Is(err, migrate.ErrLocked) {
				errorsCh <- err
			}
		})
	}
	close(start)
	wait.Wait()
	close(errorsCh)
	for err := range errorsCh {
		t.Error(err)
	}
	if err := r.Verify(t.Context()); err != nil {
		t.Fatal(err)
	}
	var applied int
	if err := db.QueryRowContext(t.Context(), "SELECT COUNT(*) FROM goose_db_version WHERE version_id > 0 AND is_applied=TRUE").Scan(&applied); err != nil {
		t.Fatal(err)
	}
	if applied != len(r.Files()) {
		t.Fatalf("expected all applied versions, got %d", applied)
	}
}

func TestMigrationLockBlocksJournalBootstrap(t *testing.T) {
	db := testDB(t)
	for _, statement := range []string{
		"CREATE TABLE schema_migration_lock (id INT NOT NULL PRIMARY KEY, owner VARCHAR(64) NOT NULL, acquired_at DATETIME(6) NOT NULL)",
		"INSERT INTO schema_migration_lock VALUES (1, 'first-installer', UTC_TIMESTAMP(6))",
	} {
		if _, err := db.ExecContext(t.Context(), statement); err != nil {
			t.Fatal(err)
		}
	}
	if err := runner(t, db).Apply(t.Context(), 0); !errors.Is(err, migrate.ErrLocked) {
		t.Fatalf("first-install lock bypassed: %v", err)
	}
	var journals int
	if err := db.QueryRowContext(t.Context(), "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='schema_migration_journal'").Scan(&journals); err != nil {
		t.Fatal(err)
	}
	if journals != 0 {
		t.Fatal("non-owner created migration journal while another installer held the lock")
	}
}

func TestSQLIsFrozenAfterValidation(t *testing.T) {
	db := testDB(t)
	packaged := runner(t, db)
	source := fstest.MapFS{}
	for _, file := range packaged.Files() {
		source[file.Name] = &fstest.MapFile{Data: []byte(file.SQL)}
	}
	r, err := migrate.New(db, source)
	if err != nil {
		t.Fatal(err)
	}
	source["000001_users.sql"].Data = []byte("unexpected edit after validation")
	if applyErr := r.Apply(t.Context(), 0); applyErr != nil {
		t.Fatal(applyErr)
	}
	if verifyErr := packaged.Verify(t.Context()); verifyErr != nil {
		t.Fatal(verifyErr)
	}
}
