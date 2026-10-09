//go:build integration

package integration

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"strings"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
)

const fixtureScannerAddress = "127.0.0.1:13310"

var fixtureCleanSample = []byte("PLAYORA isolated scanner readiness control.")
var fixtureInfectedSample = []byte("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*")

type fixtureScannerChecks struct {
	scan   func(context.Context, []byte) error
	reload func(context.Context) error
	now    func() time.Time
	pause  func(context.Context) error
}

// awaitFixtureScanner is test infrastructure only. PING/container health cannot
// prove the application accepts the loaded definition age. Use the real scanner
// contract, never relax its freshness check or replace a failed scan with success.
func awaitFixtureScanner(ctx context.Context, checks fixtureScannerChecks) error {
	deadline, nextReload := checks.now().Add(5*time.Minute), checks.now()
	reloads := 0
	var last error
	for checks.now().Before(deadline) && ctx.Err() == nil {
		last = checks.scan(ctx, fixtureCleanSample)
		if last == nil {
			if err := checks.scan(ctx, fixtureInfectedSample); !errors.Is(err, media.ErrInfected) {
				return fmt.Errorf("scanner fixture did not detect EICAR control: %w", errors.Join(errors.New("positive control failed"), err))
			}
			return nil
		}
		if errors.Is(last, media.ErrInfected) {
			return fmt.Errorf("scanner fixture rejected clean control: %w", last)
		}
		// This exact private diagnostic comes from media.Clamd's unchanged 72h
		// freshness check. A reload acknowledgement is never a readiness pass.
		if last.Error() == "scanner definitions stale" && reloads < 3 && !checks.now().Before(nextReload) {
			reloads++
			if err := checks.reload(ctx); err != nil {
				return fmt.Errorf("scanner fixture reload request failed: %w", err)
			}
			nextReload = checks.now().Add(time.Minute)
		}
		if err := checks.pause(ctx); err != nil {
			return fmt.Errorf("scanner fixture readiness interrupted: %w", errors.Join(last, err))
		}
	}
	return fmt.Errorf("scanner fixture not ready after bounded wait (%d reloads): %w", reloads, errors.Join(last, ctx.Err()))
}

func reloadFixtureScanner(ctx context.Context) (result error) {
	// The fixed development fixture port cannot be redirected to a production
	// daemon through environment variables or caller-supplied addresses.
	conn, err := (&net.Dialer{Timeout: 3 * time.Second}).DialContext(ctx, "tcp", fixtureScannerAddress)
	if err != nil {
		return errors.New("isolated scanner connection unavailable")
	}
	defer func() { result = errors.Join(result, conn.Close()) }()
	deadline := time.Now().Add(15 * time.Second)
	if end, ok := ctx.Deadline(); ok && end.Before(deadline) {
		deadline = end
	}
	if err = conn.SetDeadline(deadline); err != nil {
		return err
	}
	if _, err = io.WriteString(conn, "zRELOAD\x00"); err != nil {
		return errors.New("isolated scanner reload write failed")
	}
	reply, err := bufio.NewReader(io.LimitReader(conn, 512)).ReadString(0)
	if err != nil || strings.TrimSuffix(reply, "\x00") != "RELOADING" {
		return errors.New("isolated scanner did not acknowledge reload")
	}
	return nil
}

func TestScannerFixtureReadiness(t *testing.T) {
	ctx, cancel := context.WithTimeout(t.Context(), 5*time.Minute)
	defer cancel()
	scanner := media.Clamd{Network: "tcp", Address: fixtureScannerAddress}
	checks := fixtureScannerChecks{scan: scanner.Scan, reload: func(ctx context.Context) error {
		t.Log("Loaded fixture definitions are stale; requesting a bounded isolated reload.")
		return reloadFixtureScanner(ctx)
	}, now: time.Now, pause: func(ctx context.Context) error {
		timer := time.NewTimer(5 * time.Second)
		defer timer.Stop()
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-timer.C:
			return nil
		}
	}}
	if err := awaitFixtureScanner(ctx, checks); err != nil {
		t.Fatal(err)
	}
	t.Log("Isolated scanner loaded definitions satisfy the application freshness check; clean and EICAR controls passed.")
}

func TestScannerFixtureReadinessPolicy(t *testing.T) {
	for _, scenario := range []struct {
		name        string
		stale       int
		cleanError  error
		infectError error
		reloadError error
		wantPass    bool
		wantReloads int
	}{
		{"already fresh", 0, nil, media.ErrInfected, nil, true, 0},
		{"reload waits for fresh definitions", 4, nil, media.ErrInfected, nil, true, 1},
		{"stale never passes and reloads bounded", 100, nil, media.ErrInfected, nil, false, 3},
		{"failed reload", 1, nil, media.ErrInfected, errors.New("reload unavailable"), false, 1},
		{"clean control infected", 0, media.ErrInfected, media.ErrInfected, nil, false, 0},
		{"positive control incorrectly clean", 0, nil, nil, nil, false, 0},
		{"positive control unavailable", 0, nil, errors.New("scanner unavailable"), nil, false, 0},
		{"daemon unavailable remains failure", 0, errors.New("scanner unavailable"), media.ErrInfected, nil, false, 0},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			now := time.Date(2026, time.October, 8, 0, 0, 0, 0, time.UTC)
			attempts, reloads := 0, 0
			checks := fixtureScannerChecks{
				now: func() time.Time { return now },
				pause: func(context.Context) error {
					now = now.Add(5 * time.Second)
					return nil
				},
				reload: func(context.Context) error { reloads++; return scenario.reloadError },
				scan: func(_ context.Context, data []byte) error {
					if string(data) == string(fixtureInfectedSample) {
						return scenario.infectError
					}
					attempts++
					if attempts <= scenario.stale {
						return errors.New("scanner definitions stale")
					}
					return scenario.cleanError
				},
			}
			err := awaitFixtureScanner(t.Context(), checks)
			if (err == nil) != scenario.wantPass || reloads != scenario.wantReloads || attempts > 60 {
				t.Fatalf("pass=%v, reloads=%d, attempts=%d: %v", err == nil, reloads, attempts, err)
			}
		})
	}
}
