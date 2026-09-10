// Command worker runs durable background jobs; it never migrates schema.
package main

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/config"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
)

func main() { os.Exit(run()) }

func run() int {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := work(ctx, logger); err != nil {
		logger.ErrorContext(ctx, "worker stopped", "error", err)
		return 1
	}
	return 0
}

func work(ctx context.Context, logger *slog.Logger) (result error) {
	cfg, err := config.Load(os.Getenv)
	if err != nil {
		return err
	}
	db, err := database.Open(ctx, cfg.DatabaseDSN, cfg.Environment)
	if err != nil {
		return err
	}
	defer func() { result = errors.Join(result, db.Close()) }()
	if err := database.Ready(ctx, db); err != nil {
		return err
	}
	client := ent.NewClient(ent.Driver(entsql.OpenDB(dialect.MySQL, db)))
	auth, authErr := identity.New(client, cfg.Identity, nil, nil)
	if authErr != nil {
		return authErr
	}
	sender, senderErr := identity.NewSMTP(cfg.Identity)
	if senderErr != nil {
		return senderErr
	}
	maintenance, stopMaintenance := context.WithCancel(ctx)
	defer stopMaintenance()
	done := make(chan struct{})
	go func() { defer close(done); auth.RunCleanup(maintenance, logger) }()
	defer func() { stopMaintenance(); <-done }()
	logger.InfoContext(ctx, "worker started")
	handlers := map[string]jobs.Handler{"system.ping": func(ctx context.Context, job jobs.Job) error {
		logger.InfoContext(ctx, "system job completed", "job_id", job.ID)
		return nil
	}}
	handlers["identity.email"] = auth.EmailHandler(sender)
	notices, noticeErr := notifications.New(client, auth, cfg.Identity.PublicOrigin)
	if noticeErr != nil {
		return noticeErr
	}
	handlers["activity.email"] = notices.EmailHandler(sender)
	return jobs.Run(ctx, jobs.New(db), handlers, logger)
}
