package config_test

import (
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/config"
)

func TestPrivacyRequiresIndependentQualifiedRecovery(t *testing.T) {
	t.Parallel()
	values := map[string]string{
		"PRIVACY_RECOVERY_ENABLED": "true", "PRIVACY_RECOVERY_OFFHOST_CONFIRMED": "true", "PRIVACY_RECOVERY_ENDPOINT": "https://backup.operator.test",
		"PRIVACY_RECOVERY_REGION": "us-east-1", "PRIVACY_RECOVERY_BUCKET": "private-journal", "PRIVACY_RECOVERY_ACCESS_KEY": "fixture", "PRIVACY_RECOVERY_SECRET_KEY": strings.Repeat("s", 32),
		"PRIVACY_RECOVERY_KEY": strings.Repeat("12", 32), "PRIVACY_RECOVERY_PROJECT": "boosterplus-fixture", "MEDIA_S3_ENDPOINT": "https://object-gateway:8443", "AUTH_KEY": strings.Repeat("34", 32),
	}
	get := func(key string) string { return values[key] }
	if journal, _, err := config.PrivacyRecovery(get); err != nil || journal == nil {
		t.Fatal("valid recovery rejected", err)
	}
	for key, value := range map[string]string{"PRIVACY_RECOVERY_ENABLED": "yes", "PRIVACY_RECOVERY_OFFHOST_CONFIRMED": "false", "PRIVACY_RECOVERY_ENDPOINT": "https://object-gateway:8443", "PRIVACY_RECOVERY_KEY": values["AUTH_KEY"], "PRIVACY_RECOVERY_PROJECT": "../../other"} {
		saved := values[key]
		values[key] = value
		if _, _, err := config.PrivacyRecovery(get); err == nil {
			t.Fatal("invalid recovery accepted", key)
		}
		values[key] = saved
	}
	values["PRIVACY_RECOVERY_ENABLED"] = "false"
	if journal, _, err := config.PrivacyRecovery(get); err != nil || journal != nil {
		t.Fatal("disabled recovery constructed a runtime journal", err)
	}
}
