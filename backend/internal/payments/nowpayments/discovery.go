package nowpayments

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// PaymentPage carries references only; each item still requires an authoritative GET.
type PaymentPage struct {
	IDs   []string
	Pages int
}

func (c *Client) bearer(ctx context.Context) (string, error) {
	c.tokenMu.Lock()
	defer c.tokenMu.Unlock()
	if c.token != "" && time.Now().Before(c.tokenUntil) {
		return c.token, nil
	}
	if c.email == "" || c.password == "" {
		return "", ErrUnavailable
	}
	// #nosec G117 -- The fixed HTTPS provider auth endpoint requires a password JSON field. This body is never logged or persisted.
	body, err := json.Marshal(struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}{c.email, c.password})
	if err != nil {
		return "", ErrInvalid
	}
	response, err := c.request(ctx, http.MethodPost, "/auth", body)
	if err != nil {
		return "", err
	}
	token, ok := response["token"].(string)
	if !ok || len(token) < 16 || len(token) > 4096 || strings.ContainsAny(token, " \t\r\n\x00") {
		return "", ErrEvidence
	}
	c.token, c.tokenUntil = token, time.Now().Add(4*time.Minute)
	return token, nil
}

// ListPayments visits one bounded merchant page to repair missing callbacks.
// A failed authenticated read invalidates the cache for the next scheduled read;
// financial POST operations are never implicitly retried.
func (c *Client) ListPayments(ctx context.Context, page int) (PaymentPage, error) {
	if page < 0 || page > 100000 {
		return PaymentPage{}, ErrInvalid
	}
	token, err := c.bearer(ctx)
	if err != nil {
		return PaymentPage{}, err
	}
	value, err := c.requestToken(ctx, http.MethodGet, "/payment/?limit=50&page="+strconv.Itoa(page)+"&sortBy=created_at&orderBy=desc", nil, token)
	if err != nil {
		c.tokenMu.Lock()
		c.token = ""
		c.tokenMu.Unlock()
		return PaymentPage{}, err
	}
	data, ok := value["data"].([]any)
	if !ok || len(data) > 50 {
		return PaymentPage{}, ErrEvidence
	}
	count, ok := value["pagesCount"].(json.Number)
	if !ok {
		return PaymentPage{}, ErrEvidence
	}
	pages, err := strconv.Atoi(string(count))
	if err != nil || pages < 0 || pages > 100001 {
		return PaymentPage{}, ErrEvidence
	}
	result := PaymentPage{IDs: make([]string, 0, len(data)), Pages: pages}
	seen := map[string]bool{}
	for _, item := range data {
		row, valid := item.(map[string]any)
		if !valid {
			return PaymentPage{}, ErrEvidence
		}
		id, e := providerID(row["payment_id"])
		if e != nil || seen[id] {
			return PaymentPage{}, ErrEvidence
		}
		seen[id] = true
		result.IDs = append(result.IDs, id)
	}
	return result, nil
}
