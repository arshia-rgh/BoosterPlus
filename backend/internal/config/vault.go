package config

import (
	"bytes"
	"encoding/hex"
	"errors"
	"strings"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

// CredentialKeys validates external versioned master keys without exposing their
// values in errors. Vault keys must differ from identity and proxy secrets.
func CredentialKeys(getenv func(string) string) (*vault.Keyring, error) {
	invalid := errors.New("credential keyring configuration invalid")
	active := getenv("VAULT_ACTIVE_KEY")
	raw := getenv("VAULT_KEYS")
	if len(raw) > 512 || raw == "" {
		return nil, invalid
	}
	auth, authErr := hex.DecodeString(getenv("AUTH_KEY"))
	proxy, proxyErr := hex.DecodeString(getenv("PROXY_SHARED_KEY"))
	if authErr != nil || proxyErr != nil || len(auth) != 32 || len(proxy) != 32 {
		return nil, invalid
	}
	keys := map[string][]byte{}
	defer func() {
		for _, key := range keys {
			clear(key)
		}
	}()
	for _, entry := range strings.Split(raw, ",") {
		id, value, ok := strings.Cut(entry, ":")
		if !ok || keys[id] != nil {
			return nil, invalid
		}
		key, err := hex.DecodeString(value)
		if err != nil || len(key) != 32 || bytes.Equal(key, auth) || bytes.Equal(key, proxy) {
			return nil, invalid
		}
		keys[id] = key
	}
	ring, err := vault.NewKeyring(active, keys)
	if err != nil {
		return nil, invalid
	}
	return ring, nil
}
