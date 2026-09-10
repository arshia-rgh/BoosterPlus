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
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/config"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/conversations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/httpapi"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
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
	return Serve(ctx, listener, httpapi.New(ready, logger, cfg.Environment != "development" && cfg.Environment != "test", auth.Register, catalog.New(client, auth).Register, orders.New(client, auth, nil).Register, conversations.New(client, auth, nil).Register, notices.Register))
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
