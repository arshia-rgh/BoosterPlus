package suppliers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/url"
	"slices"
	"strings"
)

// Signal is an authenticated notification, never settlement/completion proof.
// Bind it to an existing dispatch on Connection+OrderID before accepting any
// action. Reconcile status using GetOrder; references alone do not grant access.
type Signal struct {
	Connection      Connection
	Digest          string
	Type            string
	OrderID         string
	Reference       string
	Number          *int
	VerificationURL string
	Employee        string
	Recognized      bool
}

// VerifyWebhook validates the exact bytes, rejects duplicate signature headers
// and ambiguous JSON, and excludes private delivery values from the projection.
func (c *Client) VerifyWebhook(raw []byte, signatures []string) (Signal, error) {
	if len(raw) == 0 || len(raw) > maxOrderResponse || len(signatures) != 1 || len(signatures[0]) != 64 {
		return Signal{}, ErrSignature
	}
	provided, err := hex.DecodeString(signatures[0])
	if err != nil {
		return Signal{}, ErrSignature
	}
	mac := hmac.New(sha256.New, []byte(c.token))
	if _, err = mac.Write(raw); err != nil {
		return Signal{}, ErrSignature
	}
	if !hmac.Equal(provided, mac.Sum(nil)) {
		return Signal{}, ErrSignature
	}
	var wire struct {
		Type  string `json:"type"`
		Order struct {
			ID          json.Number `json:"id"`
			ExternalID  string      `json:"externalId"`
			ShopOrderID string      `json:"shopOrderId"`
			Number      *int        `json:"number"`
		} `json:"order"`
		Verification struct {
			URL string `json:"url"`
		} `json:"verification"`
		Employee struct {
			Username string `json:"username"`
		} `json:"employee"`
	}
	if decode(raw, &wire) != nil || !plain(wire.Type, 1, 80) {
		return Signal{}, ErrEvidence
	}
	// Use the authenticated fingerprint rather than an unkeyed hash of a body
	// that may contain low-entropy delivery credentials. The receipt must not
	// become an offline guessing oracle if the application database is exposed.
	out := Signal{Connection: c.connection, Digest: hex.EncodeToString(mac.Sum(nil)), Type: wire.Type}
	allowed := []string{"statusChange", "codeRequest", "googlePrompt", "gameExitRequest"}
	if c.connection.nexus() {
		allowed = []string{"statusChange", "robloxSuperpassInGame", "robloxLogpassVerification"}
	}
	if !slices.Contains(allowed, wire.Type) {
		return out, nil
	}
	if !numericIDPattern.MatchString(wire.Order.ID.String()) {
		return Signal{}, ErrEvidence
	}
	out.Recognized = true
	out.OrderID = wire.Order.ID.String()
	out.Reference = wire.Order.ShopOrderID
	if c.connection.nexus() {
		out.Reference = wire.Order.ExternalID
	}
	if !plain(out.Reference, 0, 240) {
		return Signal{}, ErrEvidence
	}
	switch out.Type {
	case "googlePrompt":
		if wire.Order.Number == nil || *wire.Order.Number < 0 || *wire.Order.Number > 999999 {
			return Signal{}, ErrEvidence
		}
		out.Number = wire.Order.Number
	case "robloxLogpassVerification":
		if !c.verificationURL(wire.Verification.URL) {
			return Signal{}, ErrEvidence
		}
		out.VerificationURL = wire.Verification.URL
	case "robloxSuperpassInGame":
		if !plain(wire.Employee.Username, 1, 40) {
			return Signal{}, ErrEvidence
		}
		out.Employee = wire.Employee.Username
	}
	return out, nil
}

func (c *Client) verificationURL(raw string) bool {
	if len(raw) > 2048 {
		return false
	}
	value, err := url.Parse(raw)
	return err == nil && value.Scheme == "https" && value.User == nil && value.Host == strings.TrimPrefix(c.connection.origin(), "https://") && value.Fragment == "" && value.Opaque == ""
}
