package cli

import (
	"context"
	"errors"
	"fmt"
	"time"

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
