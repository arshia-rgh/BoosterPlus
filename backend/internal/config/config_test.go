package config_test

import (
	"crypto/rand"
	"encoding/hex"
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/config"
)

func TestConfiguration(t *testing.T) {
	for _, scenario := range []struct {
		environment, address, dsn string
		valid                     bool
	}{{"test", "", "root@tcp(localhost:4000)/test", true}, {"production", "127.0.0.1:8080", "app@tcp(db:4000)/app?tls=true", true}, {"", "", "", false}, {"test", "invalid", "secret", false}, {"production", "localhost:8080", "", false}} {
		key := make([]byte, 32)
		if _, err := rand.Read(key); err != nil {
			t.Fatal(err)
		}
		proxy := make([]byte, 32)
		if _, err := rand.Read(proxy); err != nil {
			t.Fatal(err)
		}
		values := map[string]string{"AUTH_KEY": hex.EncodeToString(key), "PROXY_SHARED_KEY": hex.EncodeToString(proxy), "PUBLIC_ORIGIN": "https://boosterplus.example.test", "TERMS_VERSION": "test-v1", "SMTP_HOST": "smtp.example.test", "SMTP_PORT": "587", "SMTP_FROM": "no-reply@example.test", "SMTP_TLS": "required", "APP_ENV": scenario.environment, "HTTP_ADDR": scenario.address, "DATABASE_DSN": scenario.dsn}
		values["MEDIA_S3_ENDPOINT"] = "https://objects.example.test"
		values["MEDIA_S3_REGION"] = "us-east-1"
		values["MEDIA_S3_BUCKET"] = "private-test"
		values["MEDIA_S3_ACCESS_KEY"] = "test-access"
		values["MEDIA_S3_SECRET_KEY"] = hex.EncodeToString(key)
		values["MEDIA_SCANNER_NETWORK"] = "unix"
		values["MEDIA_SCANNER_ADDRESS"] = "/run/clamav/clamd.sock"
		cfg, err := config.Load(func(key string) string { return values[key] })
		if (err == nil) != scenario.valid {
			t.Errorf("unexpected validation %v", err)
		}
		if err != nil && strings.Contains(err.Error(), "secret") {
			t.Fatal("configuration leaked a secret")
		}
		if err == nil && cfg.HTTPAddress == "" {
			t.Fatal("missing default listener")
		}
	}
}
