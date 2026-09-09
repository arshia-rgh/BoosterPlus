package config_test

import (
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/config"
)

func TestConfiguration(t *testing.T) {
	for _, scenario := range []struct {
		environment, address, dsn string
		valid                     bool
	}{{"test", "", "root@tcp(localhost:4000)/test", true}, {"production", "127.0.0.1:8080", "app@tcp(db:4000)/app?tls=true", true}, {"", "", "", false}, {"test", "invalid", "secret", false}, {"production", "localhost:8080", "", false}} {
		values := map[string]string{"APP_ENV": scenario.environment, "HTTP_ADDR": scenario.address, "DATABASE_DSN": scenario.dsn}
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
