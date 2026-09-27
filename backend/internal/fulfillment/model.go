// Package fulfillment owns paid boosting assignments and execution permissions.
package fulfillment

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

// ErrConflict requires refresh rather than changing an observed assignment.
var ErrConflict = errors.New("fulfillment changed or unavailable")

// ErrInvalid is safe to return without echoing private submitted values.
var ErrInvalid = errors.New("invalid fulfillment input")

// Store shares the authorization fence with identity, orders and the vault.
type Store struct {
	client  *ent.Client
	auth    *identity.Service
	secrets *vault.Store
	keys    *vault.Keyring
	now     func() time.Time
}

// New registers a concrete paid-order policy; no role has universal vault access.
func New(client *ent.Client, auth *identity.Service, keys *vault.Keyring, clock func() time.Time) (*Store, error) {
	if clock == nil {
		clock = time.Now
	}
	s := &Store{client: client, auth: auth, keys: keys, now: clock}
	secrets, err := vault.New(client, auth, keys, s.secretPolicy, clock)
	if err != nil {
		return nil, err
	}
	s.secrets = secrets
	return s, nil
}
func decode[T any](data map[string]any) (T, error) {
	var v T
	raw, err := json.Marshal(data)
	if err != nil {
		return v, err
	}
	err = json.Unmarshal(raw, &v)
	return v, err
}
func document(value any) (map[string]any, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	var out map[string]any
	err = json.Unmarshal(raw, &out)
	return out, err
}
func bounded(value string, minimum, maximum int) bool {
	return utf8.ValidString(value) && utf8.RuneCountInString(strings.TrimSpace(value)) >= minimum && utf8.RuneCountInString(value) <= maximum && !strings.ContainsRune(value, 0)
}
func active(row *ent.Order) bool {
	return row.State == order.StateQueued || row.State == order.StateInProgress || row.State == order.StateOnHold
}
func paid(ctx context.Context, c *ent.Client, id string) (*ent.Order, error) {
	row, err := c.Order.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	ok, err := c.OrderContract.Query().Where(ordercontract.IDEQ(row.CurrentContract), ordercontract.OrderIDEQ(row.ID), ordercontract.ActiveOrderIDEQ(row.ID), ordercontract.UserIDEQ(row.UserID), ordercontract.PaymentStateEQ(ordercontract.PaymentStateSettled)).Exist(ctx)
	if err != nil {
		return nil, err
	}
	if !ok || row.Kind == order.KindAccount {
		return nil, ErrConflict
	}
	return row, nil
}
func definition(row *ent.Order) (catalog.Release, catalog.ServiceDefinition, catalog.Answers, error) {
	release, err := decode[catalog.Release](row.Snapshot)
	if err != nil {
		return release, catalog.ServiceDefinition{}, nil, err
	}
	answers, err := decode[catalog.Answers](row.Answers)
	if err != nil {
		return release, catalog.ServiceDefinition{}, nil, err
	}
	for _, service := range release.Configuration.Services {
		if service.Key == row.Service && service.Fulfillment != nil {
			return release, service, answers, nil
		}
	}
	return release, catalog.ServiceDefinition{}, nil, catalog.ErrFulfillmentPolicy
}

// SharedField contains only ordinary fields explicitly shared by the release.
type SharedField struct {
	Key   string          `json:"key"`
	Label string          `json:"label"`
	Value json.RawMessage `json:"value"`
}

// View intentionally omits customer identity, prices, coupons and payment metadata.
type View struct {
	NextSession        *AgendaItem     `json:"next_session,omitempty"`
	CoordinationID     string          `json:"coordination_id"`
	CoordinationShared bool            `json:"coordination_shared"`
	OrderID            string          `json:"order_id"`
	OrderVersion       int             `json:"order_version"`
	AccessVersion      int             `json:"access_version"`
	Version            int             `json:"version"`
	Game               string          `json:"game"`
	Service            string          `json:"service"`
	State              string          `json:"state"`
	Mode               string          `json:"mode"`
	SecretHours        int             `json:"secret_hours"`
	AssignedID         string          `json:"assigned_id,omitempty"`
	Alias              string          `json:"alias"`
	Progress           int             `json:"progress"`
	CompletionPending  bool            `json:"completion_pending"`
	Note               string          `json:"note"`
	EstimatedStart     *time.Time      `json:"estimated_start"`
	EstimatedFinish    *time.Time      `json:"estimated_finish"`
	Forecast           *Forecast       `json:"forecast,omitempty"`
	ForecastReview     bool            `json:"forecast_review"`
	Handoff            catalog.Answers `json:"handoff,omitempty"`
	Shared             []SharedField   `json:"shared"`
	UpdatedAt          time.Time       `json:"updated_at"`
}

// Assignment binds a staff change to both observed execution and order versions.
type Assignment struct {
	Version      int    `json:"version"`
	OrderVersion int    `json:"order_version"`
	AssignedID   string `json:"assigned_id"`
	Reason       string `json:"reason"`
}

// Update carries customer-visible execution updates, not a new commercial agreement.
type Update struct {
	Version         int        `json:"version"`
	OrderVersion    int        `json:"order_version"`
	Note            string     `json:"note"`
	Progress        int        `json:"progress"`
	EstimatedStart  *time.Time `json:"estimated_start"`
	EstimatedFinish *time.Time `json:"estimated_finish"`
}

// Handoff accepts only later-stage ordinary answers; paid choices remain immutable.
type Handoff struct {
	Version      int             `json:"version"`
	OrderVersion int             `json:"order_version"`
	Answers      catalog.Answers `json:"answers"`
}
