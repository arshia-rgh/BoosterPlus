package config

import (
	"strings"
	"testing"
)

func TestCryptoRequiresExplicitCompleteConfiguration(t *testing.T) {
	values := map[string]string{}
	get := func(k string) string { return values[k] }
	cfg, err := crypto(get, "https://booster.example.test")
	if err != nil || cfg.Enabled || cfg.Provider != nil {
		t.Fatal("payments must default disabled", err)
	}
	values["PAYMENTS_ENABLED"] = "true"
	if _, err = crypto(get, "https://booster.example.test"); err == nil {
		t.Fatal("enabled without credentials")
	}
	values = map[string]string{"NOWPAYMENTS_MODE": "sandbox", "NOWPAYMENTS_API_KEY": strings.Repeat("synthetic-api", 3), "NOWPAYMENTS_IPN_SECRET": strings.Repeat("synthetic-ipn", 3), "NOWPAYMENTS_ACCOUNT_ID": "da3ff1a3-de08-4938-83d1-d501297c3977", "NOWPAYMENTS_EMAIL": "merchant@example.test", "NOWPAYMENTS_PASSWORD": "synthetic-merchant-password"}
	cfg, err = crypto(get, "https://booster.example.test")
	if err != nil || cfg.Enabled || cfg.Provider == nil || cfg.Account != "sandbox:da3ff1a3-de08-4938-83d1-d501297c3977" {
		t.Fatal("configured reconciliation disabled with checkout", err)
	}
	for key, value := range values {
		delete(values, key)
		if _, err = crypto(get, "https://booster.example.test"); err == nil {
			t.Error("partial config accepted", key)
		}
		values[key] = value
	}
	if _, err = crypto(get, "http://127.0.0.1:5173"); err != nil {
		t.Fatal("disabled checkout must permit read-only local reconciliation", err)
	}
	values["PAYMENTS_ENABLED"] = "true"
	if _, err = crypto(get, "http://127.0.0.1:5173"); err == nil {
		t.Fatal("enabled checkout accepted a non-HTTPS callback origin")
	}
	cfg, err = crypto(get, "https://booster.example.test")
	if err != nil || !cfg.Enabled {
		t.Fatal(err)
	}
	values["PAYMENTS_ENABLED"] = "yes"
	if _, err = crypto(get, "https://booster.example.test"); err == nil {
		t.Fatal("unrecognized activation value")
	}
}
