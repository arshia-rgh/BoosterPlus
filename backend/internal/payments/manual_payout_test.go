package payments

import (
	"strings"
	"testing"
)

func TestManualTransactionHashNormalization(t *testing.T) {
	t.Parallel()
	for _, test := range []struct {
		network, input, want string
		valid                bool
	}{
		{"bsc", "0x" + strings.Repeat("AB", 32), "0x" + strings.Repeat("ab", 32), true},
		{"eth", "0x" + strings.Repeat("12", 32), "0x" + strings.Repeat("12", 32), true},
		{"trx", strings.Repeat("CD", 32), strings.Repeat("cd", 32), true},
		{"sol", strings.Repeat("Ab", 43), strings.Repeat("Ab", 43), true},
		{"bsc", "https://explorer.test/tx/0x" + strings.Repeat("ab", 32), "", false},
		{"bsc", "0x" + strings.Repeat("gg", 32), "", false},
		{"bsc", strings.Repeat("ab", 32), "", false},
		{"trx", strings.Repeat("ab", 31), "", false},
		{"sol", strings.Repeat("0", 88), "", false},
		{"other", strings.Repeat("ab", 32), "", false},
	} {
		got, valid := manualHash(test.network, test.input)
		if valid != test.valid || (valid && got != test.want) {
			t.Errorf("%s: validity %v, normalization %q", test.network, valid, got)
		}
	}
}
