package suppliers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"testing"
)

func sign(raw, token string) string {
	mac := hmac.New(sha256.New, []byte(token))
	_, _ = mac.Write([]byte(raw))
	return hex.EncodeToString(mac.Sum(nil))
}
func TestWebhookUsesRawBytesAndExactEnvironmentToken(t *testing.T) {
	client, err := New(Config{Connection: NexusSandbox, Token: testToken})
	if err != nil {
		t.Fatal(err)
	}
	raw := `{"type":"statusChange", "order":` + nexusOrder("completed") + `}`
	signal, err := client.VerifyWebhook([]byte(raw), []string{sign(raw, testToken)})
	if err != nil || !signal.Recognized || signal.Connection != NexusSandbox || signal.OrderID != "42" || signal.Reference != testReference || len(signal.Digest) != 64 {
		t.Fatal("valid callback rejected")
	}
	plainDigest := sha256.Sum256([]byte(raw))
	if signal.Digest != sign(raw, testToken) || signal.Digest == hex.EncodeToString(plainDigest[:]) {
		t.Fatal("receipt fingerprint exposes an unkeyed credential-body hash")
	}
	upper, e := client.VerifyWebhook([]byte(raw), []string{strings.ToUpper(sign(raw, testToken))})
	if e != nil || upper.Digest != signal.Digest {
		t.Fatal("signature casing bypassed replay identity", e)
	}
	for _, signatures := range [][]string{nil, {""}, {sign(raw, testToken), sign(raw, testToken)}, {sign(raw, "another-test-token")}, {sign(strings.ReplaceAll(raw, ", ", ","), testToken)}} {
		if _, err = client.VerifyWebhook([]byte(raw), signatures); !errors.Is(err, ErrSignature) {
			t.Fatal("unverified callback accepted")
		}
	}
	duplicate := strings.Replace(raw, `"id":42`, `"id":42,"id":43`, 1)
	if _, err = client.VerifyWebhook([]byte(duplicate), []string{sign(duplicate, testToken)}); !errors.Is(err, ErrEvidence) {
		t.Fatal("ambiguous signed callback accepted")
	}
}
func TestWebhookUnknownTypesAndInteractiveRequests(t *testing.T) {
	client, err := New(Config{Connection: VendoriaTest, Token: testToken})
	if err != nil {
		t.Fatal(err)
	}
	unknown := `{"type":"futureEvent"}`
	signal, err := client.VerifyWebhook([]byte(unknown), []string{sign(unknown, testToken)})
	if err != nil || signal.Recognized {
		t.Fatal("unknown authenticated event mishandled")
	}
	raw := `{"type":"googlePrompt","order":{"id":1,"number":42,"shopOrderId":"` + testReference + `"}}`
	signal, err = client.VerifyWebhook([]byte(raw), []string{sign(raw, testToken)})
	if err != nil || signal.Number == nil || *signal.Number != 42 {
		t.Fatal("lost prompt")
	}
	raw = strings.Replace(raw, `"number":42`, `"number":42.5`, 1)
	if _, err = client.VerifyWebhook([]byte(raw), []string{sign(raw, testToken)}); err == nil {
		t.Fatal("invalid prompt accepted")
	}
}

func TestWebhookRotationRequiresCurrentFullToken(t *testing.T) {
	const rotated = "10:synthetic-rotated-fixture-token"
	const otherEnvironment = "10:synthetic-other-environment-token"
	client, err := New(Config{Connection: VendoriaTest, Token: rotated})
	if err != nil {
		t.Fatal(err)
	}
	raw := `{"type":"statusChange","order":{"id":42,"shopOrderId":"` + testReference + `"}}`
	for _, token := range []string{testToken, otherEnvironment, strings.TrimPrefix(rotated, "10:")} {
		if _, err = client.VerifyWebhook([]byte(raw), []string{sign(raw, token)}); !errors.Is(err, ErrSignature) {
			t.Fatal("accepted retired, foreign or truncated signing token", err)
		}
	}
	if signal, e := client.VerifyWebhook([]byte(raw), []string{sign(raw, rotated)}); e != nil || signal.OrderID != "42" || client.MerchantID() != "10" {
		t.Fatal("same-shop rotation lost current signature or merchant binding", e)
	}
}
func TestWebhookVerificationLinksCannotEscapeProvider(t *testing.T) {
	client, err := New(Config{Connection: NexusSandbox, Token: testToken})
	if err != nil {
		t.Fatal(err)
	}
	for _, link := range []string{"javascript:alert(1)", "https://attacker.example/check", "https://nexus.amadeustech.dev/check", "https://nexus-sandbox.amadeustech.dev@attacker.example/check", "http://nexus-sandbox.amadeustech.dev/check"} {
		raw := `{"type":"robloxLogpassVerification","order":{"id":1},"verification":{"url":"` + link + `"}}`
		if _, err = client.VerifyWebhook([]byte(raw), []string{sign(raw, testToken)}); err == nil {
			t.Fatal("unsafe verification URL accepted")
		}
	}
}
