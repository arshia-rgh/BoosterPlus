// Command cli runs explicit Booster Plus administration commands.
package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/cli"
)

func main() {
	os.Exit(run())
}

func run() int {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := cli.New(os.Stdout, os.Getenv).ExecuteContext(ctx); err != nil {
		slog.New(slog.NewJSONHandler(os.Stderr, nil)).ErrorContext(ctx, "command failed", "error", err)
		return 1
	}
	return 0
}
