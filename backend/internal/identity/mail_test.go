package identity

import (
	"bytes"
	"errors"
	"io"
	"mime"
	"mime/multipart"
	"net/mail"
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/emailtemplate"
)

func TestSMTPCompositionProducesPlainAndHTMLEquivalents(t *testing.T) {
	t.Parallel()
	adapter := &SMTP{from: "notifications@example.test"}
	composed, err := adapter.compose(Message{To: "customer@example.test", Subject: "Payment confirmed | PLAYORA", Body: "Verified payment.\nhttps://playora.example.test/orders/fixture", View: emailtemplate.View{Heading: "Payment confirmed", ActionLabel: "View order", ActionURL: "https://playora.example.test/orders/fixture"}})
	if err != nil {
		t.Fatal(err)
	}
	var raw bytes.Buffer
	if _, err = composed.WriteTo(&raw); err != nil {
		t.Fatal(err)
	}
	parsed, err := mail.ReadMessage(&raw)
	if err != nil {
		t.Fatal(err)
	}
	mediaType, params, err := mime.ParseMediaType(parsed.Header.Get("Content-Type"))
	if err != nil || mediaType != "multipart/alternative" {
		t.Fatal("multipart fallback missing", err)
	}
	reader := multipart.NewReader(parsed.Body, params["boundary"])
	kinds := map[string]string{}
	for {
		part, e := reader.NextPart()
		if errors.Is(e, io.EOF) {
			break
		}
		if e != nil {
			t.Fatal(e)
		}
		kind, _, e := mime.ParseMediaType(part.Header.Get("Content-Type"))
		if e != nil {
			t.Fatal(e)
		}
		data, e := io.ReadAll(part)
		if e != nil {
			t.Fatal(e)
		}
		if e = part.Close(); e != nil {
			t.Fatal(e)
		}
		kinds[kind] = string(data)
	}
	for _, kind := range []string{"text/plain", "text/html"} {
		if !strings.Contains(kinds[kind], "Verified payment.") || !strings.Contains(kinds[kind], "https://playora.example.test/orders/fixture") {
			t.Fatalf("missing equivalent %s body", kind)
		}
	}
	if !strings.Contains(kinds["text/html"], "Payment confirmed") {
		t.Fatal("event heading missing")
	}
}

func TestSMTPRejectsUnsafePresentationBeforeTransport(t *testing.T) {
	t.Parallel()
	adapter := &SMTP{from: "notifications@example.test"}
	// No SMTP client is installed: invalid presentation must return before dialing.
	if err := adapter.Send(t.Context(), Message{To: "customer@example.test", Subject: "Update", Body: "Text", View: emailtemplate.View{ActionLabel: "Open", ActionURL: "javascript:alert(1)"}}); err == nil {
		t.Fatal("unsafe action accepted")
	}
}
