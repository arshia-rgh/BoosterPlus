package cli

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/spf13/cobra"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/opsmetrics"
)

func metricsCommand(getenv func(string) string) *cobra.Command {
	return &cobra.Command{Use: "operations-snapshot", Args: cobra.NoArgs, Short: "Read private numeric operational aggregates (no payloads or identifiers)", RunE: func(cmd *cobra.Command, _ []string) (result error) {
		ctx, cancel := context.WithTimeout(cmd.Context(), 20*time.Second)
		defer cancel()
		db, err := database.Open(ctx, getenv("DATABASE_DSN"), getenv("APP_ENV"))
		if err != nil {
			return errors.New("operational database unavailable")
		}
		defer func() { result = errors.Join(result, db.Close()) }()
		if err = database.Ready(ctx, db); err != nil {
			return errors.New("operational schema is not ready")
		}
		snapshot, err := opsmetrics.Read(ctx, db)
		if err != nil {
			return err
		}
		return json.NewEncoder(cmd.OutOrStdout()).Encode(snapshot)
	}}
}
