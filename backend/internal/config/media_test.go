package config_test

import (
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/config"
)

func TestPrivateMediaConfiguration(t *testing.T) {
	base := map[string]string{"MEDIA_S3_ENDPOINT": "http://127.0.0.1:8333", "MEDIA_S3_REGION": "us-east-1", "MEDIA_S3_BUCKET": "boosterplus-private", "MEDIA_S3_ACCESS_KEY": "local-test", "MEDIA_S3_SECRET_KEY": strings.Repeat("synthetic", 4), "MEDIA_SCANNER_NETWORK": "tcp", "MEDIA_SCANNER_ADDRESS": "127.0.0.1:13310"}
	for _, scenario := range []struct {
		name, key, value, environment string
		valid                         bool
	}{
		{name: "local", environment: "test", valid: true},
		{name: "plaintext remote", key: "MEDIA_S3_ENDPOINT", value: "http://objects.example.test", environment: "test"},
		{name: "URL credentials", key: "MEDIA_S3_ENDPOINT", value: "https://user@objects.example.test", environment: "test"},
		{name: "URL path", key: "MEDIA_S3_ENDPOINT", value: "https://objects.example.test/bucket", environment: "test"},
		{name: "bucket path", key: "MEDIA_S3_BUCKET", value: "../bucket", environment: "test"},
		{name: "no secret", key: "MEDIA_S3_SECRET_KEY", environment: "test"},
		{name: "remote scanner", key: "MEDIA_SCANNER_ADDRESS", value: "scan.example.test:3310", environment: "test"},
		{name: "public deployment plaintext", environment: "production"},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			get := func(key string) string {
				if key == scenario.key {
					return scenario.value
				}
				return base[key]
			}
			_, err := config.PrivateMedia(get, scenario.environment)
			if (err == nil) != scenario.valid {
				t.Fatal("unexpected media configuration result", err)
			}
			if err != nil && strings.Contains(err.Error(), "synthetic") {
				t.Fatal("secret leaked")
			}
		})
	}
	base["MEDIA_S3_ENDPOINT"] = "https://objects.example.test"
	if _, err := config.PrivateMedia(func(k string) string { return base[k] }, "production"); err == nil {
		t.Fatal("network scanner accepted in production")
	}
	base["MEDIA_SCANNER_NETWORK"] = "unix"
	base["MEDIA_SCANNER_ADDRESS"] = "/run/clamav/clamd.sock"
	if _, err := config.PrivateMedia(func(k string) string { return base[k] }, "production"); err != nil {
		t.Fatal(err)
	}
}
