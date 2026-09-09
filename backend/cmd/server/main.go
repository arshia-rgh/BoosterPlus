// Command server runs the Booster Plus HTTP API.
package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/app"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/config"
)

func main() { os.Exit(run()) }

func run() int {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	cfg, err := config.Load(os.Getenv)
	if err != nil {
		logger.ErrorContext(ctx, "configuration rejected", "error", err)
		return 1
	}
	if err := app.Server(ctx, cfg, logger); err != nil {
		logger.ErrorContext(ctx, "API stopped", "error", err)
		return 1
	}
	return 0
}
