package cli

import (
	"bytes"
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"time"

	"github.com/spf13/cobra"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/config"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
)

func dependencies(getenv func(string) string) *cobra.Command {
	group := &cobra.Command{Use: "dependencies", Short: "Verify deployment data dependencies"}
	for _, action := range []string{"ready", "check"} {
		group.AddCommand(&cobra.Command{Use: action, Short: "Read schema readiness; check also scans and round-trips one temporary private object", Args: cobra.NoArgs, RunE: func(cmd *cobra.Command, _ []string) (result error) {
			ctx, cancel := context.WithTimeout(cmd.Context(), time.Minute)
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
			if action == "ready" {
				return nil
			}
			objects := media.NewS3(cfg.Media.Endpoint, cfg.Media.Region, cfg.Media.Bucket, cfg.Media.Access, cfg.Media.Secret, "media/")
			if err = dependencyProbe(ctx, objects, media.Clamd{Network: cfg.Media.ScannerNetwork, Address: cfg.Media.ScannerAddress}); err != nil {
				return err
			}
			_, err = fmt.Fprintln(cmd.OutOrStdout(), "Database, private storage and scanner checks passed")
			return err
		}})
	}
	return group
}

func dependencyProbe(ctx context.Context, objects media.Objects, scanner media.Scanner) (result error) {
	data := []byte("Booster Plus deployment dependency probe")
	if err := scanner.Scan(ctx, data); err != nil {
		return err
	}
	key := "checks/" + rand.Text()
	// Cleanup also follows an ambiguous write and retains a bounded deadline if
	// the parent check is cancelled. Failure is reported rather than hidden.
	defer func() {
		cleanup, cancel := context.WithTimeout(context.WithoutCancel(ctx), 10*time.Second)
		defer cancel()
		result = errors.Join(result, objects.Delete(cleanup, key))
	}()
	if err := objects.Put(ctx, key, data, "text/plain"); err != nil {
		return err
	}
	got, err := objects.Get(ctx, key)
	if err != nil {
		return err
	}
	if !bytes.Equal(got, data) {
		return errors.New("private storage integrity check failed")
	}
	return nil
}
