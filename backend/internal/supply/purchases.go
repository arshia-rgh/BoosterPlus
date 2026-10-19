package supply

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentallocation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierpurchase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

// PurchaseProvider is environment-bound. Network effects always run outside SQL.
type PurchaseProvider interface {
	Connection() suppliers.Connection
	QuoteOffer(context.Context, suppliers.Product, string, suppliers.Decimal) (suppliers.Quote, error)
	CreateOrder(context.Context, suppliers.PurchaseRequest) (suppliers.Order, error)
	GetOrder(context.Context, string) (suppliers.Order, error)
	FindOrders(context.Context, string, int) ([]suppliers.Order, bool, error)
	VerifyWebhook([]byte, []string) (suppliers.Signal, error)
}

// Purchaser owns one durable attempt per accepted order. It has no public
// creation route and cannot enable production purchasing. Publication and the
// authenticated checkout path must supply the accepted binding separately.
type Purchaser struct {
	client    *ent.Client
	keys      *vault.Keyring
	providers map[suppliers.Connection]PurchaseProvider
	enabled   bool
	now       func() time.Time
}

// NewPurchaser permits an explicitly enabled isolated test worker only.
func NewPurchaser(client *ent.Client, keys *vault.Keyring, providers []PurchaseProvider, enabled bool, now func() time.Time) (*Purchaser, error) {
	if client == nil || keys == nil {
		return nil, ErrInvalid
	}
	if now == nil {
		now = time.Now
	}
	out := &Purchaser{client: client, keys: keys, providers: map[suppliers.Connection]PurchaseProvider{}, enabled: enabled, now: now}
	for _, provider := range providers {
		if provider == nil || !validConnection(provider.Connection()) || out.providers[provider.Connection()] != nil || enabled && !provider.Connection().Testing() {
			return nil, ErrInvalid
		}
		out.providers[provider.Connection()] = provider
	}
	return out, nil
}

func (s *Purchaser) transaction(ctx context.Context, fn func(*ent.Tx) error) error {
	tx, err := s.client.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return err
	}
	result, err := tx.ExecContext(ctx, "UPDATE auth_controls SET version=version+1 WHERE id=1")
	if err == nil {
		var count int64
		count, err = result.RowsAffected()
		if err == nil && count != 1 {
			err = ErrUnavailable
		}
	}
	if err == nil {
		err = fn(tx)
	}
	if err != nil {
		return errors.Join(err, tx.Rollback())
	}
	return tx.Commit()
}

// PrepareInTransaction stores an immutable private quote and encrypted delivery
// inputs atomically with the caller's authenticated customer order. It does not
// authorize dispatch, accept payment or call the provider. No replacement is
// possible once an order has a purchase, including after provider cancellation.
func (s *Purchaser) PrepareInTransaction(ctx context.Context, tx *ent.Tx, purchase *ent.Order, contract *ent.OrderContract, quote suppliers.Quote, amount string, values map[string]string) (*ent.SupplierPurchase, error) {
	if tx == nil || purchase == nil || contract == nil || purchase.Kind != order.KindShop || purchase.State != order.StateAwaitingPayment || purchase.CurrentContract != contract.ID || contract.OrderID != purchase.ID || (contract.ActiveOrderID == nil || *contract.ActiveOrderID != purchase.ID) || contract.UserID != purchase.UserID || contract.PaymentState != ordercontract.PaymentStateUnissued || !validConnection(quote.Connection) || s.providers[quote.Connection] == nil || !quote.Offer.Available || len(quote.Product.ReviewIssues) != 0 || len(quote.Offer.ReviewIssues) != 0 {
		return nil, ErrInvalid
	}
	if suppliers.ValidateQuantity(quote.Offer.Quantity, quote.Quantity) != nil || suppliers.ValidateFields(quote.Offer.Fields, values) != nil || !sameCommercial(contract, amount) {
		return nil, ErrInvalid
	}
	total, err := quote.TotalCost.Rational()
	if err != nil || total.Sign() <= 0 {
		return nil, ErrInvalid
	}
	matched := false
	for _, offer := range quote.Product.Offers {
		if offer.ID == quote.Offer.ID {
			matched = true
		}
	}
	if !matched {
		return nil, ErrInvalid
	}
	exists, err := tx.SupplierPurchase.Query().Where(supplierpurchase.OrderIDEQ(purchase.ID)).Exist(ctx)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrConflict
	}
	id := uuid.NewString()
	secretID, err := s.seal(ctx, tx, id, purchase.UserID, "supplier_input", values, s.now().Add(7*24*time.Hour))
	if err != nil {
		return nil, err
	}
	return tx.SupplierPurchase.Create().SetID(id).SetOrderID(purchase.ID).SetContractID(contract.ID).SetUserID(purchase.UserID).SetConnectionID(string(quote.Connection)).SetProduct(&quote.Product).SetOfferID(quote.Offer.ID).SetQuantity(string(quote.Quantity)).SetMaximumCost(string(quote.TotalCost)).SetAmountMinor(amount).SetInputSecretID(secretID).SetNextCheck(s.now()).SetCreatedAt(s.now()).SetUpdatedAt(s.now()).Save(ctx)
}

