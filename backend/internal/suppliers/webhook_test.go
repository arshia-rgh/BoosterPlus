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
