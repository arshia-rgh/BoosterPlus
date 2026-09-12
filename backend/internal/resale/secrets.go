package resale

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountdelivery"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

// SecretInput carries ephemeral encrypted-transfer input; it is never queued or put in events.
type SecretInput struct {
	Version    int       `json:"version"`
	RequestKey string    `json:"request_key"`
	Value      []byte    `json:"value"`
	ExpiresAt  time.Time `json:"expires_at"`
}

// SecretView excludes plaintext, ciphertext, keys and private staff identifiers.
type SecretView struct {
	Version   int        `json:"version"`
	State     string     `json:"state"`
	ExpiresAt *time.Time `json:"expires_at"`
}

func secretView(v vault.View) SecretView { return SecretView{v.Version, v.State, &v.ExpiresAt} }
func (s *Store) secretStore(policy vault.Policy) (*vault.Store, error) {
	if s.keys == nil {
		return nil, vault.ErrUnavailable
	}
	return vault.New(s.client, s.auth, s.keys, policy, s.now)
}
func (s *Store) sellerSecretPolicy(ctx context.Context, tx *ent.Tx, p *identity.Principal, scope vault.Scope, operation vault.Operation) error {
	if scope.Purpose != "account_transfer" {
		return identity.ErrForbidden
	}
	offer, err := tx.SellerOffer.Get(ctx, scope.ResourceID)
	if err != nil {
		return err
	}
	if offer.SellerID != scope.OwnerID || offer.State != "accepted" {
		return identity.ErrForbidden
	}
	if operation == vault.Inspect && p.User.ID == offer.SellerID {
		return nil
	}
	if operation == vault.Write || operation == vault.Revoke {
		if p.User.ID != offer.SellerID || offer.ControlVerifiedAt != nil {
			return identity.ErrForbidden
		}
		if !p.Session.AuthenticatedAt.Add(identity.RecentTTL).After(s.instant()) {
			return identity.ErrRecent
		}
		return nil
	}
	if operation == vault.Reveal || operation == vault.Rotate {
		return identity.Require(p, "owner")
	}
	return identity.ErrForbidden
}

// SellerSecretStatus lets only the submitting seller inspect their transfer bundle's lifecycle.
func (s *Store) SellerSecretStatus(ctx context.Context, p *identity.Principal, id string) (SecretView, error) {
	if err := identity.Require(p, "account"); err != nil {
		return SecretView{}, err
	}
	store, err := s.secretStore(s.sellerSecretPolicy)
	if err != nil {
		return SecretView{}, err
	}
	result, err := store.Status(ctx, p, vault.Scope{Purpose: "account_transfer", ResourceID: id, OwnerID: p.User.ID})
	if ent.IsNotFound(err) {
		return SecretView{State: "missing"}, nil
	}
	return secretView(result), err
}

// SubmitSellerSecret uses recent seller identity and forbids replacing verified control silently.
func (s *Store) SubmitSellerSecret(ctx context.Context, p *identity.Principal, id string, input SecretInput) (SecretView, error) {
	defer clear(input.Value)
	if err := identity.Require(p, "account"); err != nil {
		return SecretView{}, err
	}
	store, err := s.secretStore(s.sellerSecretPolicy)
	if err != nil {
		return SecretView{}, err
	}
	value, err := store.Put(ctx, p, vault.Scope{Purpose: "account_transfer", ResourceID: id, OwnerID: p.User.ID}, input.Version, input.RequestKey, input.ExpiresAt, input.Value)
	return secretView(value), err
}

