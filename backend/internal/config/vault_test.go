package config_test

import (
	"crypto/rand"
	"encoding/hex"
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/config"
)

func TestCredentialKeyringConfiguration(t *testing.T) {
	secret := func() string {
		key := make([]byte, 32)
		if _, err := rand.Read(key); err != nil {
			t.Fatal(err)
		}
		return hex.EncodeToString(key)
	}
	auth, proxy, first, second := secret(), secret(), secret(), secret()
	for _, scenario := range []struct {
		name, active, keys string
		valid              bool
	}{
		{"single", "v1", "v1:" + first, true},
		{"rolling rotation", "v2", "v1:" + first + ",v2:" + second, true},
		{"missing active", "v3", "v1:" + first, false},
		{"no versions", "v1", "", false},
		{"duplicate version", "v1", "v1:" + first + ",v1:" + second, false},
		{"duplicate material", "v2", "v1:" + first + ",v2:" + first, false},
		{"auth reuse", "v1", "v1:" + auth, false},
		{"proxy reuse", "v1", "v1:" + proxy, false},
		{"bad key ID", "bad/version", "bad/version:" + first, false},
		{"bad encoding", "v1", "v1:zz", false},
		{"wrong key length", "v1", "v1:" + first[:62], false},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			values := map[string]string{"AUTH_KEY": auth, "PROXY_SHARED_KEY": proxy, "VAULT_ACTIVE_KEY": scenario.active, "VAULT_KEYS": scenario.keys}
			_, err := config.CredentialKeys(func(k string) string { return values[k] })
			if (err == nil) != scenario.valid {
				t.Fatal("unexpected key configuration", err)
			}
			if err != nil && (strings.Contains(err.Error(), first) || strings.Contains(err.Error(), auth)) {
				t.Fatal("key material leaked")
			}
		})
	}
}
