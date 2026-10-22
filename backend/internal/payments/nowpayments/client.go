// Package nowpayments provides bounded hosted-invoice transport and verified IPN references.
// It never changes an order, allocates a receipt, or treats a callback as settlement evidence.
package nowpayments

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// ErrInvalid rejects malformed local configuration or request input.
var ErrInvalid = errors.New("invalid crypto provider input")

// ErrUnavailable indicates a failed authoritative read without leaking provider data.
var ErrUnavailable = errors.New("crypto provider unavailable")

// ErrAmbiguous means invoice creation might have succeeded; reconcile before retrying.
var ErrAmbiguous = errors.New("crypto invoice creation requires reconciliation")

// ErrEvidence rejects inconsistent or malformed provider evidence.
var ErrEvidence = errors.New("crypto provider evidence invalid")

// ErrSignature rejects unauthenticated or ambiguous webhook payloads.
var ErrSignature = errors.New("crypto callback verification failed")

const maxBody = 256 * 1024

var minorPattern = regexp.MustCompile(`^[1-9][0-9]{0,11}$`)
var coinPattern = regexp.MustCompile(`^[a-z0-9]{1,32}$`)

// Config is server-only configuration. Never log this value or expose it to a browser.
// All provider traffic uses the production API; arbitrary API hosts are not supported.
type Config struct {
	APIKey       string
	IPNSecret    string
	PublicOrigin string
	// ReadOnly permits local HTTP origins while forbidding invoice creation. Provider requests still use fixed HTTPS endpoints.
	ReadOnly       bool
	PayoutsEnabled bool
	// Dashboard credentials are used only for authenticated discovery/outgoing APIs.
	Email    string
	Password string
}

// Client owns a timeout-bound client with fixed provider endpoints and no redirect following.
type Client struct {
	apiKey, ipnSecret, baseURL, checkoutHost, origin string
	http                                             *http.Client
	email, password                                  string
	readOnly                                         bool
	payoutsEnabled                                   bool
	tokenMu                                          sync.Mutex
	token                                            string
	tokenUntil                                       time.Time
	currencies                                       currencyCache
}

// New validates configuration without making a network call or enabling checkout routes.
func New(cfg Config) (*Client, error) {
	for _, secret := range []string{cfg.APIKey, cfg.IPNSecret} {
		if len(secret) < 16 || len(secret) > 1024 || strings.TrimSpace(secret) != secret {
			return nil, ErrInvalid
		}
		for _, r := range secret {
			if r < 33 || r > 126 {
				return nil, ErrInvalid
			}
		}
	}
	if (cfg.Email == "") != (cfg.Password == "") || len(cfg.Email) > 254 || len(cfg.Password) > 1024 || strings.ContainsAny(cfg.Email, "\x00\r\n") || strings.ContainsRune(cfg.Password, 0) {
		return nil, ErrInvalid
	}
	if len(cfg.PublicOrigin) > 2048 {
		return nil, ErrInvalid
	}
	origin, err := url.Parse(cfg.PublicOrigin)
	if err != nil || (origin.Scheme != "https" && (!cfg.ReadOnly || cfg.PayoutsEnabled || origin.Scheme != "http")) || origin.Hostname() == "" || origin.User != nil || origin.Path != "" || origin.RawQuery != "" || origin.Fragment != "" || origin.Opaque != "" || origin.ForceQuery {
		return nil, ErrInvalid
	}
	c := &Client{payoutsEnabled: cfg.PayoutsEnabled, readOnly: cfg.ReadOnly, email: cfg.Email, password: cfg.Password, apiKey: cfg.APIKey, ipnSecret: cfg.IPNSecret, origin: cfg.PublicOrigin, baseURL: "https://api.nowpayments.io/v1", checkoutHost: "nowpayments.io", http: &http.Client{Timeout: 15 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}}
	return c, nil
}

// InvoiceRequest is copied from a persisted immutable commercial attempt, never browser price input.
// PayCurrency names the provider's asset/network code. Empty permits the merchant-enabled chooser.
// FeePaidByUser must come from the accepted fee policy; this adapter supplies no policy default.
type InvoiceRequest struct {
	OrderID       string
	AttemptID     string
	AmountMinor   string
	Currency      string
	PayCurrency   string
	FixedRate     bool
	FeePaidByUser bool
}

// Invoice is a validated hosted checkout reference; its ID is not a payment ID.
type Invoice struct{ ID, URL string }

