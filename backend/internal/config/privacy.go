package config

import (
	"encoding/hex"
	"errors"
	"net/url"
	"regexp"
	"strings"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/privacyjournal"
)

// PrivacyRecovery is optional: absence disables runtime erasure, not exports or holds.
func PrivacyRecovery(getenv func(string) string) (*privacyjournal.Journal, *privacyjournal.S3, error) {
	if getenv("PRIVACY_RECOVERY_ENABLED") == "" || getenv("PRIVACY_RECOVERY_ENABLED") == "false" {
		return nil, nil, nil
	}
	if getenv("PRIVACY_RECOVERY_ENABLED") != "true" || getenv("PRIVACY_RECOVERY_OFFHOST_CONFIRMED") != "true" {
		return nil, nil, errors.New("privacy recovery needs explicit off-host qualification")
	}
	endpoint, err := url.Parse(getenv("PRIVACY_RECOVERY_ENDPOINT"))
	media, mediaErr := url.Parse(getenv("MEDIA_S3_ENDPOINT"))
	if err != nil || mediaErr != nil || endpoint.Scheme != "https" || endpoint.Hostname() == "" || endpoint.Hostname() == media.Hostname() || endpoint.User != nil || endpoint.RawQuery != "" || endpoint.Fragment != "" || (endpoint.Path != "" && endpoint.Path != "/") {
		return nil, nil, errors.New("privacy recovery requires an independent HTTPS endpoint")
	}
	bucket := getenv("PRIVACY_RECOVERY_BUCKET")
	if !bucketName.MatchString(bucket) || getenv("PRIVACY_RECOVERY_REGION") == "" || len(getenv("PRIVACY_RECOVERY_ACCESS_KEY")) < 3 || len(getenv("PRIVACY_RECOVERY_SECRET_KEY")) < 20 || !regexp.MustCompile(`^boosterplus-[a-z0-9-]{1,48}$`).MatchString(getenv("PRIVACY_RECOVERY_PROJECT")) {
		return nil, nil, errors.New("privacy recovery configuration incomplete")
	}
	key, err := hex.DecodeString(getenv("PRIVACY_RECOVERY_KEY"))
	if err != nil || len(key) != 32 || strings.EqualFold(getenv("PRIVACY_RECOVERY_KEY"), getenv("AUTH_KEY")) {
		return nil, nil, errors.New("privacy recovery requires a separate escrowed encryption key")
	}
	objects := privacyjournal.NewS3(endpoint.String(), getenv("PRIVACY_RECOVERY_REGION"), bucket, getenv("PRIVACY_RECOVERY_ACCESS_KEY"), getenv("PRIVACY_RECOVERY_SECRET_KEY"))
	journal, err := privacyjournal.New(objects, getenv("PRIVACY_RECOVERY_KEY"), getenv("PRIVACY_RECOVERY_PROJECT"))
	return journal, objects, err
}
