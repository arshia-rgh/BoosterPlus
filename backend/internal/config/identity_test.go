package config

import (
	"crypto/rand"
	"encoding/hex"
	"testing"
)

func TestIdentityProductionConfigurationFailsClosed(t *testing.T) {
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		t.Fatal(err)
	}
	proxy := make([]byte, 32)
	if _, err := rand.Read(proxy); err != nil {
		t.Fatal(err)
	}
	baseline := map[string]string{"AUTH_KEY": hex.EncodeToString(key), "PROXY_SHARED_KEY": hex.EncodeToString(proxy), "PUBLIC_ORIGIN": "https://booster.example", "TERMS_VERSION": "approved-v1", "SMTP_HOST": "smtp.example.test", "SMTP_PORT": "587", "SMTP_FROM": "security@booster.example", "SMTP_TLS": "required"}
	cfg, err := Identity(func(key string) string { return baseline[key] }, "production")
	if err != nil || !cfg.SecureCookies || cfg.SMTPPlaintext {
		t.Fatal("production config rejected", err)
	}
	for _, scenario := range []struct{ key, value string }{{"AUTH_KEY", "short"}, {"PROXY_SHARED_KEY", baseline["AUTH_KEY"]}, {"PUBLIC_ORIGIN", "http://booster.example"}, {"PUBLIC_ORIGIN", "https://booster.example/path"}, {"PUBLIC_ORIGIN", "https://user:password@booster.example"}, {"ALLOWED_ORIGINS", "https://evil.example"}, {"TERMS_VERSION", "development-preview-v1"}, {"TERMS_VERSION", ""}, {"GOOGLE_CLIENT_ID", "missing-secret"}, {"SMTP_TLS", "disabled"}, {"SMTP_TLS", "optional"}, {"SMTP_USERNAME", "missing-password"}, {"SMTP_FROM", "Name <sender@example.test>"}, {"SMTP_PORT", "70000"}} {
		t.Run(scenario.key+"_invalid", func(t *testing.T) {
			_, configErr := Identity(func(key string) string {
				if key == scenario.key {
					return scenario.value
				}
				return baseline[key]
			}, "production")
			if configErr == nil {
				t.Fatal("unsafe configuration accepted")
			}
		})
	}
}
