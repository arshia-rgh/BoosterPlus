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
	"github.com/arshia-rgh/BoosterPlus/backend/internal/availability"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/config"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
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
	if err = database.Ready(ctx, db); err != nil {
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
	files := media.New(client, auth, media.NewS3(cfg.Media.Endpoint, cfg.Media.Region, cfg.Media.Bucket, cfg.Media.Access, cfg.Media.Secret, "media/"), media.Clamd{Network: cfg.Media.ScannerNetwork, Address: cfg.Media.ScannerAddress})
	secrets, secretErr := vault.New(client, auth, cfg.Vault, vault.DenyAll, nil)
	if secretErr != nil {
		return secretErr
	}
	execution, executionErr := fulfillment.New(client, auth, cfg.Vault, nil)
	if executionErr != nil {
		return executionErr
	}
	alerts, alertErr := availability.New(client, auth, cfg.Identity.PublicOrigin, nil)
	if alertErr != nil {
		return alertErr
	}
	maintenance, stopMaintenance := context.WithCancel(ctx)
	defer stopMaintenance()
	alertsDone := make(chan struct{})
	go func() { defer close(alertsDone); alerts.RunReconciliation(maintenance, logger) }()
	defer func() { stopMaintenance(); <-alertsDone }()
	remindersDone := make(chan struct{})
	go func() { defer close(remindersDone); execution.RunReminders(maintenance, logger) }()
	defer func() { stopMaintenance(); <-remindersDone }()
	vaultDone := make(chan struct{})
	go func() { defer close(vaultDone); secrets.RunCleanup(maintenance, logger) }()
	defer func() { stopMaintenance(); <-vaultDone }()
	mediaDone := make(chan struct{})
	go func() { defer close(mediaDone); files.RunCleanup(maintenance, logger) }()
	defer func() { stopMaintenance(); <-mediaDone }()
	done := make(chan struct{})
	go func() { defer close(done); auth.RunCleanup(maintenance, logger) }()
	defer func() { stopMaintenance(); <-done }()
	logger.InfoContext(ctx, "worker started")
	handlers := map[string]jobs.Handler{"system.ping": func(ctx context.Context, job jobs.Job) error {
		logger.InfoContext(ctx, "system job completed", "job_id", job.ID)
		return nil
	}}
	var provider payments.Provider
	if cfg.Crypto.Provider != nil {
		provider, err = nowpayments.New(*cfg.Crypto.Provider)
		if err != nil {
			return err
		}
	}
	finance := payments.New(client, auth, provider, cfg.Crypto.Account, cfg.Crypto.Enabled, nil)
	if outgoing, ok := provider.(payments.OutgoingProvider); ok {
		finance.ConfigureOutgoing(outgoing, cfg.Crypto.OutgoingEnabled)
	}
	financeDone := make(chan struct{})
	go func() { defer close(financeDone); finance.RunMaintenance(maintenance, logger) }()
	defer func() { stopMaintenance(); <-financeDone }()
	handlers["payments.refund"] = finance.RefundHandler()
	handlers["payments.outgoing_reconcile"] = finance.OutgoingHandler()
	handlers["payments.invoice"] = finance.InvoiceHandler()
	handlers["payments.reconcile"] = finance.ReconcileHandler()
	handlers["identity.email"] = auth.EmailHandler(sender)
	notices, noticeErr := notifications.New(client, auth, cfg.Identity.PublicOrigin)
	if noticeErr != nil {
		return noticeErr
	}
	handlers["activity.email"] = notices.EmailHandler(sender)
	handlers["media.scan"] = files.ScanHandler()
	handlers["availability.changed"] = alerts.ChangedHandler()
	handlers["availability.fanout"] = alerts.FanoutHandler()
	handlers["availability.email"] = alerts.EmailHandler(sender)
	return jobs.Run(ctx, jobs.New(db), handlers, logger)
}
