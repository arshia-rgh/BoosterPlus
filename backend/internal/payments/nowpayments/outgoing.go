package nowpayments

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
)

// Recipient is private customer-confirmed routing data, never a sending-address guess.
type Recipient struct {
	Address string `json:"address"`
	Memo    string `json:"memo"`
}

// PayoutRequest binds one immutable outgoing attempt to its recipient and exact crypto amount.
type PayoutRequest struct {
	AttemptID string
	Currency  string
	Amount    Decimal
	Recipient Recipient
}

// Payout is typed authenticated evidence; the application must match it against an approval.
type Payout struct {
	ID        string
	BatchID   string
	AttemptID string
	Currency  string
	Amount    Decimal
	Recipient Recipient
	Status    string
	Hash      string
}

// PayoutPage provides references only; each payout needs a separate authenticated read.
type PayoutPage struct {
	IDs   []string
	Pages int
}

// ValidRecipient rejects malformed private address and memo input before provider validation.
func ValidRecipient(value Recipient) bool {
	return len(value.Address) >= 8 && len(value.Address) <= 256 && len(value.Memo) <= 128 && !strings.ContainsAny(value.Address, " \r\n\t\x00") && !strings.ContainsAny(value.Memo, "\r\n\x00")
}
func validatePayout(input PayoutRequest) error {
	id, err := uuid.Parse(input.AttemptID)
	if err != nil || id.String() != input.AttemptID || !coinPattern.MatchString(input.Currency) || !ValidRecipient(input.Recipient) {
		return ErrInvalid
	}
	amount, err := input.Amount.Rational()
	if err != nil || amount.Sign() <= 0 {
		return ErrInvalid
	}
	return nil
}

// CheckRecipient validates the precise currency/address/memo at the fixed provider endpoint.
func (c *Client) CheckRecipient(ctx context.Context, currency string, recipient Recipient) error {
	if !coinPattern.MatchString(currency) || !ValidRecipient(recipient) {
		return ErrInvalid
	}
	raw, err := json.Marshal(map[string]string{"currency": currency, "address": recipient.Address, "extra_id": recipient.Memo})
	if err != nil {
		return ErrInvalid
	}
	return c.requestAcknowledgement(ctx, "/payout/validate-address", raw, "")
}

// CreatePayout issues exactly one POST. No retry or merchant 2FA secret is hidden here.
func (c *Client) CreatePayout(ctx context.Context, input PayoutRequest) (Payout, error) {
	if !c.payoutsEnabled {
		return Payout{}, ErrUnavailable
	}
	if err := validatePayout(input); err != nil {
		return Payout{}, err
	}
	token, err := c.bearer(ctx)
	if err != nil {
		return Payout{}, err
	}
	raw, err := json.Marshal(map[string]any{"withdrawals": []any{map[string]any{"address": input.Recipient.Address, "extra_id": input.Recipient.Memo, "currency": input.Currency, "amount": json.Number(input.Amount), "unique_external_id": input.AttemptID}}})
	if err != nil {
		return Payout{}, ErrInvalid
	}
	value, err := c.requestToken(ctx, http.MethodPost, "/payout", raw, token)
	if err != nil {
		return Payout{}, ErrAmbiguous
	}
	batch, err := providerID(value["id"])
	if err != nil {
		return Payout{}, ErrAmbiguous
	}
	items, ok := value["withdrawals"].([]any)
	if !ok || len(items) != 1 {
		return Payout{}, ErrAmbiguous
	}
	object, ok := items[0].(map[string]any)
	if !ok {
		return Payout{}, ErrAmbiguous
	}
	payout, err := parsePayout(object)
	if err != nil || payout.BatchID != batch || !matchesPayout(input, payout) {
		return Payout{}, ErrAmbiguous
	}
	return payout, nil
}
func matchesPayout(input PayoutRequest, payout Payout) bool {
	amount, aerr := input.Amount.Rational()
	observed, berr := payout.Amount.Rational()
	return aerr == nil && berr == nil && amount.Cmp(observed) == 0 && input.AttemptID == payout.AttemptID && input.Currency == payout.Currency && input.Recipient == payout.Recipient
}

