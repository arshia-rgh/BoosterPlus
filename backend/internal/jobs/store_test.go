package jobs

import (
	"context"
	"database/sql"
	"encoding/json"
	"strings"
	"testing"
)

func TestInvalidJobsFailBeforeDatabaseAccess(t *testing.T) {
	// Validation must reject these before a zero-value transaction can be used.
	for _, input := range []struct{ kind, key, payload string }{{"bad kind", "key", "{}"}, {"system.ping", "", "{}"}, {"system.ping", strings.Repeat("x", 161), "{}"}, {"system.ping", "key", "{"}, {"system.ping", "key", "{} {}"}, {"system.ping", "key", strings.Repeat("x", 16385)}} {
		if _, err := EnqueueTx(t.Context(), &sql.Tx{}, input.kind, input.key, json.RawMessage(input.payload)); err == nil {
			t.Fatal("invalid job accepted")
		}
	}
	if _, err := EnqueueTx(t.Context(), nil, "system.ping", "key", json.RawMessage(`{}`)); err == nil {
		t.Fatal("nil transaction accepted")
	}
}
func TestHandlerPanicIsRedacted(t *testing.T) {
	err := invoke(t.Context(), Job{}, func(context.Context, Job) error { panic("secret-marker") })
	if err == nil || strings.Contains(err.Error(), "secret-marker") {
		t.Fatal("panic was not safely converted")
	}
}
