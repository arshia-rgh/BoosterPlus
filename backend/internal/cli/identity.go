package cli

import (
	"context"
	"errors"
	"fmt"
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
	bootstrap := &cobra.Command{Use: "bootstrap-owner", Args: cobra.NoArgs, Short: "Promote the first verified, authenticator-enrolled admin account to owner", RunE: func(cmd *cobra.Command, _ []string) error {
		if userID == "" || operator == "" {
			return errors.New("--user and --operator are required")
		}
		return runIdentityOperation(cmd.Context(), getenv, func(ctx context.Context, service *identity.Service) error {
			return service.BootstrapOwner(ctx, userID, operator)
		})
	}}
	bootstrap.Flags().StringVar(&userID, "user", "", "already verified admin account ID")
	bootstrap.Flags().StringVar(&operator, "operator", "", "audited operator reference")
	var email, preparationOperator string
	prepare := &cobra.Command{Use: "prepare-owner", Args: cobra.NoArgs, Short: "Create the initial independent admin account before normal admin sign-in and MFA enrollment", RunE: func(cmd *cobra.Command, _ []string) error {
		if email == "" || preparationOperator == "" {
			return errors.New("--email and --operator are required")
		}
		return runIdentityOperation(cmd.Context(), getenv, func(ctx context.Context, service *identity.Service) error {
			account, err := service.PrepareOwner(ctx, email, preparationOperator)
			if err != nil {
				return err
			}
			_, err = fmt.Fprintln(cmd.OutOrStdout(), account.ID)
			return err
		})
	}}
	prepare.Flags().StringVar(&email, "email", "", "mailbox the initial admin will verify")
	prepare.Flags().StringVar(&preparationOperator, "operator", "", "audited operator reference")
	root.AddCommand(prepare, bootstrap)
	return root
}

func runIdentityOperation(parent context.Context, getenv func(string) string, operation func(context.Context, *identity.Service) error) (result error) {
	ctx, cancel := context.WithTimeout(parent, 15*time.Second)
	defer cancel()
	cfg, err := config.Load(getenv)
	if err != nil {
		return err
	}
	db, err := database.Open(ctx, cfg.DatabaseDSN, cfg.Environment)
	if err != nil {
		return err
	}
	defer func() { result = errors.Join(result, db.Close()) }()
	if err = database.Ready(ctx, db); err != nil {
		return err
	}
	service, err := identity.New(ent.NewClient(ent.Driver(entsql.OpenDB(dialect.MySQL, db))), cfg.Identity, nil, nil)
	if err != nil {
		return err
	}
	return operation(ctx, service)
}