// VerifyPayout transmits one ephemeral provider code; success is not transfer completion.
func (c *Client) VerifyPayout(ctx context.Context, batch, code string) error {
	if !c.payoutsEnabled {
		return ErrUnavailable
	}
	if _, err := providerID(batch); err != nil || len(code) != 6 || strings.Trim(code, "0123456789") != "" {
		return ErrInvalid
	}
	token, err := c.bearer(ctx)
	if err != nil {
		return err
	}
	raw, err := json.Marshal(map[string]string{"verification_code": code})
	if err != nil {
		return ErrInvalid
	}
	defer clear(raw)
	return c.requestAcknowledgement(ctx, "/payout/"+batch+"/verify", raw, token)
}

// GetPayout never accepts a staff-entered hash as confirmation.
func (c *Client) GetPayout(ctx context.Context, id string) (Payout, error) {
	if _, err := providerID(id); err != nil {
		return Payout{}, ErrInvalid
	}
	token, err := c.bearer(ctx)
	if err != nil {
		return Payout{}, err
	}
	value, err := c.requestValue(ctx, http.MethodGet, "/payout/"+id, nil, token)
	if err != nil {
		return Payout{}, err
	}
	if object, ok := value.(map[string]any); ok {
		if items, found := object["payouts"]; found {
			value = items
		}
	}
	if items, ok := value.([]any); ok {
		if len(items) != 1 {
			return Payout{}, ErrEvidence
		}
		value = items[0]
	}
	object, ok := value.(map[string]any)
	if !ok {
		return Payout{}, ErrEvidence
	}
	result, err := parsePayout(object)
	if err != nil || result.ID != id {
		return Payout{}, ErrEvidence
	}
	return result, nil
}
func parsePayout(value map[string]any) (Payout, error) {
	var p Payout
	var err error
	p.ID, err = providerID(value["id"])
	if err != nil {
		return p, err
	}
	p.BatchID, err = providerID(value["batch_withdrawal_id"])
	if err != nil {
		return p, err
	}
	p.AttemptID, err = boundedText(value["unique_external_id"], 36)
	if err != nil {
		return p, err
	}
	p.Currency, err = boundedText(value["currency"], 32)
	if err != nil || !coinPattern.MatchString(p.Currency) {
		return p, ErrEvidence
	}
	p.Amount, err = decimal(value["amount"])
	if err != nil {
		return p, err
	}
	p.Recipient.Address, err = boundedText(value["address"], 256)
	if err != nil {
		return p, err
	}
	p.Recipient.Memo, err = boundedText(value["extra_id"], 128)
	if err != nil || !ValidRecipient(p.Recipient) {
		return p, ErrEvidence
	}
	p.Status, err = boundedText(value["status"], 32)
	if err != nil {
		return p, err
	}
	if status, exists := value["payout_status"]; exists {
		p.Status, err = boundedText(status, 32)
		if err != nil {
			return p, err
		}
	}
	p.Status = strings.ToLower(p.Status)
	switch p.Status {
	case "new", "creating", "waiting", "processing", "sending", "finished", "failed", "rejected", "rejected_not_checked", "cancelled", "canceled":
	default:
		return p, ErrEvidence
	}
	p.Hash, err = boundedText(value["hash"], 256)
	return p, err
}

// ListPayouts discovers a bounded page of references for authoritative reconciliation.
func (c *Client) ListPayouts(ctx context.Context, page int) (PayoutPage, error) {
	if page < 0 || page > 100000 {
		return PayoutPage{}, ErrInvalid
	}
	token, err := c.bearer(ctx)
	if err != nil {
		return PayoutPage{}, err
	}
	value, err := c.requestToken(ctx, http.MethodGet, "/payout?limit=50&page="+strconv.Itoa(page)+"&order_by=created_at&order=DESC", nil, token)
	if err != nil {
		return PayoutPage{}, err
	}
	items, ok := value["payouts"].([]any)
	if !ok || len(items) > 50 {
		return PayoutPage{}, ErrEvidence
	}
	count, ok := value["pagesCount"].(json.Number)
	if !ok {
		return PayoutPage{}, ErrEvidence
	}
	pages, err := strconv.Atoi(string(count))
	if err != nil || pages < 0 || pages > 100001 {
		return PayoutPage{}, ErrEvidence
	}
	result := PayoutPage{IDs: []string{}, Pages: pages}
	seen := map[string]bool{}
	for _, item := range items {
		object, valid := item.(map[string]any)
		if !valid {
			return PayoutPage{}, ErrEvidence
		}
		id, e := providerID(object["id"])
		if e != nil || seen[id] {
			return PayoutPage{}, ErrEvidence
		}
		seen[id] = true
		result.IDs = append(result.IDs, id)
	}
	return result, nil
}