func sameCommercial(contract *ent.OrderContract, amount string) bool {
	raw, err := json.Marshal(contract.Data)
	if err != nil {
		return false
	}
	var value struct {
		Currency string `json:"currency"`
		Amount   string `json:"amount_minor"`
	}
	return json.Unmarshal(raw, &value) == nil && value.Currency == "USD" && value.Amount == amount && minor.MatchString(amount)
}

func (s *Purchaser) seal(ctx context.Context, tx *ent.Tx, id, owner, purpose string, value any, expires time.Time) (string, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return "", ErrInvalid
	}
	defer clear(raw)
	secretID := uuid.NewString()
	envelope, err := s.keys.Seal(secretID, vault.Scope{Purpose: purpose, ResourceID: id, OwnerID: owner}, raw)
	if err != nil {
		return "", err
	}
	_, err = tx.SecretBundle.Create().SetID(secretID).SetPurpose(secretbundle.Purpose(purpose)).SetResourceID(id).SetOwnerID(owner).SetKeyVersion(envelope.KeyID).SetWrappedKey(envelope.WrappedKey).SetEncryptedPayload(envelope.Payload).SetRequestKey(uuid.NewString()).SetRequestHash("").SetExpiresAt(expires).SetCreatedAt(s.now()).SetUpdatedAt(s.now()).Save(ctx)
	return secretID, err
}

func (s *Purchaser) inputs(ctx context.Context, tx *ent.Tx, row *ent.SupplierPurchase, fields []suppliers.Field) (map[string]string, error) {
	secret, err := tx.SecretBundle.Get(ctx, row.InputSecretID)
	if err != nil {
		return nil, err
	}
	if secret.Purpose != secretbundle.PurposeSupplierInput || secret.ResourceID != row.ID || secret.OwnerID != row.UserID || secret.State != secretbundle.StateActive || !secret.ExpiresAt.After(s.now()) || secret.CipherOwnerID != "" {
		return nil, ErrUnavailable
	}
	raw, err := s.keys.Open(secret.ID, vault.Scope{Purpose: "supplier_input", ResourceID: row.ID, OwnerID: row.UserID}, vault.Envelope{KeyID: secret.KeyVersion, WrappedKey: secret.WrappedKey, Payload: secret.EncryptedPayload})
	if err != nil {
		return nil, err
	}
	defer clear(raw)
	var values map[string]string
	if json.Unmarshal(raw, &values) != nil || suppliers.ValidateFields(fields, values) != nil {
		return nil, ErrInvalid
	}
	return values, nil
}

// paid rechecks the current accepted contract and allocated confirmed evidence.
// Supplier callbacks, queue messages and browser success never satisfy this.
func paid(ctx context.Context, tx *ent.Tx, row *ent.SupplierPurchase) error {
	purchase, err := tx.Order.Get(ctx, row.OrderID)
	if err != nil {
		return err
	}
	if purchase.Kind != order.KindShop || purchase.UserID != row.UserID || purchase.CurrentContract != row.ContractID || (purchase.State != order.StateQueued && purchase.State != order.StateInProgress) {
		return ErrConflict
	}
	customer, err := tx.User.Get(ctx, row.UserID)
	if err != nil {
		return err
	}
	if customer.Suspended || customer.DeletedAt != nil || customer.Portal != string(identity.PortalCustomer) || customer.Role != identity.RoleCustomer {
		return identity.ErrForbidden
	}
	contract, err := tx.OrderContract.Get(ctx, row.ContractID)
	if err != nil {
		return err
	}
	if contract.OrderID != row.OrderID || contract.UserID != row.UserID || (contract.ActiveOrderID == nil || *contract.ActiveOrderID != row.OrderID) || contract.PaymentState != ordercontract.PaymentStateSettled || !sameCommercial(contract, row.AmountMinor) {
		return ErrConflict
	}
	allocation, err := tx.PaymentAllocation.Query().Where(paymentallocation.ContractIDEQ(row.ContractID), paymentallocation.OrderIDEQ(row.OrderID)).Only(ctx)
	if err != nil {
		return err
	}
	receipt, err := tx.PaymentReceipt.Get(ctx, allocation.ReceiptID)
	if err != nil {
		return err
	}
	if receipt.State != "confirmed" || receipt.OrderID != row.OrderID || receipt.UserID != row.UserID || allocation.AmountMinor != row.AmountMinor || allocation.Currency != "USD" {
		return ErrConflict
	}
	blocked, err := tx.ServiceCase.Query().Where(servicecase.ActiveOrderIDEQ(row.OrderID)).Exist(ctx)
	if err != nil {
		return err
	}
	if blocked {
		return ErrConflict
	}
	return nil
}

func request(row *ent.SupplierPurchase) (suppliers.PurchaseRequest, error) {
	if row.Product == nil {
		return suppliers.PurchaseRequest{}, ErrInvalid
	}
	for _, offer := range row.Product.Offers {
		if offer.ID == row.OfferID {
			return suppliers.PurchaseRequest{Reference: row.ID, ProductID: row.Product.ID, Offer: offer, Quantity: suppliers.Decimal(row.Quantity), MaximumCost: suppliers.Decimal(row.MaximumCost)}, nil
		}
	}
	return suppliers.PurchaseRequest{}, ErrInvalid
}
