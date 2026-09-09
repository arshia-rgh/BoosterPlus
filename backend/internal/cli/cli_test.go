package cli_test

import (
	"bytes"
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/cli"
)

func TestOfflineCommands(t *testing.T) {
	t.Parallel()
	for _, args := range [][]string{{"version"}, {"db", "migrate", "validate"}} {
		t.Run(strings.Join(args, " "), func(t *testing.T) {
			t.Parallel()
			var output bytes.Buffer
			command := cli.New(&output, func(string) string { return "" })
			command.SetArgs(args)
			if err := command.ExecuteContext(t.Context()); err != nil {
				t.Fatal(err)
			}
			if output.Len() == 0 {
				t.Fatal("missing command output")
			}
		})
	}
}

func TestDestructiveAndInvalidCommandsFailBeforeDatabaseAccess(t *testing.T) {
	t.Parallel()
	for _, args := range [][]string{{"db", "migrate", "down", "--steps", "1"}, {"db", "migrate", "create", "../../unsafe"}, {"db", "migrate", "up", "unexpected"}} {
		var output bytes.Buffer
		command := cli.New(&output, func(string) string { return "production" })
		command.SetArgs(args)
		if err := command.ExecuteContext(t.Context()); err == nil {
			t.Fatalf("unsafe args accepted: %v", args)
		}
	}
}
