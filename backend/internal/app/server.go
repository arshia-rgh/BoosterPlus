// Package app wires process dependencies and graceful lifecycle management.
package app

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"time"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/availability"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/config"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/conversations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/httpapi"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/operations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/privacy"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/reports"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resale"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/reviews"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/shop"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/sitecontent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/submissions"
)

// Server opens the runtime database without DDL privileges and serves HTTP.
func Server(ctx context.Context, cfg config.Config, logger *slog.Logger) (result error) {
	db, err := database.Open(ctx, cfg.DatabaseDSN, cfg.Environment)
	if err != nil {
		return err
	}
	defer func() { result = errors.Join(result, db.Close()) }()
	ready := func(check context.Context) error { return database.Ready(check, db) }
	if readyErr := ready(ctx); readyErr != nil {
		return readyErr
	}
	provider, providerErr := identity.NewGoogle(ctx, cfg.Identity)
	if providerErr != nil {
		return providerErr
	}
	client := ent.NewClient(ent.Driver(entsql.OpenDB(dialect.MySQL, db)))
	auth, authErr := identity.New(client, cfg.Identity, nil, provider)
	if authErr != nil {
		return authErr
	}
	listener, err := (&net.ListenConfig{}).Listen(ctx, "tcp", cfg.HTTPAddress)
	if err != nil {
		return fmt.Errorf("listen: %w", err)
	}
	logger.InfoContext(ctx, "API listening", "address", listener.Addr().String())
	notices, noticeErr := notifications.New(client, auth, cfg.Identity.PublicOrigin)
	if noticeErr != nil {
		return noticeErr
	}
	files := media.New(client, auth, media.NewS3(cfg.Media.Endpoint, cfg.Media.Region, cfg.Media.Bucket, cfg.Media.Access, cfg.Media.Secret, "media/"), media.Clamd{Network: cfg.Media.ScannerNetwork, Address: cfg.Media.ScannerAddress})
	work, workErr := fulfillment.New(client, auth, cfg.Vault, nil)
	if workErr != nil {
		return workErr
	}
	alerts, alertErr := availability.New(client, auth, cfg.Identity.PublicOrigin, nil)
	if alertErr != nil {
		return alertErr
	}
	var paymentProvider payments.Provider
	if cfg.Crypto.Provider != nil {
		paymentProvider, err = nowpayments.New(*cfg.Crypto.Provider)
		if err != nil {
			return err
		}
	}
	finance := payments.New(client, auth, paymentProvider, cfg.Crypto.Account, cfg.Crypto.Enabled, nil)
	if outgoing, ok := paymentProvider.(payments.OutgoingProvider); ok {
		finance.ConfigureOutgoing(outgoing, cfg.Crypto.OutgoingEnabled)
	}
	return Serve(ctx, listener, httpapi.New(ready, logger, cfg.Environment != "development" && cfg.Environment != "test", auth.Register, shop.New(client, auth, nil).Register, finance.Register, resale.New(client, auth, cfg.Vault, nil).Register, catalog.New(client, auth).Register, orders.New(client, auth, nil).Register, conversations.New(client, auth, nil).Register, notices.Register, files.Register, work.Register, submissions.New(client, auth, nil).Register, reviews.New(client, auth, nil).Register, operations.New(client, auth, nil).Register, alerts.Register, reports.New(auth, nil).Register, privacy.New(client, auth, nil).Register, sitecontent.New(client, auth, nil).Register))
}

// Serve applies transport timeouts and drains in-flight work on cancellation.
func Serve(ctx context.Context, listener net.Listener, handler http.Handler) error {
	server := &http.Server{Handler: handler, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: time.Minute, MaxHeaderBytes: 16 << 10, BaseContext: func(net.Listener) context.Context { return context.WithoutCancel(ctx) }}
	done := make(chan error, 1)
	go func() { done <- server.Serve(listener) }()
	select {
	case serveErr := <-done:
		if errors.Is(serveErr, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("serve HTTP: %w", serveErr)
	case <-ctx.Done():
		shutdown, cancel := context.WithTimeout(context.WithoutCancel(ctx), 10*time.Second)
		defer cancel()
		if shutdownErr := server.Shutdown(shutdown); shutdownErr != nil {
			return errors.Join(shutdownErr, server.Close())
		}
		serveErr := <-done
		if serveErr != nil && !errors.Is(serveErr, http.ErrServerClosed) {
			return serveErr
		}
		return nil
	}
}
