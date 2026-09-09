package cli

import (
	"context"
	"errors"
	"time"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	"github.com/spf13/cobra"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/config"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func identityCommands(getenv func(string) string) *cobra.Command {
	root := &cobra.Command{Use: "identity", Short: "Audited identity operations"}
	var userID, operator string
	bootstrap := &cobra.Command{Use: "bootstrap-owner", Args: cobra.NoArgs, Short: "Promote the first already-verified, authenticator-enrolled owner", RunE: func(cmd *cobra.Command, _ []string) (result error) {
		if userID == "" || operator == "" {
			return errors.New("--user and --operator are required")
		}
		ctx, cancel := context.WithTimeout(cmd.Context(), 15*time.Second)
		defer cancel()
		cfg, cfgErr := config.Load(getenv)
		if cfgErr != nil {
			return cfgErr
		}
		db, dbErr := database.Open(ctx, cfg.DatabaseDSN, cfg.Environment)
		if dbErr != nil {
			return dbErr
		}
		defer func() { result = errors.Join(result, db.Close()) }()
		if readyErr := database.Ready(ctx, db); readyErr != nil {
			return readyErr
		}
		service, serviceErr := identity.New(ent.NewClient(ent.Driver(entsql.OpenDB(dialect.MySQL, db))), cfg.Identity, nil, nil)
		if serviceErr != nil {
			return serviceErr
		}
		return service.BootstrapOwner(ctx, userID, operator)
	}}
	bootstrap.Flags().StringVar(&userID, "user", "", "already verified user ID")
	bootstrap.Flags().StringVar(&operator, "operator", "", "audited operator reference")
	root.AddCommand(bootstrap)
	return root
}
