package cli

import (
	"os"
	"path/filepath"
	"testing"
)

func TestRecoveryRequiresExplicitQuarantine(t *testing.T) {
	t.Parallel()
	root := t.TempDir()
	marker := filepath.Join(root, "quarantined")
	if err := os.WriteFile(marker, []byte("isolated"), 0o600); err != nil {
		t.Fatal(err)
	}
	link := filepath.Join(root, "link")
	if err := os.Symlink(marker, link); err != nil {
		t.Fatal(err)
	}
	for _, input := range []struct {
		path, ack string
		valid     bool
	}{
		{marker, "isolated-no-egress-no-workers", true},
		{marker, "", false}, {"relative", "isolated-no-egress-no-workers", false},
		{link, "isolated-no-egress-no-workers", false}, {root, "isolated-no-egress-no-workers", false},
	} {
		getenv := func(key string) string {
			if key == "RECOVERY_QUARANTINE_MARKER" {
				return input.path
			}
			if key == "RECOVERY_ISOLATED_ACK" {
				return input.ack
			}
			return ""
		}
		if err := recoveryGuard(getenv); (err == nil) != input.valid {
			t.Fatal("unexpected quarantine decision", err)
		}
	}
}
