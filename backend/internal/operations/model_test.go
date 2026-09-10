package operations

import (
	"strings"
	"testing"
	"time"
)

func TestOperationalInputBoundaries(t *testing.T) {
	t.Parallel()
	for _, bad := range []string{"", "../../task", "task?secret", "task\n", "界", strings.Repeat("x", 65)} {
		if validID(bad) {
			t.Fatal("unsafe job reference", bad)
		}
	}
	for _, bad := range []string{"", " \n ", strings.Repeat("界", 2001), "reason\x00"} {
		if validReason(bad) {
			t.Fatal("unsafe audit explanation")
		}
	}
	at := time.Date(2026, 9, 10, 10, 0, 0, 123000, time.UTC)
	token := continuation(at, "safe-task_123")
	got, id, err := cursor(token)
	if err != nil || !got.Equal(at) || id != "safe-task_123" {
		t.Fatal("cursor round trip", err)
	}
	for _, bad := range []string{"!invalid", strings.Repeat("a", 181), continuation(at, "../bad")} {
		if _, _, err = cursor(bad); err == nil {
			t.Fatal("unsafe cursor")
		}
	}
	if errorCode("secret server exception") != "internal_error" {
		t.Fatal("arbitrary error text leaked")
	}
	if supportedKind("payments.refund") || jobState("injected") {
		t.Fatal("undeclared task capability accepted")
	}
}
