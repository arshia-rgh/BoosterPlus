package fulfillment

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/chataccess"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

func (s *Store) secretPolicy(ctx context.Context, tx *ent.Tx, p *identity.Principal, scope vault.Scope, operation vault.Operation) error {
	if scope.Purpose != "game_access" {
		return identity.ErrForbidden
	}
	row, err := tx.Order.Get(ctx, scope.ResourceID)
	if err != nil {
		return err
	}
	if row.UserID != scope.OwnerID {
		return identity.ErrForbidden
	}
	work, err := record(ctx, tx.Client(), row.ID)
	if err != nil {
		return err
	}
	if work.Mode != "account" {
		return identity.ErrForbidden
	}
	if operation == vault.Revoke || operation == vault.Inspect {
		if p.User.ID == row.UserID {
			return identity.Require(p, "account")
		}
		return identity.Require(p, "admin")
	}
	if _, err = paid(ctx, tx.Client(), scope.ResourceID); err != nil {
		return err
	}
	if !active(row) {
		return identity.ErrForbidden
	}
	if operation == vault.Write {
		if p.User.ID != row.UserID {
			return identity.ErrForbidden
		}
		return nil
	}
	if operation == vault.Rotate {
		return identity.Require(p, "owner")
	}
	if operation == vault.Reveal {
		blocked, e := tx.ServiceCase.Query().Where(servicecase.ActiveOrderIDEQ(row.ID)).Exist(ctx)
		if e != nil {
			return e
		}
		if blocked {
			return identity.ErrForbidden
		}
		if identity.Require(p, "admin") == nil {
			return nil
		}
		if p.User.ID == work.AssignedID {
			return identity.Require(p, "booster")
		}
	}
	return identity.ErrForbidden
}
func (s *Store) revokeInTx(ctx context.Context, tx *ent.Tx, p *identity.Principal, row *ent.Order, reason string) error {
	if err := chataccess.Revoke(ctx, tx, row.ID, "game_access", p.User.ID, reason, s.now()); err != nil {
		return err
	}
	bundle, err := tx.SecretBundle.Query().Where(secretbundle.PurposeEQ(secretbundle.PurposeGameAccess), secretbundle.ResourceIDEQ(row.ID), secretbundle.OwnerIDEQ(row.UserID), secretbundle.StateEQ(secretbundle.StateActive)).Only(ctx)
	if ent.IsNotFound(err) {
		return nil
	}
	if err != nil {
		return err
	}
	// Conditional update also fences the independent expiry maintenance worker.
	count, err := tx.SecretBundle.Update().Where(secretbundle.IDEQ(bundle.ID), secretbundle.VersionEQ(bundle.Version), secretbundle.StateEQ(secretbundle.StateActive)).AddVersion(1).ClearWrappedKey().ClearEncryptedPayload().SetKeyVersion("").SetState(secretbundle.StateDeleted).SetUpdatedAt(s.now()).Save(ctx)
	if err != nil {
		return err
	}
	if count == 1 {
		_, err = tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(p.User.ID).SetAction("vault_" + reason).SetTargetID(bundle.ID).SetMetadata(map[string]string{}).SetCreatedAt(s.now()).Save(ctx)
	}
	return err
}

// SecretInput binds sensitive handoff to the observed assignment and vault version.
type SecretInput struct {
	Version     int       `json:"version"`
	WorkVersion int       `json:"work_version"`
	RequestKey  string    `json:"request_key"`
	Value       []byte    `json:"value"`
	ExpiresAt   time.Time `json:"expires_at"`
}

// SecretView reports lifecycle metadata only; customers never read back plaintext.
type SecretView struct {
	Version   int        `json:"version"`
	State     string     `json:"state"`
	ExpiresAt *time.Time `json:"expires_at"`
}

func secretView(value vault.View) SecretView {
	return SecretView{value.Version, value.State, &value.ExpiresAt}
}

// SecretStatus performs fresh resource checks before returning metadata.
func (s *Store) SecretStatus(ctx context.Context, p *identity.Principal, id string) (SecretView, error) {
	if err := identity.Require(p, "account"); err != nil {
		return SecretView{}, err
	}
	value, err := s.secrets.Status(ctx, p, vault.Scope{Purpose: "game_access", ResourceID: id, OwnerID: p.User.ID})
	if ent.IsNotFound(err) {
		return SecretView{State: "missing"}, nil
	}
	return secretView(value), err
}

// SubmitSecret gives the resource policy authority over assignment and expiry.
func (s *Store) SubmitSecret(ctx context.Context, p *identity.Principal, id string, input SecretInput) (SecretView, error) {
	defer clear(input.Value)
	if err := identity.Require(p, "account"); err != nil {
		return SecretView{}, err
	}
	bound, err := vault.New(s.client, s.auth, s.keys, func(ctx context.Context, tx *ent.Tx, current *identity.Principal, scope vault.Scope, operation vault.Operation) error {
		work, e := record(ctx, tx.Client(), id)
		if e != nil {
			return e
		}
		if work.Version != input.WorkVersion {
			return ErrConflict
		}
		row, e := tx.Order.Get(ctx, id)
		if e != nil {
			return e
		}
		_, service, _, e := definition(row)
		if e != nil {
			return e
		}
		hours := service.Fulfillment.SecretHours
		if hours < 1 || hours > 720 || input.ExpiresAt.After(s.now().Add(time.Duration(hours)*time.Hour)) {
			return ErrInvalid
		}
		return s.secretPolicy(ctx, tx, current, scope, operation)
	}, s.now)
	if err != nil {
		return SecretView{}, err
	}
	// An explicit expiry keeps retries stable and cannot extend the service policy.
	result, err := bound.Put(ctx, p, vault.Scope{Purpose: "game_access", ResourceID: id, OwnerID: p.User.ID}, input.Version, input.RequestKey, input.ExpiresAt, input.Value)
	return secretView(result), err
}

// RevokeSecret immediately removes live game access for this customer's order.
func (s *Store) RevokeSecret(ctx context.Context, p *identity.Principal, id string, version int) error {
	if err := identity.Require(p, "account"); err != nil {
		return err
	}
	return s.secrets.Revoke(ctx, p, vault.Scope{Purpose: "game_access", ResourceID: id, OwnerID: p.User.ID}, version)
}

// RevealSecret is an explicit staff action with recent primary and authenticator checks.
func (s *Store) RevealSecret(ctx context.Context, p *identity.Principal, id, audience string) ([]byte, error) {
	// The owner is determined from SQL, never caller-selected. The vault rechecks
	// the paid resource and assignment in its own fenced, audited transaction.
	row, err := s.client.Order.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	bound, err := vault.New(s.client, s.auth, s.keys, func(ctx context.Context, tx *ent.Tx, current *identity.Principal, scope vault.Scope, operation vault.Operation) error {
		work, e := record(ctx, tx.Client(), id)
		if e != nil {
			return e
		}
		if e = identity.Require(current, audience); e != nil {
			return e
		}
		if audience == "booster" && work.AssignedID != current.User.ID {
			return identity.ErrForbidden
		}
		if audience != "booster" && audience != "admin" {
			return identity.ErrForbidden
		}
		return s.secretPolicy(ctx, tx, current, scope, operation)
	}, s.now)
	if err != nil {
		return nil, err
	}
	return bound.RevealForStaff(ctx, p, vault.Scope{Purpose: "game_access", ResourceID: id, OwnerID: row.UserID})
}
