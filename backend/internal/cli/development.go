package cli

import (
	"context"
	"errors"
	"time"

	"github.com/go-sql-driver/mysql"
	"github.com/spf13/cobra"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
)

func development(getenv func(string) string) *cobra.Command {
	root := &cobra.Command{Use: "dev", Short: "Isolated local development setup"}
	root.AddCommand(&cobra.Command{Use: "bootstrap", Args: cobra.NoArgs, RunE: func(cmd *cobra.Command, _ []string) (result error) {
		if getenv("APP_ENV") != "development" {
			return errors.New("local bootstrap requires APP_ENV=development")
		}
		dsn := getenv("DEV_ADMIN_DATABASE_DSN")
		cfg, err := mysql.ParseDSN(dsn)
		if err != nil || cfg.DBName != "mysql" || (cfg.Addr != "127.0.0.1:14000" && cfg.Addr != "tidb:4000") {
			return errors.New("bootstrap requires the dedicated local TiDB endpoint")
		}
		password := getenv("DEV_DATABASE_PASSWORD")
		if len(password) < 32 {
			return errors.New("generate local credentials with make setup-env first")
		}
		ctx, cancel := context.WithTimeout(cmd.Context(), time.Minute)
		defer cancel()
		// MySQL-compatible DDL cannot use server-side prepared placeholders. The driver
		// safely escapes these bound values before sending the local identity statements.
		cfg.InterpolateParams = true
		db, err := database.Open(ctx, cfg.FormatDSN(), "development")
		if err != nil {
			return err
		}
		defer func() { result = errors.Join(result, db.Close()) }()
		// Fixed, development-only identities; this command cannot provision arbitrary production databases.
		if _, createErr := db.ExecContext(ctx, "CREATE DATABASE IF NOT EXISTS boosterplus CHARACTER SET utf8mb4 COLLATE utf8mb4_bin"); createErr != nil {
			return createErr
		}
		for _, statement := range []string{"CREATE USER IF NOT EXISTS 'boosterplus_runtime'@'%' IDENTIFIED BY ?", "CREATE USER IF NOT EXISTS 'boosterplus_migration'@'%' IDENTIFIED BY ?"} {
			if _, userErr := db.ExecContext(ctx, statement, password); userErr != nil {
				return userErr
			}
		}
		for _, statement := range []string{"GRANT SELECT, INSERT, UPDATE, DELETE ON boosterplus.* TO 'boosterplus_runtime'@'%'", "GRANT ALL PRIVILEGES ON boosterplus.* TO 'boosterplus_migration'@'%'"} {
			if _, grantErr := db.ExecContext(ctx, statement); grantErr != nil {
				return grantErr
			}
		}
		return nil
	}})
	return root
}
