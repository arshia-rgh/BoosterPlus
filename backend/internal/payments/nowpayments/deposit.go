package nowpayments

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"time"
)

var addressPattern = regexp.MustCompile(`^[a-zA-Z0-9_-]{8,256}$`)

// Destination is optional authenticated provider data, never a browser-supplied address.
// A zero expiry makes it unsuitable for customer deposit instructions.
type Destination struct {
	Address   string
	Memo      string
	ExpiresAt time.Time
}

// CreateInvoicePayment makes one write against the already persisted invoice.
// A failure is ambiguous. Its returned reference must be read back using GetPayment;
// creation alone is neither instruction authority nor settlement evidence.
func (c *Client) CreateInvoicePayment(ctx context.Context, invoice, asset string) (string, error) {
	if c.readOnly {
		return "", ErrUnavailable
	}
	if _, err := providerID(json.Number(invoice)); err != nil || !coinPattern.MatchString(asset) {
		return "", ErrInvalid
	}
	raw, err := json.Marshal(struct {
		Invoice json.Number `json:"iid"`
		Asset   string      `json:"pay_currency"`
	}{json.Number(invoice), asset})
	if err != nil {
		return "", err
	}
	result, err := c.request(ctx, http.MethodPost, "/invoice-payment", raw)
	if err != nil {
		return "", errors.Join(ErrAmbiguous, err)
	}
	id, err := providerID(result["payment_id"])
	if err != nil {
		return "", ErrAmbiguous
	}
	return id, nil
}

// ValidDestination also checks values constructed by fixture/in-process providers.
func ValidDestination(value *Destination) bool {
	if value == nil || !addressPattern.MatchString(value.Address) || len(value.Memo) > 128 {
		return false
	}
	for _, character := range value.Memo {
		if character < 32 || character > 126 {
			return false
		}
	}
	return true
}

func destination(value map[string]any) (*Destination, error) {
	address, err := boundedText(value["pay_address"], 256)
	if err != nil {
		return nil, err
	}
	memo, err := boundedText(value["payin_extra_id"], 128)
	if err != nil {
		return nil, err
	}
	expiry, err := boundedText(value["expiration_estimate_date"], 64)
	if err != nil {
		return nil, err
	}
	if address == "" {
		return nil, nil
	}
	if !addressPattern.MatchString(address) {
		return nil, ErrEvidence
	}
	for _, character := range memo {
		if character < 32 || character > 126 {
			return nil, ErrEvidence
		}
	}
	result := &Destination{Address: address, Memo: memo}
	if expiry != "" {
		result.ExpiresAt, err = time.Parse(time.RFC3339Nano, expiry)
		if err != nil {
			return nil, ErrEvidence
		}
	}
	return result, nil
}
