package cli

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/go-sql-driver/mysql"
	"github.com/spf13/cobra"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/config"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/recovery"
)

func recoveryCommand(getenv func(string) string) *cobra.Command {
	return &cobra.Command{Use: "recovery-capture NEW_PRIVATE_DIRECTORY", Args: cobra.ExactArgs(1), Short: "Capture private media against one exact TiDB snapshot; does not qualify complete recovery", RunE: func(cmd *cobra.Command, args []string) (result error) {
		ctx, cancel := context.WithTimeout(cmd.Context(), 9*time.Minute)
		defer cancel()
		cfg, err := config.PrivateMedia(getenv, getenv("APP_ENV"))
		if err != nil {
			return err
		}
		db, err := database.Open(ctx, getenv("DATABASE_DSN"), getenv("APP_ENV"))
		if err != nil {
			return errors.New("recovery database unavailable")
		}
		defer func() { result = errors.Join(result, db.Close()) }()
		if err = database.Ready(ctx, db); err != nil {
			return errors.New("recovery schema is not ready")
		}
		objects := media.NewS3(cfg.Endpoint, cfg.Region, cfg.Bucket, cfg.Access, cfg.Secret, "media/")
		manifest, err := recovery.Capture(ctx, db, objects, args[0])
		if err != nil {
			return err
		}
		_, err = fmt.Fprintf(cmd.OutOrStdout(), "Private capture completed: schema=%d objects=%d; encrypted upload, log coverage and restore remain required\n", manifest.Schema, len(manifest.Entries))
		return err
	}}
}

func restoreMediaCommand(getenv func(string) string) *cobra.Command {
	return &cobra.Command{Use: "recovery-import-media PRIVATE_ARCHIVE", Args: cobra.ExactArgs(1), Short: "Import exact-checkpoint media into a quarantined isolated target only", RunE: func(cmd *cobra.Command, args []string) (result error) {
		if err := recoveryGuard(getenv); err != nil {
			return err
		}
		ctx, cancel := context.WithTimeout(cmd.Context(), 9*time.Minute)
		defer cancel()
		cfg, err := config.PrivateMedia(getenv, getenv("APP_ENV"))
		if err != nil {
			return err
		}
		db, err := database.Open(ctx, getenv("DATABASE_DSN"), getenv("APP_ENV"))
		if err != nil {
			return errors.New("isolated recovery database unavailable")
		}
		defer func() { result = errors.Join(result, db.Close()) }()
		if err = database.Ready(ctx, db); err != nil {
			return errors.New("isolated recovery schema is not ready")
		}
		objects := media.NewS3(cfg.Endpoint, cfg.Region, cfg.Bucket, cfg.Access, cfg.Secret, "media/")
		count, err := recovery.RestoreMedia(ctx, db, objects, args[0])
		if err != nil {
			return err
		}
		_, err = fmt.Fprintf(cmd.OutOrStdout(), "Media import/readback completed: objects=%d; target remains quarantined pending privacy, sessions and finance review\n", count)
		return err
	}}
}

func recoveryGuard(getenv func(string) string) error {
	marker := getenv("RECOVERY_QUARANTINE_MARKER")
	if !filepath.IsAbs(marker) || getenv("RECOVERY_ISOLATED_ACK") != "isolated-no-egress-no-workers" {
		return errors.New("explicit isolated recovery acknowledgement and quarantine marker required")
	}
	info, err := os.Lstat(marker)
	if err != nil || !info.Mode().IsRegular() || info.Size() > 4096 {
		return errors.New("isolated recovery quarantine marker unavailable")
	}
	return nil
}

func recoveryDatabaseCommand(getenv func(string) string, seal bool) *cobra.Command {
	name := "recovery-ready"
	if seal {
		name = "recovery-seal-sessions"
	}
	return &cobra.Command{Use: name, Args: cobra.NoArgs, Short: "Quarantined recovery database probe or authentication invalidation", RunE: func(cmd *cobra.Command, _ []string) (result error) {
		if err := recoveryGuard(getenv); err != nil {
			return err
		}
		cfg, err := mysql.ParseDSN(getenv("DATABASE_DSN"))
		if err != nil {
			return errors.New("invalid isolated recovery database configuration")
		}
		if !seal {
			cfg.DBName = "information_schema"
		}
		ctx, cancel := context.WithTimeout(cmd.Context(), time.Minute)
		defer cancel()
		db, err := database.Open(ctx, cfg.FormatDSN(), getenv("APP_ENV"))
		if err != nil {
			return errors.New("isolated recovery database unavailable")
		}
		defer func() { result = errors.Join(result, db.Close()) }()
		if seal {
			if err = database.Ready(ctx, db); err != nil {
				return errors.New("isolated recovery schema is not ready")
			}
			if err = recovery.SealSessions(ctx, db); err != nil {
				return err
			}
		}
		_, err = fmt.Fprintln(cmd.OutOrStdout(), "Recovery operation completed; target remains quarantined")
		return err
	}}
}
