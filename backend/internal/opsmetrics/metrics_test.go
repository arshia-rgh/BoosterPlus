package opsmetrics

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
)

func TestPartialFailureNeverLooksHealthyOrLeaksDiagnostic(t *testing.T) {
	t.Parallel()
	calls := 0
	got, err := collect(t.Context(), func(context.Context, string) (int64, error) {
		calls++
		if calls == 3 {
			return 0, errors.New("private database connection detail")
		}
		return 2, nil
	})
	if err == nil || got.Values != nil || strings.Contains(err.Error(), "private") {
		t.Fatal("failure returned a partial healthy snapshot or private diagnostic")
	}
}

func TestNumericSnapshotAndCancellation(t *testing.T) {
	t.Parallel()
	got, err := collect(t.Context(), func(_ context.Context, query string) (int64, error) {
		if !strings.HasPrefix(query, "SELECT ") || strings.Contains(query, ";") {
			t.Fatal("metrics must only read fixed aggregates")
		}
		return 0, nil
	})
	if err != nil || len(got.Values) != len(queries) || got.ObservedAt.IsZero() {
		t.Fatal("missing collection evidence", err)
	}
	raw, err := json.Marshal(got)
	if err != nil || strings.Contains(string(raw), "user_id") || strings.Contains(string(raw), "payload") {
		t.Fatal("unexpected private metric labels", err)
	}
	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	if _, err = collect(ctx, func(context.Context, string) (int64, error) {
		t.Fatal("cancelled collection queried database")
		return 0, nil
	}); err == nil {
		t.Fatal("cancellation considered healthy")
	}
	if _, err = collect(t.Context(), func(context.Context, string) (int64, error) { return -1, nil }); err == nil {
		t.Fatal("invalid negative aggregate accepted")
	}
}
