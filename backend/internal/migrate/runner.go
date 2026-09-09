package migrate

import (
	"context"
	"crypto/rand"
	"database/sql"
	"errors"
	"fmt"
	"io/fs"
	"time"

	"github.com/go-sql-driver/mysql"
	"github.com/pressly/goose/v3"
)

// ErrLocked requires operator investigation; migration locks never expire automatically.
var ErrLocked = errors.New("another migration runner owns the durable lock; inspect before recovery")

// ErrDrift indicates changed, missing, interrupted, or inconsistent migrations.
var ErrDrift = errors.New("migration integrity failure")

// Runner owns SQL migration execution. Never use it from server or worker startup.
type Runner struct {
	db     *sql.DB
	source fs.FS
	files  []File
}

// Status reports the journal state without mutating the schema.
type Status struct {
	Version int64  `json:"version"`
	Name    string `json:"name"`
	State   string `json:"state"`
}

// New validates the packaged migration set without accessing a database.
func New(db *sql.DB, source fs.FS) (*Runner, error) {
	files, err := Load(source)
	if err != nil {
		return nil, err
	}
	frozen, err := snapshot(files)
	if err != nil {
		return nil, err
	}
	return &Runner{db: db, source: frozen, files: files}, nil
}

// Files returns a copy of the migration manifest.
func (r *Runner) Files() []File { return append([]File(nil), r.files...) }

// Status reads existing journal records. An empty database has only pending files.
func (r *Runner) Status(ctx context.Context) (_ []Status, resultErr error) {
	states := make(map[int64]string)
	rows, err := r.db.QueryContext(ctx, "SELECT version, checksum, state FROM schema_migration_journal ORDER BY version")
	if err != nil {
		var mysqlErr *mysql.MySQLError
		if !errors.As(err, &mysqlErr) || mysqlErr.Number != 1146 {
			return nil, fmt.Errorf("read migration journal: %w", err)
		}
	} else {
		defer func() { resultErr = errors.Join(resultErr, rows.Close()) }()
		for rows.Next() {
			var version int64
			var checksum, state string
			if err := rows.Scan(&version, &checksum, &state); err != nil {
				return nil, fmt.Errorf("scan journal: %w", err)
			}
			if version < 1 || version > int64(len(r.files)) || r.files[version-1].Checksum != checksum {
				return nil, fmt.Errorf("%w: changed or missing version %d", ErrDrift, version)
			}
			if state != "applied" && state != "rolled_back" {
				return nil, fmt.Errorf("%w: version %d is %s", ErrDrift, version, state)
			}
			states[version] = state
		}
		if err := rows.Err(); err != nil {
			return nil, fmt.Errorf("read journal rows: %w", err)
		}
	}
	result := make([]Status, 0, len(r.files))
	for _, file := range r.files {
		state := states[file.Version]
		if state == "" {
			state = "pending"
		}
		result = append(result, Status{Version: file.Version, Name: file.Name, State: state})
	}
	return result, nil
}

func (r *Runner) bootstrap(ctx context.Context) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS schema_migration_lock (id INT NOT NULL PRIMARY KEY, owner VARCHAR(64) NOT NULL, acquired_at DATETIME(6) NOT NULL)`,
		`CREATE TABLE IF NOT EXISTS schema_migration_journal (version BIGINT NOT NULL PRIMARY KEY, filename VARCHAR(255) NOT NULL, checksum CHAR(64) NOT NULL, state VARCHAR(20) NOT NULL, started_at DATETIME(6) NOT NULL, finished_at DATETIME(6) NULL)`,
	}
	for _, statement := range statements {
		if _, err := r.db.ExecContext(ctx, statement); err != nil {
			return fmt.Errorf("bootstrap migration bookkeeping: %w", err)
		}
	}
	return nil
}

// Apply migrates up to target; target zero selects all available migrations.
func (r *Runner) Apply(ctx context.Context, target int64) error {
	if target == 0 {
		target = int64(len(r.files))
	}
	if target < 1 || target > int64(len(r.files)) {
		return errors.New("target migration does not exist")
	}
	return r.exclusive(ctx, func(provider *goose.Provider) error {
		statuses, err := r.Status(ctx)
		if err != nil {
			return err
		}
		for _, status := range statuses {
			if status.Version > target || status.State == "applied" {
				continue
			}
			if err := r.applyOne(ctx, provider, status.Version, true); err != nil {
				return err
			}
		}
		return nil
	})
}

// Down reverses exactly steps versions. The CLI separately restricts environments.
func (r *Runner) Down(ctx context.Context, steps int) error {
	if steps < 1 {
		return errors.New("down requires a positive step count")
	}
	return r.exclusive(ctx, func(provider *goose.Provider) error {
		if _, err := r.Status(ctx); err != nil {
			return err
		}
		current, err := provider.GetDBVersion(ctx)
		if err != nil {
			return fmt.Errorf("read schema version: %w", err)
		}
		if int64(steps) > current {
			return errors.New("rollback exceeds applied migrations")
		}
		for version := current; version > current-int64(steps); version-- {
			if err := r.applyOne(ctx, provider, version, false); err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *Runner) exclusive(ctx context.Context, action func(*goose.Provider) error) (result error) {
	if err := r.bootstrap(ctx); err != nil {
		return err
	}
	owner := rand.Text()
	_, err := r.db.ExecContext(ctx, "INSERT INTO schema_migration_lock (id, owner, acquired_at) VALUES (1, ?, UTC_TIMESTAMP(6))", owner)
	if err != nil {
		var mysqlErr *mysql.MySQLError
		if errors.As(err, &mysqlErr) && mysqlErr.Number == 1062 {
			return ErrLocked
		}
		return fmt.Errorf("acquire migration lock: %w", err)
	}
	defer func() {
		cleanup, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
		defer cancel()
		_, releaseErr := r.db.ExecContext(cleanup, "DELETE FROM schema_migration_lock WHERE id = 1 AND owner = ?", owner)
		result = errors.Join(result, releaseErr)
	}()
	provider, err := goose.NewProvider(goose.DialectMySQL, r.db, r.source, goose.WithDisableGlobalRegistry(true))
	if err != nil {
		return fmt.Errorf("initialize SQL migration provider: %w", err)
	}
	if err := r.Verify(ctx); err != nil {
		return err
	}
	return action(provider)
}

func (r *Runner) applyOne(ctx context.Context, provider *goose.Provider, version int64, up bool) error {
	file := r.files[version-1]
	_, err := r.db.ExecContext(ctx, `INSERT INTO schema_migration_journal (version, filename, checksum, state, started_at) VALUES (?, ?, ?, 'running', UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE state='running', started_at=UTC_TIMESTAMP(6), finished_at=NULL`, file.Version, file.Name, file.Checksum)
	if err != nil {
		return fmt.Errorf("record migration attempt: %w", err)
	}
	if _, applyErr := provider.ApplyVersion(ctx, version, up); applyErr != nil {
		return fmt.Errorf("migration %s interrupted; inspect schema and journal before recovery: %w", file.Name, applyErr)
	}
	state := "applied"
	if !up {
		state = "rolled_back"
	}
	_, err = r.db.ExecContext(ctx, "UPDATE schema_migration_journal SET state=?, finished_at=UTC_TIMESTAMP(6) WHERE version=?", state, version)
	if err != nil {
		return fmt.Errorf("finalize migration journal: %w", err)
	}
	return nil
}
