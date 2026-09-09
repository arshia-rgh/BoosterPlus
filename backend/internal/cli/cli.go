// Package cli implements the project's operational command interface.
package cli

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"time"

	"github.com/spf13/cobra"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/migrate"
	"github.com/arshia-rgh/BoosterPlus/backend/migration"
)

// New builds an isolated command tree, with no database connection until execution.
func New(output io.Writer, getenv func(string) string) *cobra.Command {
	root := &cobra.Command{Use: "boosterplus", SilenceUsage: true, SilenceErrors: true}
	root.SetOut(output)
	root.SetErr(output)
	root.AddCommand(&cobra.Command{Use: "version", Args: cobra.NoArgs, RunE: func(cmd *cobra.Command, _ []string) error {
		_, err := fmt.Fprintf(cmd.OutOrStdout(), "boosterplus 0.1.0; supported schema: %d\n", database.SchemaVersion)
		return err
	}})
	db := &cobra.Command{Use: "db", Short: "Database operations"}
	group := &cobra.Command{Use: "migrate", Short: "Run hand-authored SQL migrations"}
	var directory string
	group.PersistentFlags().StringVar(&directory, "dir", "", "SQL directory; defaults to packaged migrations")
	source := func() fs.FS {
		if directory != "" {
			return os.DirFS(directory)
		}
		return migration.Files
	}
	group.AddCommand(&cobra.Command{Use: "validate", Args: cobra.NoArgs, RunE: func(cmd *cobra.Command, _ []string) error {
		files, err := migrate.Load(source())
		if err != nil {
			return err
		}
		_, err = fmt.Fprintf(cmd.OutOrStdout(), "%d ordered SQL migrations validated\n", len(files))
		return err
	}})
	group.AddCommand(&cobra.Command{Use: "create NAME", Args: cobra.ExactArgs(1), RunE: func(cmd *cobra.Command, args []string) error {
		if directory == "" {
			return errors.New("create requires --dir pointing at the source migration directory")
		}
		return create(cmd.OutOrStdout(), directory, args[0])
	}})
	for _, operation := range []string{"status", "version", "plan", "verify", "up", "down"} {
		var target int64
		var steps int
		var acknowledge bool
		command := &cobra.Command{Use: operation, Args: cobra.NoArgs, RunE: func(cmd *cobra.Command, _ []string) (result error) {
			if operation == "down" && (!acknowledge || (getenv("APP_ENV") != "development" && getenv("APP_ENV") != "test")) {
				return errors.New("rollback requires development/test environment and --acknowledge-data-loss; production uses forward fixes")
			}
			ctx, cancel := context.WithTimeout(cmd.Context(), 2*time.Minute)
			defer cancel()
			db, err := database.Open(ctx, getenv("MIGRATION_DATABASE_DSN"), getenv("APP_ENV"))
			if err != nil {
				return err
			}
			defer func() { result = errors.Join(result, db.Close()) }()
			runner, err := migrate.New(db, source())
			if err != nil {
				return err
			}
			switch operation {
			case "up":
				return runner.Apply(ctx, target)
			case "down":
				return runner.Down(ctx, steps)
			default:
				if verifyErr := runner.Verify(ctx); verifyErr != nil {
					return verifyErr
				}
				statuses, err := runner.Status(ctx)
				if err != nil {
					return err
				}
				if operation == "version" {
					var version int64
					for _, status := range statuses {
						if status.State == "applied" {
							version = status.Version
						}
					}
					_, err := fmt.Fprintln(cmd.OutOrStdout(), version)
					return err
				}
				if operation == "plan" {
					for i, status := range statuses {
						if status.State != "applied" {
							if _, err := fmt.Fprintln(cmd.OutOrStdout(), runner.Files()[i].SQL); err != nil {
								return err
							}
						}
					}
					return nil
				}
				return json.NewEncoder(cmd.OutOrStdout()).Encode(statuses)
			}
		}}
		if operation == "up" {
			command.Flags().Int64Var(&target, "to", 0, "target version; zero means latest")
		}
		if operation == "down" {
			command.Flags().IntVar(&steps, "steps", 0, "number of versions to reverse")
			command.Flags().BoolVar(&acknowledge, "acknowledge-data-loss", false, "acknowledge destructive rollback")
		}
		group.AddCommand(command)
	}
	db.AddCommand(group)
	root.AddCommand(db)
	addOperations(root, getenv)
	return root
}

func create(output io.Writer, directory, name string) (result error) {
	if !regexp.MustCompile(`^[a-z][a-z0-9_]{0,63}$`).MatchString(name) {
		return errors.New("migration name must be lowercase letters, numbers, and underscores")
	}
	files, err := migrate.Load(os.DirFS(directory))
	if err != nil {
		return err
	}
	root, err := os.OpenRoot(directory)
	if err != nil {
		return fmt.Errorf("open migration directory: %w", err)
	}
	defer func() { result = errors.Join(result, root.Close()) }()
	filename := fmt.Sprintf("%06d_%s.sql", len(files)+1, name)
	file, err := root.OpenFile(filename, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return fmt.Errorf("create migration: %w", err)
	}
	_, writeErr := file.WriteString("-- +goose NO TRANSACTION\n-- +goose Up\n\n-- +goose Down\n")
	if finishErr := errors.Join(writeErr, file.Close()); finishErr != nil {
		return finishErr
	}
	_, err = fmt.Fprintln(output, filepath.Join(directory, filename))
	return err
}
