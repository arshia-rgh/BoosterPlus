package suppliers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// Errors intentionally contain no provider response, token or delivery values.
var (
	ErrInvalid     = errors.New("supplier input invalid")
	ErrUnavailable = errors.New("supplier unavailable")
	ErrEvidence    = errors.New("supplier evidence invalid")
	ErrAmbiguous   = errors.New("supplier purchase requires reconciliation")
	ErrSignature   = errors.New("supplier callback verification failed")
	ErrReadOnly    = errors.New("supplier purchases disabled")
	ErrChanged     = errors.New("supplier delivery requirements changed")
)

// Connection identifies one platform and environment, including in stored keys.
type Connection string

// Supported connections cannot redirect requests to arbitrary credential hosts.
const (
	NexusSandbox       Connection = "nexus-sandbox"
	NexusProduction    Connection = "nexus-production"
	VendoriaTest       Connection = "vendoria-test"
	VendoriaProduction Connection = "vendoria-production"
)

func (c Connection) origin() string {
	switch c {
	case NexusSandbox:
		return "https://nexus-sandbox.amadeustech.dev"
	case NexusProduction:
		return "https://nexus.amadeustech.dev"
	case VendoriaTest:
		return "https://vendoria-test.amadeustech.dev"
	case VendoriaProduction:
		return "https://vendoria.amadeustech.dev"
	default:
		return ""
	}
}

// Testing distinguishes simulated delivery from production purchasing.
func (c Connection) Testing() bool { return c == NexusSandbox || c == VendoriaTest }
func (c Connection) nexus() bool   { return c == NexusSandbox || c == NexusProduction }

// Config is private runtime configuration. Dashboard passwords are not needed.
// This adapter stage permits writes only to test environments; production
// purchases remain unavailable until the dispatch/release controls are qualified.
type Config struct {
	Connection        Connection
	Token             string
	TestOrdersEnabled bool
}

// Client has a fixed HTTPS origin, no redirects, bounded responses and no retries.
type Client struct {
	connection    Connection
	token, origin string
	testOrders    bool
	http          *http.Client
}

var tokenPattern = regexp.MustCompile(`^[0-9]{1,20}:[!-~]{8,1000}$`)

// New validates credentials without network access or enabling a public route.
func New(cfg Config) (*Client, error) {
	if cfg.Connection.origin() == "" || !tokenPattern.MatchString(cfg.Token) || cfg.TestOrdersEnabled && !cfg.Connection.Testing() {
		return nil, ErrInvalid
	}
	return &Client{connection: cfg.Connection, token: cfg.Token, origin: cfg.Connection.origin(), testOrders: cfg.TestOrdersEnabled,
		http: &http.Client{Timeout: 30 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}}, nil
}

// Connection returns a nonsecret environment label for persistence and UI.
func (c *Client) Connection() Connection { return c.connection }

// MerchantID is the non-secret shop identifier, stable across token rotation.
// Persist it with attempts so replacing a token cannot redirect an obligation
// into another merchant account on the same platform/environment.
func (c *Client) MerchantID() string {
	id, _, _ := strings.Cut(c.token, ":")
	return id
}

const maxResponse = 32 << 20
const maxOrderResponse = 256 << 10

func (c *Client) request(ctx context.Context, method, path string, body []byte, limit int64) (result []byte, resultErr error) {
	if !strings.HasPrefix(path, "/api/") || strings.ContainsAny(path, "\r\n#") || limit < 1 || limit > maxResponse {
		return nil, ErrInvalid
	}
	req, err := http.NewRequestWithContext(ctx, method, c.origin+path, bytes.NewReader(body))
	if err != nil {
		return nil, ErrInvalid
	}
	req.Header.Set("Authorization", "Shop "+c.token)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Language", "en")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	response, err := c.http.Do(req)
	if err != nil {
		return nil, ErrUnavailable
	}
	defer func() {
		if closeErr := response.Body.Close(); closeErr != nil {
			result = nil
			resultErr = ErrUnavailable
		}
	}()
	raw, err := io.ReadAll(io.LimitReader(response.Body, limit+1))
	if err != nil || int64(len(raw)) > limit {
		return nil, ErrUnavailable
	}
	if response.StatusCode < 200 || response.StatusCode > 299 {
		return nil, ErrUnavailable
	}
	mediaType, _, mediaErr := mime.ParseMediaType(response.Header.Get("Content-Type"))
	if mediaErr != nil || mediaType != "application/json" || !json.Valid(raw) {
		return nil, ErrEvidence
	}
	return raw, nil
}

// VerifySandbox checks the explicit Nexus sandbox marker before simulated writes.
// Vendoria has no documented marker; its test host is fixed in New.
func (c *Client) VerifySandbox(ctx context.Context) error {
	if !c.connection.Testing() {
		return ErrReadOnly
	}
	if c.connection == VendoriaTest {
		return nil
	}
	raw, err := c.request(ctx, http.MethodGet, "/api/v1/sandbox", nil, 4096)
	if err != nil {
		return err
	}
	var marker struct {
		Mode      string `json:"mode"`
		RealMoney *bool  `json:"realMoney"`
	}
	if decode(raw, &marker) != nil || marker.Mode != "sandbox" || marker.RealMoney == nil || *marker.RealMoney {
		return ErrEvidence
	}
	return nil
}

// Balance returns an exact private merchant balance, never a customer wallet.
func (c *Client) Balance(ctx context.Context) (Decimal, error) {
	path := "/api/shop/balance"
	if c.connection.nexus() {
		path = "/api/v2/shops/my/balance"
	}
	if c.connection == NexusSandbox {
		path = "/api/v1/sandbox/balance"
	}
	raw, err := c.request(ctx, http.MethodGet, path, nil, 8192)
	if err != nil {
		return "", err
	}
	var value struct {
		Balance Decimal `json:"balance"`
	}
	if decode(raw, &value) != nil {
		return "", ErrEvidence
	}
	if _, err = value.Balance.Rational(); err != nil {
		return "", ErrEvidence
	}
	return value.Balance, nil
}
