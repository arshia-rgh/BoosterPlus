package cli

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/spf13/cobra"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/config"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
)

func addOperations(root *cobra.Command, getenv func(string) string) {
	root.AddCommand(development(getenv), identityCommands(getenv))
	configuration := &cobra.Command{Use: "config"}
	configuration.AddCommand(&cobra.Command{Use: "validate", Args: cobra.NoArgs, RunE: func(cmd *cobra.Command, _ []string) error {
		if _, err := config.Load(getenv); err != nil {
			return err
		}
		_, err := fmt.Fprintln(cmd.OutOrStdout(), "configuration valid")
		return err
	}})
	root.AddCommand(configuration)
	root.AddCommand(&cobra.Command{Use: "healthcheck", Args: cobra.NoArgs, RunE: func(cmd *cobra.Command, _ []string) (result error) {
		ctx, cancel := context.WithTimeout(cmd.Context(), 3*time.Second)
		defer cancel()
		request, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://127.0.0.1:8080/health/ready", nil)
		if err != nil {
			return err
		}
		response, err := (&http.Client{Timeout: 3 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}).Do(request)
		if err != nil {
			return errors.New("API healthcheck unavailable")
		}
		defer func() { result = errors.Join(result, response.Body.Close()) }()
		if response.StatusCode != http.StatusOK {
			return errors.New("API not ready")
		}
		return nil
	}})
	group := &cobra.Command{Use: "jobs", Short: "Inspect and operate the durable queue"}
	for _, operation := range []string{"enqueue-ping", "failed", "retry"} {
		args := cobra.NoArgs
		if operation != "failed" {
			args = cobra.ExactArgs(1)
		}
		group.AddCommand(&cobra.Command{Use: operation + " [ID_OR_KEY]", Args: args, RunE: func(cmd *cobra.Command, args []string) (result error) {
			ctx, cancel := context.WithTimeout(cmd.Context(), 10*time.Second)
			defer cancel()
			db, err := database.Open(ctx, getenv("DATABASE_DSN"), getenv("APP_ENV"))
			if err != nil {
				return err
			}
			defer func() { result = errors.Join(result, db.Close()) }()
			if readyErr := database.Ready(ctx, db); readyErr != nil {
				return readyErr
			}
			switch operation {
			case "enqueue-ping":
				tx, beginErr := db.BeginTx(ctx, nil)
				if beginErr != nil {
					return beginErr
				}
				id, enqueueErr := jobs.EnqueueTx(ctx, tx, "system.ping", args[0], json.RawMessage(`{}`))
				if enqueueErr != nil {
					return errors.Join(enqueueErr, tx.Rollback())
				}
				if commitErr := tx.Commit(); commitErr != nil {
					return commitErr
				}
				_, writeErr := fmt.Fprintln(cmd.OutOrStdout(), id)
				return writeErr
			case "retry":
				updated, updateErr := db.ExecContext(ctx, "UPDATE jobs SET state='pending',attempts=0,owner=NULL,lease_until=NULL,last_error=NULL,available_at=UTC_TIMESTAMP(6),retry_generation=retry_generation+1 WHERE id=? AND state='failed' AND retry_generation<2147483646", args[0])
				if updateErr != nil {
					return updateErr
				}
				count, countErr := updated.RowsAffected()
				if countErr != nil {
					return countErr
				}
				if count != 1 {
					return errors.New("failed job not found")
				}
				return nil
			default:
				return printFailed(ctx, cmd, db)
			}
		}})
	}
	root.AddCommand(group)
}

func printFailed(ctx context.Context, cmd *cobra.Command, db *sql.DB) (result error) {
	rows, err := db.QueryContext(ctx, "SELECT id,kind,attempts,last_error FROM jobs WHERE state='failed' ORDER BY created_at,id LIMIT 100")
	if err != nil {
		return err
	}
	defer func() { result = errors.Join(result, rows.Close()) }()
	for rows.Next() {
		var id, kind, code string
		var attempts int
		if scanErr := rows.Scan(&id, &kind, &attempts, &code); scanErr != nil {
			return scanErr
		}
		if _, writeErr := fmt.Fprintf(cmd.OutOrStdout(), "%s\t%s\t%d\t%s\n", id, kind, attempts, code); writeErr != nil {
			return writeErr
		}
	}
	return rows.Err()
}
