// Package database opens bounded, explicitly configured MySQL-protocol connections.
package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/go-sql-driver/mysql"
)

// ErrConfiguration deliberately omits DSNs, which can contain credentials.
var ErrConfiguration = errors.New("invalid database configuration")

// Open validates a DSN and pings the database; it never modifies schema.
func Open(ctx context.Context, dsn, environment string) (*sql.DB, error) {
	cfg, err := validated(dsn, environment)
	if err != nil {
		return nil, err
	}
	cfg.ParseTime = true
	cfg.Loc = time.UTC
	cfg.Timeout = 5 * time.Second
	cfg.ReadTimeout = 10 * time.Second
	cfg.WriteTimeout = 10 * time.Second
	connector, err := mysql.NewConnector(cfg)
	if err != nil {
		return nil, ErrConfiguration
	}
	db := sql.OpenDB(connector)
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(time.Minute)
	if err := db.PingContext(ctx); err != nil {
		return nil, errors.Join(fmt.Errorf("database unavailable: %w", err), db.Close())
	}
	return db, nil
}

// Validate checks runtime configuration without opening a connection.
func Validate(dsn, environment string) error {
	_, err := validated(dsn, environment)
	return err
}

func validated(dsn, environment string) (*mysql.Config, error) {
	cfg, err := mysql.ParseDSN(dsn)
	if err != nil || cfg.DBName == "" || cfg.Net != "tcp" || cfg.Addr == "" {
		return nil, ErrConfiguration
	}
	if environment != "development" && environment != "test" && cfg.TLSConfig != "true" {
		return nil, fmt.Errorf("%w: verified TLS is required outside development/test", ErrConfiguration)
	}
	if cfg.AllowAllFiles || cfg.AllowCleartextPasswords || cfg.AllowFallbackToPlaintext || cfg.MultiStatements {
		return nil, fmt.Errorf("%w: unsafe driver flags", ErrConfiguration)
	}
	return cfg, nil
}
