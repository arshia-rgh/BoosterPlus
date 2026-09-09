// Package config validates runtime configuration without logging secrets.
package config

import (
	"errors"
	"net"
	"strconv"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Config contains process configuration. Never log the whole value.
type Config struct {
	Environment string
	HTTPAddress string
	DatabaseDSN string
	Identity    identity.Config
}

// Load rejects unknown environments and malformed listener addresses.
func Load(getenv func(string) string) (Config, error) {
	cfg := Config{Environment: getenv("APP_ENV"), HTTPAddress: getenv("HTTP_ADDR"), DatabaseDSN: getenv("DATABASE_DSN")}
	if cfg.Environment != "development" && cfg.Environment != "test" && cfg.Environment != "staging" && cfg.Environment != "production" {
		return Config{}, errors.New("APP_ENV must be development, test, staging, or production")
	}
	if cfg.HTTPAddress == "" {
		cfg.HTTPAddress = "127.0.0.1:8080"
	}
	_, port, addressErr := net.SplitHostPort(cfg.HTTPAddress)
	number, portErr := strconv.Atoi(port)
	if addressErr != nil || portErr != nil || number < 1 || number > 65535 {
		return Config{}, errors.New("HTTP_ADDR must be a host:port address")
	}
	if err := database.Validate(cfg.DatabaseDSN, cfg.Environment); err != nil {
		return Config{}, err
	}
	auth, authErr := Identity(getenv, cfg.Environment)
	if authErr != nil {
		return Config{}, authErr
	}
	cfg.Identity = auth
	return cfg, nil
}
