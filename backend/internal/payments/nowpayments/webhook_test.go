package nowpayments

import (
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"testing"
)

func signSynthetic(t *testing.T, c *Client, body string) string {
	t.Helper()
	value, err := object([]byte(body))
	if err != nil {
		t.Fatal(err)
	}
	canonical, err := canonicalJSON(nil, value)
	if err != nil {
		t.Fatal(err)
	}
	h := hmac.New(sha512.New, []byte(c.ipnSecret))
	if _, err = h.Write(canonical); err != nil {
		t.Fatal(err)
	}
	return hex.EncodeToString(h.Sum(nil))
}
func TestWebhookMatchesIndependentJavaScriptVectors(t *testing.T) {
	data, err := os.ReadFile("testdata/ipn-vectors.json")
	if err != nil {
		t.Fatal(err)
	}
	var vectors []struct{ Body, Canonical, Signature string }
	if err = json.Unmarshal(data, &vectors); err != nil {
		t.Fatal(err)
	}
	if len(vectors) != 4 {
		t.Fatal("missing reference vectors")
	}
	c := testClient(t)
	for i, v := range vectors {
		object, err := object([]byte(v.Body))
		if err != nil {
			t.Fatal(i, err)
		}
		canonical, err := canonicalJSON(nil, object)
		if err != nil || string(canonical) != v.Canonical {
			t.Fatal("JavaScript signature canonicalization mismatch", i, err)
		}
		notice, err := c.VerifyWebhook([]byte(v.Body), v.Signature)
		if err != nil || notice.PaymentID == "" || len(notice.Digest) != 64 {
			t.Fatal("reference verification", i, err)
		}
		// A notification carries no amount/state authority, only the ID to reconcile.
		raw, err := json.Marshal(notice)
		if err != nil || strings.Contains(string(raw), "amount") || strings.Contains(string(raw), "finished") {
			t.Fatal("unverified finance signal exposed", err)
		}
		changed := strings.Replace(v.Body, "123", "923", 1)
		if _, err = c.VerifyWebhook([]byte(changed), v.Signature); !errors.Is(err, ErrSignature) {
			t.Fatal("tampered callback accepted")
		}
	}
}
func TestWebhookRejectsMalformedDuplicateOrUnboundedInput(t *testing.T) {
	c := testClient(t)
	valid := `{"payment_id":123,"state":"waiting"}`
	signature := signSynthetic(t, c, valid)
	for _, body := range []string{`{"payment_id":123,"payment_id":123,"state":"waiting"}`, valid + `{}`, `{"payment_id":123,"state":"waiting","extra":{"key":1,"key":1}}`, `null`, `[]`, strings.Repeat("[", 18) + valid + strings.Repeat("]", 18), strings.Repeat("x", maxBody+1), "{\xff}", `{"payment_id":1e999}`, `{"payment_id":9007199254740992}`} {
		if _, err := c.VerifyWebhook([]byte(body), signature); !errors.Is(err, ErrSignature) {
			t.Fatal("ambiguous callback accepted")
		}
	}
	for _, bad := range []string{"", signature[:127], signature + "0", strings.Repeat("z", 128), strings.ToUpper(signature) + "\n"} {
		if _, err := c.VerifyWebhook([]byte(valid), bad); !errors.Is(err, ErrSignature) {
			t.Fatal("bad signature accepted")
		}
	}
	for _, id := range []string{`"../auth"`, `0`, `-1`, `1.0`, `1e3`, `9007199254740992`, `null`, `true`, `"0123"`} {
		body := `{"payment_id":` + id + `}`
		if _, err := c.VerifyWebhook([]byte(body), signSynthetic(t, c, body)); !errors.Is(err, ErrSignature) {
			t.Fatal("unsafe payment reference accepted", id)
		}
	}
	other := testClient(t)
	other.ipnSecret = strings.Repeat("different-key-", 3)
	if _, err := other.VerifyWebhook([]byte(valid), signature); !errors.Is(err, ErrSignature) {
		t.Fatal("wrong secret accepted")
	}
}
func TestDuplicateAndReorderedWebhookSignalsHaveStableDigest(t *testing.T) {
	c := testClient(t)
	a := `{"payment_id":123,"status":"waiting"}`
	b := "{\n\"status\": \"waiting\", \"payment_id\":123\n}"
	first, err := c.VerifyWebhook([]byte(a), signSynthetic(t, c, a))
	if err != nil {
		t.Fatal(err)
	}
	second, err := c.VerifyWebhook([]byte(b), signSynthetic(t, c, b))
	if err != nil || first != second {
		t.Fatal("unstable deduplication reference", err)
	}
	changed := `{"payment_id":123,"status":"finished"}`
	third, err := c.VerifyWebhook([]byte(changed), signSynthetic(t, c, changed))
	if err != nil || first.PaymentID != third.PaymentID || first.Digest == third.Digest {
		t.Fatal("distinct observation lost", err)
	}
}

func TestParserRejectsAmbiguousObjectKeysBeforeAuthentication(t *testing.T) {
	for _, body := range []string{
		`{"payment_id":123,"payment_\u0069d":123}`,
		`{"payment_id":123,"fee":{"x":1,"x":1}}`,
		`{"payment_id":123,"__proto__":{"x":1}}`,
		`{"payment_id":123,"constructor":"text"}`,
		`{"payment_id":123,"fee":{"prototype":null}}`,
	} {
		if _, err := object([]byte(body)); !errors.Is(err, ErrEvidence) {
			t.Fatal("ambiguous object accepted")
		}
	}
}
