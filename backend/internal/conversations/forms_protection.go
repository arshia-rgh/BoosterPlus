package conversations

import (
	"context"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountdelivery"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationform"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

// RevealForm commits a fresh audience check and audit before returning secrets.
func (s *Store) RevealForm(ctx context.Context, p *identity.Principal, conversationID, id string, admin bool) ([]byte, error) {
	if s.keys == nil {
		return nil, vault.ErrUnavailable
	}
	var result []byte
	err := s.auth.AuthorizedTransaction(ctx, p, capability(admin), true, func(tx *ent.Tx, current *identity.Principal) error {
		clear(result)
		result = nil
		thread, row, e := s.formOwned(ctx, tx.Client(), current, conversationID, id, admin)
		if e != nil {
			return e
		}
		if row.State != conversationform.StateAnswered || !row.HasSecure || !row.ExpiresAt.After(s.now()) {
			return ErrConflict
		}
		if e = formOperationalAccess(ctx, tx.Client(), thread, row); e != nil {
			return e
		}
		if row.Purpose == conversationform.PurposeBuyerAccess && !admin {
			var delivered bool
			delivered, e = tx.AccountDelivery.Query().Where(accountdelivery.OrderIDEQ(row.ResourceID), accountdelivery.FormIDEQ(row.ID), accountdelivery.StateIn("delivered", "acknowledged")).Exist(ctx)
			if e != nil {
				return e
			}
			if !delivered {
				return invalid("form", "PLAYORA is preparing this delivery. Access becomes available when delivery is confirmed.")
			}
		}
		bundle, e := tx.SecretBundle.Query().Where(secretbundle.PurposeEQ(secretbundle.PurposeChatForm), secretbundle.ResourceIDEQ(id), secretbundle.OwnerIDEQ(row.AnsweredBy)).Only(ctx)
		if e != nil {
			return e
		}
		if bundle.State != secretbundle.StateActive || !bundle.ExpiresAt.After(s.now()) {
			return ErrConflict
		}
		value, e := s.keys.Open(bundle.ID, vault.Scope{Purpose: "chat_form", ResourceID: id, OwnerID: row.AnsweredBy}, vault.Envelope{KeyID: bundle.KeyVersion, WrappedKey: bundle.WrappedKey, Payload: bundle.EncryptedPayload})
		if e != nil {
			return e
		}
		if e = audit(ctx, tx, current, id, "conversation_form_revealed", s.now()); e != nil {
			clear(value)
			return e
		}
		result = value
		return nil
	})
	if err != nil {
		clear(result)
		return nil, err
	}
	return result, nil
}

// CancelForm withdraws a request or reply and clears its live protected answers.
// Delivered buyer access is resolved through the order's audited delivery flow.
func (s *Store) CancelForm(ctx context.Context, p *identity.Principal, conversationID, id string, version int) (FormView, error) {
	if version < 1 || version >= 2147483646 {
		return FormView{}, ErrConflict
	}
	var result FormView
	err := s.auth.AuthorizedTransaction(ctx, p, "admin", true, func(tx *ent.Tx, current *identity.Principal) error {
		thread, row, e := s.formOwned(ctx, tx.Client(), current, conversationID, id, true)
		if e != nil {
			return e
		}
		if row.State == conversationform.StateCancelled {
			result, e = s.checkedFormView(ctx, tx.Client(), row, thread, current, true, s.now())
			return e
		}
		if row.Version != version {
			return ErrConflict
		}
		if row.Purpose == conversationform.PurposeBuyerAccess {
			var locked bool
			locked, e = tx.AccountDelivery.Query().Where(accountdelivery.FormIDEQ(id), accountdelivery.StateNEQ("pending")).Exist(ctx)
			if e != nil {
				return e
			}
			if locked {
				return invalid("form", "Resolve the delivered order before withdrawing its access.")
			}
		}
		row, e = tx.ConversationForm.UpdateOneID(id).Where(conversationform.VersionEQ(version)).AddVersion(1).SetState(conversationform.StateCancelled).ClearAnswers().SetUpdatedAt(s.now()).Save(ctx)
		if e != nil {
			return e
		}
		_, e = tx.SecretBundle.Update().Where(secretbundle.PurposeEQ(secretbundle.PurposeChatForm), secretbundle.ResourceIDEQ(id), secretbundle.StateEQ(secretbundle.StateActive)).AddVersion(1).SetState(secretbundle.StateDeleted).ClearEncryptedPayload().ClearWrappedKey().SetKeyVersion("").SetUpdatedAt(s.now()).Save(ctx)
		if e != nil {
			return e
		}
		if e = audit(ctx, tx, current, id, "conversation_form_cancelled", s.now()); e != nil {
			return e
		}
		if e = s.formMessage(ctx, tx, current, thread, id, uuid.NewString(), "A form was cancelled.", true); e != nil {
			return e
		}
		result, e = s.checkedFormView(ctx, tx.Client(), row, thread, current, true, s.now())
		return e
	})
	if err != nil {
		return FormView{}, err
	}
	return result, nil
}