// CreateInvoice performs exactly one HTTP attempt. Every remote failure is conservatively ambiguous.
// The caller must persist the attempt first and must not automatically repeat this write.
func (c *Client) CreateInvoice(ctx context.Context, input InvoiceRequest) (Invoice, error) {
	if c.readOnly {
		return Invoice{}, ErrUnavailable
	}
	orderID, orderErr := uuid.Parse(input.OrderID)
	if orderErr != nil || orderID.String() != input.OrderID {
		return Invoice{}, ErrInvalid
	}
	id, err := uuid.Parse(input.AttemptID)
	if err != nil || id.String() != input.AttemptID || !minorPattern.MatchString(input.AmountMinor) || (input.Currency != "USD" && input.Currency != "EUR" && input.Currency != "GBP") || (input.PayCurrency != "" && !coinPattern.MatchString(input.PayCurrency)) {
		return Invoice{}, ErrInvalid
	}
	amount := input.AmountMinor
	for len(amount) < 3 {
		amount = "0" + amount
	}
	amount = amount[:len(amount)-2] + "." + amount[len(amount)-2:]
	payload := struct {
		Amount      json.Number `json:"price_amount"`
		Currency    string      `json:"price_currency"`
		PayCurrency string      `json:"pay_currency,omitempty"`
		OrderID     string      `json:"order_id"`
		Description string      `json:"order_description"`
		Callback    string      `json:"ipn_callback_url"`
		Success     string      `json:"success_url"`
		Cancel      string      `json:"cancel_url"`
		Partial     string      `json:"partially_paid_url"`
		Fixed       bool        `json:"is_fixed_rate"`
		Fee         bool        `json:"is_fee_paid_by_user"`
	}{json.Number(amount), strings.ToLower(input.Currency), input.PayCurrency, input.AttemptID, "PLAYORA order", c.origin + "/api/v1/webhooks/payments/nowpayments", c.origin + "/orders/" + input.OrderID + "?section=payment", c.origin + "/orders/" + input.OrderID + "?section=payment", c.origin + "/orders/" + input.OrderID + "?section=payment", input.FixedRate, input.FeePaidByUser}
	raw, err := json.Marshal(payload)
	if err != nil {
		return Invoice{}, ErrInvalid
	}
	value, err := c.request(ctx, http.MethodPost, "/invoice", raw)
	if err != nil {
		return Invoice{}, ErrAmbiguous
	}
	invoiceID, err := providerID(value["id"])
	if err != nil {
		return Invoice{}, ErrAmbiguous
	}
	href, ok := value["invoice_url"].(string)
	if !ok || len(href) > 2048 {
		return Invoice{}, ErrAmbiguous
	}
	link, err := url.Parse(href)
	if err != nil || link.Scheme != "https" || link.Host != c.checkoutHost || link.User != nil || link.Path != "/payment/" || link.RawPath != "" || link.Fragment != "" || link.Query().Get("iid") != invoiceID || len(link.Query()["iid"]) != 1 {
		return Invoice{}, ErrAmbiguous
	}
	if orderID, exists := value["order_id"]; exists && orderID != input.AttemptID {
		return Invoice{}, ErrAmbiguous
	}
	if currency, exists := value["price_currency"]; exists {
		// Live invoice responses use uppercase codes even for lowercase input.
		// Only normalize ASCII case; whitespace, other assets and types still fail.
		code, valid := currency.(string)
		if !valid || strings.ToLower(code) != payload.Currency {
			return Invoice{}, ErrAmbiguous
		}
	}
	if currency, exists := value["pay_currency"]; exists && input.PayCurrency != "" {
		code, valid := currency.(string)
		if !valid || strings.ToLower(code) != input.PayCurrency {
			return Invoice{}, ErrAmbiguous
		}
	}
	if responseAmount, exists := value["price_amount"]; exists {
		observed, e := decimal(responseAmount)
		if e != nil {
			return Invoice{}, ErrAmbiguous
		}
		received, e := observed.Rational()
		if e != nil {
			return Invoice{}, ErrAmbiguous
		}
		expected, e := Decimal(amount).Rational()
		if e != nil || received.Cmp(expected) != 0 {
			return Invoice{}, ErrAmbiguous
		}
	}
	// Reconstruct the checkout URL so unrecognized provider query parameters cannot become redirects.
	return Invoice{invoiceID, "https://" + c.checkoutHost + "/payment/?iid=" + invoiceID}, nil
}

func (c *Client) request(ctx context.Context, method, path string, body []byte) (map[string]any, error) {
	return c.requestToken(ctx, method, path, body, "")
}

func (c *Client) requestToken(ctx context.Context, method, path string, body []byte, token string) (map[string]any, error) {
	value, err := c.requestValue(ctx, method, path, body, token)
	if err != nil {
		return nil, err
	}
	result, ok := value.(map[string]any)
	if !ok || result == nil {
		return nil, ErrEvidence
	}
	return result, nil
}
func (c *Client) requestBytes(ctx context.Context, method, path string, body []byte, token string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return nil, ErrUnavailable
	}
	req.Header.Set("X-Api-Key", c.apiKey)
	req.Header.Set("Accept", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	response, err := c.http.Do(req)
	if err != nil {
		return nil, ErrUnavailable
	}
	maximum := responseLimit(method, path)
	raw, readErr := io.ReadAll(io.LimitReader(response.Body, int64(maximum)+1))
	closeErr := response.Body.Close()
	if readErr != nil || closeErr != nil || len(raw) > maximum || response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, ErrUnavailable
	}
	return raw, nil
}
func (c *Client) requestValue(ctx context.Context, method, path string, body []byte, token string) (any, error) {
	raw, err := c.requestBytes(ctx, method, path, body, token)
	if err != nil {
		return nil, err
	}
	value, err := jsonValueLimit(raw, responseLimit(method, path))
	if err != nil {
		return nil, ErrEvidence
	}
	return value, nil
}

// requestAcknowledgement accepts an empty successful response only for actions
// whose outcome will be checked separately. Financial evidence still needs JSON.
func (c *Client) requestAcknowledgement(ctx context.Context, path string, body []byte, token string) error {
	raw, err := c.requestBytes(ctx, http.MethodPost, path, body, token)
	if err != nil {
		return err
	}
	if len(bytes.TrimSpace(raw)) == 0 {
		return nil
	}
	value, err := jsonValue(raw)
	if err != nil {
		return ErrEvidence
	}
	switch result := value.(type) {
	case bool:
		if !result {
			return ErrEvidence
		}
	case map[string]any:
		for _, key := range []string{"valid", "success"} {
			if valid, exists := result[key]; exists && valid != true {
				return ErrEvidence
			}
		}
	default:
		return ErrEvidence
	}
	return nil
}

// Only the read-only currency directory needs a larger bounded response.
func responseLimit(method, path string) int {
	if method == http.MethodGet && path == "/full-currencies" {
		return 2 * 1024 * 1024
	}
	return maxBody
}
