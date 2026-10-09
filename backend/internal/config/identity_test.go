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

func TestIdentitySeparatePortalOrigins(t *testing.T) {
	baseline := map[string]string{"AUTH_KEY": hex.EncodeToString([]byte("synthetic-authentication-key-123")), "PROXY_SHARED_KEY": hex.EncodeToString([]byte("synthetic-proxy-security-key-123")), "PUBLIC_ORIGIN": "https://playora.example", "ADMIN_PUBLIC_ORIGIN": "https://admin.playora.example", "BOOSTER_PUBLIC_ORIGIN": "https://booster.playora.example", "TERMS_VERSION": "approved-v1", "SMTP_HOST": "smtp.example.test", "SMTP_PORT": "587", "SMTP_FROM": "security@playora.example", "SMTP_TLS": "required"}
	cfg, err := Identity(func(key string) string { return baseline[key] }, "production")
	if err != nil || cfg.AdminPublicOrigin != baseline["ADMIN_PUBLIC_ORIGIN"] || cfg.BoosterPublicOrigin != baseline["BOOSTER_PUBLIC_ORIGIN"] || cfg.TermsURL != baseline["PUBLIC_ORIGIN"]+"/terms" {
		t.Fatal("separate portal configuration rejected", err)
	}
	for _, scenario := range []struct{ key, value string }{
		{"ADMIN_PUBLIC_ORIGIN", ""}, {"BOOSTER_PUBLIC_ORIGIN", ""},
		{"ADMIN_PUBLIC_ORIGIN", baseline["PUBLIC_ORIGIN"]}, {"ADMIN_PUBLIC_ORIGIN", baseline["BOOSTER_PUBLIC_ORIGIN"]},
		{"ADMIN_PUBLIC_ORIGIN", baseline["PUBLIC_ORIGIN"] + ":8443"}, {"BOOSTER_PUBLIC_ORIGIN", baseline["ADMIN_PUBLIC_ORIGIN"] + ":443"},
		{"ADMIN_PUBLIC_ORIGIN", "http://admin.playora.example"}, {"ADMIN_PUBLIC_ORIGIN", "https://admin.playora.example/admin"},
		{"ADMIN_PUBLIC_ORIGIN", "https://admin.playora.example?"}, {"ADMIN_PUBLIC_ORIGIN", "https://admin.playora.example#"},
		{"ADMIN_PUBLIC_ORIGIN", "https://admin.playora.example:70000"}, {"ADMIN_PUBLIC_ORIGIN", "https://admin.playora.example:"},
		{"BOOSTER_PUBLIC_ORIGIN", "https://user:password@booster.playora.example"}, {"ALLOWED_ORIGINS", "https://extra.example"},
	} {
		t.Run(scenario.key+"="+scenario.value, func(t *testing.T) {
			_, scenarioErr := Identity(func(key string) string {
				if key == scenario.key {
					return scenario.value
				}
				return baseline[key]
			}, "production")
			if scenarioErr == nil {
				t.Fatal("unsafe portal configuration accepted")
			}
		})
	}
	baseline["ADMIN_PUBLIC_ORIGIN"] = "https://ADMIN.PLAYORA.EXAMPLE/"
	cfg, err = Identity(func(key string) string { return baseline[key] }, "production")
	if err != nil || cfg.AdminPublicOrigin != "https://admin.playora.example" {
		t.Fatal("origin did not normalize", err)
	}
	baseline["PUBLIC_ORIGIN"], baseline["ADMIN_PUBLIC_ORIGIN"], baseline["BOOSTER_PUBLIC_ORIGIN"] = "http://127.0.0.1:4173", "http://127.0.0.1:4174", "http://127.0.0.1:4175"
	if _, err = Identity(func(key string) string { return baseline[key] }, "test"); err != nil {
		t.Fatal("isolated local portal fixture rejected", err)
	}
	baseline["ALLOWED_ORIGINS"] = "http://127.0.0.1:5173"
	if _, err = Identity(func(key string) string { return baseline[key] }, "test"); err == nil {
		t.Fatal("extra origins widened split portal fixture")
	}
}