// RevealSellerSecret requires the owner's recent two-factor verification, with a committed audit.
func (s *Store) RevealSellerSecret(ctx context.Context, p *identity.Principal, id string) ([]byte, error) {
	if err := identity.Require(p, "owner"); err != nil {
		return nil, err
	}
	offer, err := s.client.SellerOffer.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	store, err := s.secretStore(s.sellerSecretPolicy)
	if err != nil {
		return nil, err
	}
	return store.RevealForStaff(ctx, p, vault.Scope{Purpose: "account_transfer", ResourceID: id, OwnerID: offer.SellerID})
}
func paidAccount(ctx context.Context, client *ent.Client, id string) (*ent.Order, error) {
	row, err := client.Order.Query().Where(order.IDEQ(id), order.KindEQ(order.KindAccount), order.StateIn(order.StateQueued, order.StateInProgress, order.StateCompleted)).Only(ctx)
	if err != nil {
		return nil, err
	}
	paid, err := client.OrderContract.Query().Where(ordercontract.IDEQ(row.CurrentContract), ordercontract.ActiveOrderIDEQ(id), ordercontract.PaymentStateEQ(ordercontract.PaymentStateSettled)).Exist(ctx)
	if err != nil {
		return nil, err
	}
	if !paid {
		return nil, ErrConflict
	}
	held, err := client.ServiceCase.Query().Where(servicecase.ActiveOrderIDEQ(id)).Exist(ctx)
	if err != nil {
		return nil, err
	}
	if held {
		return nil, ErrConflict
	}
	return row, nil
}
func (s *Store) deliveryPolicy(ctx context.Context, tx *ent.Tx, p *identity.Principal, scope vault.Scope, operation vault.Operation) error {
	if scope.Purpose != "account_transfer" {
		return identity.ErrForbidden
	}
	row, err := paidAccount(ctx, tx.Client(), scope.ResourceID)
	if err != nil {
		return err
	}
	delivery, err := tx.AccountDelivery.Query().Where(accountdelivery.OrderIDEQ(row.ID)).Only(ctx)
	if err != nil {
		return err
	}
	if delivery.SecretOwnerID != scope.OwnerID {
		return identity.ErrForbidden
	}
	switch operation {
	case vault.Revoke:
		return identity.ErrForbidden
	case vault.Write:
		if delivery.State != "pending" || p.User.ID != scope.OwnerID {
			return identity.ErrForbidden
		}
		if err = identity.Require(p, "admin"); err != nil {
			return err
		}
		if !p.Session.AuthenticatedAt.Add(identity.RecentTTL).After(s.instant()) || p.Session.MfaVerifiedAt == nil || !p.Session.MfaVerifiedAt.Add(identity.RecentTTL).After(s.instant()) {
			return identity.ErrRecent
		}
		return nil
	case vault.Deliver:
		if p.User.ID != row.UserID || (delivery.State != "delivered" && delivery.State != "acknowledged") {
			return identity.ErrForbidden
		}
		return nil
	case vault.Reveal, vault.Rotate:
		return identity.Require(p, "owner")
	case vault.Inspect:
		return identity.Require(p, "admin")
	}
	return identity.ErrForbidden
}

// SubmitDeliverySecret creates a distinct buyer handoff; seller-origin credentials are never exposed directly.
func (s *Store) SubmitDeliverySecret(ctx context.Context, p *identity.Principal, id string, input SecretInput) (SecretView, error) {
	defer clear(input.Value)
	if !validID(id) {
		return SecretView{}, ErrInvalid
	}
	err := s.auth.AuthorizedTransaction(ctx, p, "admin", true, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := paidAccount(ctx, tx.Client(), id)
		if e != nil {
			return e
		}
		existing, e := tx.AccountDelivery.Query().Where(accountdelivery.OrderIDEQ(id)).Only(ctx)
		if e == nil {
			if existing.State != "pending" || existing.SecretOwnerID != current.User.ID {
				return ErrConflict
			}
			return nil
		}
		if !ent.IsNotFound(e) {
			return e
		}
		_, e = tx.AccountDelivery.Create().SetOrderID(id).SetListingID(row.ListingID).SetBuyerID(row.UserID).SetSecretOwnerID(current.User.ID).SetCreatedAt(s.instant()).SetUpdatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		return s.audit(ctx, tx, current, "handoff_prepared", id)
	})
	if err != nil {
		return SecretView{}, err
	}
	store, err := s.secretStore(s.deliveryPolicy)
	if err != nil {
		return SecretView{}, err
	}
	result, err := store.Put(ctx, p, vault.Scope{Purpose: "account_transfer", ResourceID: id, OwnerID: p.User.ID}, input.Version, input.RequestKey, input.ExpiresAt, input.Value)
	return secretView(result), err
}

// RevealDelivery requires the paid buyer's recent identity and rechecks delivery access inside the vault transaction.
func (s *Store) RevealDelivery(ctx context.Context, p *identity.Principal, id string) ([]byte, error) {
	if err := identity.Require(p, "account"); err != nil {
		return nil, err
	}
	row, err := s.client.AccountDelivery.Query().Where(accountdelivery.OrderIDEQ(id), accountdelivery.BuyerIDEQ(p.User.ID)).Only(ctx)
	if err != nil {
		return nil, err
	}
	store, err := s.secretStore(s.deliveryPolicy)
	if err != nil {
		return nil, err
	}
	return store.RevealForCustomer(ctx, p, vault.Scope{Purpose: "account_transfer", ResourceID: id, OwnerID: row.SecretOwnerID})
}
