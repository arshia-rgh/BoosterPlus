package availability

import (
	"strings"
	"testing"

	"github.com/google/uuid"
)

func TestInputBoundsAndFixedOrigin(t *testing.T) {
	for _, value := range []string{"", "../game", "https://evil.test", "GAME", strings.Repeat("a", 81)} {
		if validKey(value, 80) {
			t.Fatal("invalid catalog key")
		}
	}
	if !validKey("mobile-legends", 80) || !validKey("variant_1", 48) {
		t.Fatal("valid key rejected")
	}
	id := uuid.NewString()
	if !validID(id) || validID(strings.ToUpper(id)) || validID("invalid") {
		t.Fatal("noncanonical ID")
	}
	for _, origin := range []string{"", "https://user:pass@example.test", "javascript:alert(1)", "https://example.test/path", "https://example.test/?secret=x", "https://example.test/#fragment"} {
		if _, e := New(nil, nil, origin, nil); e == nil {
			t.Fatal("unsafe origin")
		}
	}
	if _, e := New(nil, nil, "https://example.test/", nil); e != nil {
		t.Fatal(e)
	}
}
