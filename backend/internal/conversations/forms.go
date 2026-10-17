package conversations

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountdelivery"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationform"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationmessage"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

func formView(row *ent.ConversationForm, thread *ent.Conversation, p *identity.Principal, admin bool, now time.Time) (FormView, error) {
	fields, err := fieldsFrom(row)
	if err != nil {
		return FormView{}, err
	}
	state := string(row.State)
	if state != "cancelled" && !row.ExpiresAt.After(now) {
		state = "expired"
	}
	to := "Customer"
	if thread.Kind == conversation.KindSubmission {
		to = "Seller"
	}
	if row.RecipientID != thread.UserID {
		to = "Assigned booster"
	}
	audience := "Recipient and PLAYORA staff"
	if row.BoosterID != "" {
		audience = "Customer, selected booster and PLAYORA staff"
	}
	answers := map[string]string{}
	if state == "answered" {
		for _, field := range fields {
			if !field.Secure {
				answers[field.Key] = row.Answers[field.Key]
			}
		}
	}
	return FormView{ID: row.ID, Version: row.Version, Title: row.Title, Description: row.Description, Mode: string(row.Mode), Purpose: string(row.Purpose), Recipient: to, Audience: audience, State: state, Fields: fields, Answers: answers, HasSecure: row.HasSecure, CanRespond: !admin && row.RecipientID == p.User.ID && row.Mode == conversationform.ModeRequest && state == "open", CanReveal: row.HasSecure && state == "answered", CanCancel: admin && state != "cancelled" && state != "expired", ExpiresAt: row.ExpiresAt, AnsweredAt: row.AnsweredAt}, nil
}

// Form returns the definition and ordinary answers to currently allowed members.
func (s *Store) Form(ctx context.Context, p *identity.Principal, conversationID, id string, admin bool) (FormView, error) {
	var result FormView
	err := s.auth.AuthorizedTransaction(ctx, p, capability(admin), false, func(tx *ent.Tx, current *identity.Principal) error {
		thread, row, e := s.formOwned(ctx, tx.Client(), current, conversationID, id, admin)
		if e != nil {
			return e
		}
		result, e = s.checkedFormView(ctx, tx.Client(), row, thread, current, admin, s.now())
		return e
	})
	return result, err
}

// CreateForm creates a request or explicit delivery and a reference-only message atomically.
func (s *Store) CreateForm(ctx context.Context, p *identity.Principal, id string, in FormCreate) (FormView, error) {
	secure, err := validateForm(in, s.now())
	if err != nil {
		return FormView{}, err
	}
	if secure && s.keys == nil {
		return FormView{}, vault.ErrUnavailable
	}
	raw, err := json.Marshal(in)
	if err != nil {
		return FormView{}, err
	}
	defer clear(raw)
	digest := s.auth.RequestDigest("chat-form-create", raw)
	fields, err := fieldsDocument(in.Fields)
	if err != nil {
		return FormView{}, err
	}
	var ordinary, secrets map[string]string
	if in.Mode == "share" {
		ordinary, secrets, err = splitAnswers(in.Fields, in.Answers)
		if err != nil {
			return FormView{}, err
		}
	}
	var result FormView
	err = s.auth.AuthorizedTransaction(ctx, p, "admin", secure, func(tx *ent.Tx, current *identity.Principal) error {
		thread, e := owned(ctx, tx.Client(), current, id, true)
		if e != nil {
			return e
		}
		existing, e := tx.ConversationForm.Query().Where(conversationform.ConversationIDEQ(id), conversationform.CreatedByEQ(current.User.ID), conversationform.RequestKeyEQ(in.RequestKey)).Only(ctx)
		if e == nil {
			if existing.RequestHash != digest {
				return ErrConflict
			}
			result, e = s.checkedFormView(ctx, tx.Client(), existing, thread, current, true, s.now())
			return e
		}
		if !ent.IsNotFound(e) {
			return e
		}
		if thread.State == conversation.StateResolved {
			return invalid("conversation", "Reopen this conversation before sending a form.")
		}
		recipient, booster, e := formRecipient(ctx, tx.Client(), thread, in)
		if e != nil {
			return e
		}
		resource, e := formResource(ctx, tx.Client(), thread, in, s.now())
		if e != nil {
			return e
		}
		if in.Purpose != "information" && in.Mode == "share" && !nonemptySecure(secrets) {
			return invalid("answers", "Enter the secure access details before sending.")
		}
		now := s.now().UTC()
		create := tx.ConversationForm.Create().SetConversationID(id).SetCreatedBy(current.User.ID).SetRecipientID(recipient).SetBoosterID(booster).SetMode(conversationform.Mode(in.Mode)).SetPurpose(conversationform.Purpose(in.Purpose)).SetResourceID(resource).SetTitle(in.Title).SetDescription(in.Description).SetFields(fields).SetHasSecure(secure).SetRequestKey(in.RequestKey).SetRequestHash(digest).SetExpiresAt(in.ExpiresAt).SetCreatedAt(now).SetUpdatedAt(now)
		if in.Mode == "share" {
			create.SetState(conversationform.StateAnswered).SetAnswers(ordinary).SetAnsweredBy(current.User.ID).SetAnsweredAt(now).SetResponseKey(in.RequestKey).SetResponseHash(digest)
		}
		row, e := create.Save(ctx)
		if e != nil {
			return e
		}
		if in.Mode == "share" {
			if secure {
				if e = s.storeFormSecrets(ctx, tx, current, row, secrets); e != nil {
					return e
				}
			}
			if in.Purpose == "buyer_access" {
				if e = prepareFormDelivery(ctx, tx, current, row, thread); e != nil {
					return e
				}
			}
		}
		body := "A form is ready to complete."
		if in.Mode == "share" {
			body = "Private details are ready to view."
		}
		if e = s.formMessage(ctx, tx, current, thread, row.ID, in.RequestKey, body, false); e != nil {
			return e
		}
		if e = audit(ctx, tx, current, row.ID, "conversation_form_created", now); e != nil {
			return e
		}
		result, e = s.checkedFormView(ctx, tx.Client(), row, thread, current, true, now)
		return e
	})
	if err != nil {
		return FormView{}, err
	}
	return result, nil
}
func nonemptySecure(values map[string]string) bool {
	for _, v := range values {
		if text(v, 1, 2000) {
			return true
		}
	}
	return false
}

// ReplyForm accepts exactly one response, with safe idempotent retry after transport loss.
func (s *Store) ReplyForm(ctx context.Context, p *identity.Principal, conversationID, id string, in FormReply) (FormView, error) {
	if !canonicalID(in.RequestKey) || in.Version < 1 || in.Version >= 2147483646 {
		return FormView{}, invalid("request", "Reload the form before replying.")
	}
	raw, err := json.Marshal(in)
	if err != nil {
		return FormView{}, err
	}
	defer clear(raw)
	digest := s.auth.RequestDigest("chat-form-reply", raw)
	var result FormView
	// All replies use the same contextual fresh-factor protection, even when a
	// caller mislabels their input. The actual form is loaded inside this fence.
	err = s.auth.AuthorizedTransaction(ctx, p, "self", true, func(tx *ent.Tx, current *identity.Principal) error {
		thread, row, e := s.formOwned(ctx, tx.Client(), current, conversationID, id, false)
		if e != nil {
			return e
		}
		if row.Mode != conversationform.ModeRequest || row.RecipientID != current.User.ID {
			return identity.ErrForbidden
		}
		if row.ResponseKey == in.RequestKey {
			if row.ResponseHash != digest || row.State != conversationform.StateAnswered {
				return ErrConflict
			}
			result, e = s.checkedFormView(ctx, tx.Client(), row, thread, current, false, s.now())
			return e
		}
		if row.State != conversationform.StateOpen || row.Version != in.Version || !row.ExpiresAt.After(s.now()) {
			return ErrConflict
		}
		if thread.State == conversation.StateResolved {
			return invalid("conversation", "Ask support to reopen this conversation before replying.")
		}
		if e = formOperationalAccess(ctx, tx.Client(), thread, row); e != nil {
			return e
		}
		fields, e := fieldsFrom(row)
		if e != nil {
			return e
		}
		ordinary, secrets, e := splitAnswers(fields, in.Answers)
		if e != nil {
			return e
		}
		if row.Purpose != conversationform.PurposeInformation && !nonemptySecure(secrets) {
			return invalid("answers", "Enter the requested secure access details.")
		}
		now := s.now().UTC()
		row, e = tx.ConversationForm.UpdateOneID(id).Where(conversationform.VersionEQ(in.Version), conversationform.StateEQ(conversationform.StateOpen)).AddVersion(1).SetState(conversationform.StateAnswered).SetAnswers(ordinary).SetResponseKey(in.RequestKey).SetResponseHash(digest).SetAnsweredBy(current.User.ID).SetAnsweredAt(now).SetUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		if row.HasSecure {
			if e = s.storeFormSecrets(ctx, tx, current, row, secrets); e != nil {
				return e
			}
		}
		if e = s.formMessage(ctx, tx, current, thread, row.ID, in.RequestKey, "Form response received.", true); e != nil {
			return e
		}
		if e = audit(ctx, tx, current, row.ID, "conversation_form_answered", now); e != nil {
			return e
		}
		result, e = s.checkedFormView(ctx, tx.Client(), row, thread, current, false, now)
		return e
	})
	if err != nil {
		return FormView{}, err
	}
	return result, nil
}

func (s *Store) storeFormSecrets(ctx context.Context, tx *ent.Tx, p *identity.Principal, row *ent.ConversationForm, values map[string]string) error {
	if s.keys == nil {
		return vault.ErrUnavailable
	}
	raw, err := json.Marshal(values)
	if err != nil {
		return err
	}
	defer clear(raw)
	id := uuid.NewString()
	scope := vault.Scope{Purpose: "chat_form", ResourceID: row.ID, OwnerID: p.User.ID}
	envelope, err := s.keys.Seal(id, scope, raw)
	if err != nil {
		return err
	}
	_, err = tx.SecretBundle.Create().SetID(id).SetPurpose(secretbundle.PurposeChatForm).SetResourceID(row.ID).SetOwnerID(p.User.ID).SetKeyVersion(envelope.KeyID).SetWrappedKey(envelope.WrappedKey).SetEncryptedPayload(envelope.Payload).SetRequestKey(row.ResponseKey).SetRequestHash(row.ResponseHash).SetExpiresAt(row.ExpiresAt).SetCreatedAt(s.now()).SetUpdatedAt(s.now()).Save(ctx)
	if err != nil {
		return err
	}
	return audit(ctx, tx, p, id, "vault_written", s.now())
}

func prepareFormDelivery(ctx context.Context, tx *ent.Tx, p *identity.Principal, row *ent.ConversationForm, thread *ent.Conversation) error {
	existing, err := tx.AccountDelivery.Query().Where(accountdelivery.OrderIDEQ(row.ResourceID)).Only(ctx)
	if ent.IsNotFound(err) {
		purchase, e := tx.Order.Get(ctx, row.ResourceID)
		if e != nil {
			return e
		}
		_, err = tx.AccountDelivery.Create().SetOrderID(row.ResourceID).SetListingID(purchase.ListingID).SetBuyerID(thread.UserID).SetSecretOwnerID(p.User.ID).SetFormID(row.ID).SetCreatedAt(row.CreatedAt).SetUpdatedAt(row.CreatedAt).Save(ctx)
		return err
	}
	if err != nil {
		return err
	}
	if existing.State != "pending" {
		return invalid("purpose", "This order already has delivered access. Resolve its delivery before replacing it.")
	}
	// An existing active delivery is never silently replaced by another form.
	if existing.SecretOwnerID != p.User.ID {
		return identity.ErrForbidden
	}
	if existing.FormID == "" {
		active, e := tx.SecretBundle.Query().Where(secretbundle.PurposeEQ(secretbundle.PurposeAccountTransfer), secretbundle.ResourceIDEQ(row.ResourceID), secretbundle.StateEQ(secretbundle.StateActive)).Exist(ctx)
		if e != nil {
			return e
		}
		if active {
			return invalid("purpose", "Revoke the previous pending delivery through its takeover action before replacing it.")
		}
	}
	if existing.FormID != "" {
		previous, e := tx.ConversationForm.Get(ctx, existing.FormID)
		if e != nil {
			return e
		}
		if previous.State != conversationform.StateCancelled {
			return invalid("purpose", "Cancel the previous delivery form before sending a replacement.")
		}
	}
	_, err = tx.AccountDelivery.UpdateOneID(existing.ID).SetFormID(row.ID).SetSecretOwnerID(p.User.ID).SetSecretVersion(0).AddVersion(1).SetUpdatedAt(row.CreatedAt).Save(ctx)
	return err
}

func (s *Store) formMessage(ctx context.Context, tx *ent.Tx, p *identity.Principal, thread *ent.Conversation, id, key, body string, reply bool) error {
	if thread.Version >= 2147483646 || thread.Sequence >= 2147483646 {
		return ErrConflict
	}
	label, role := "Customer", "customer"
	admin := p.Session.Portal == string(identity.PortalAdmin)
	if p.User.ID != thread.UserID {
		label = staffLabel(p.User.Role, p.User.StaffAlias)
		role = p.User.Role
	}
	purpose := conversationmessage.PurposeForm
	if reply {
		purpose = conversationmessage.PurposeFormReply
	}
	message, err := tx.ConversationMessage.Create().SetConversationID(thread.ID).SetSenderID(p.User.ID).SetSenderLabel(label).SetSenderRole(role).SetVisibility(conversationmessage.VisibilityPublic).SetSequence(thread.Sequence + 1).SetPublicSequence(thread.PublicSequence + 1).SetPurpose(purpose).SetFormID(id).SetBody(body).SetRequestKey(key).SetRequestHash(s.auth.RequestDigest("chat-form-event", []byte(id+":"+body))).SetCreatedAt(s.now()).Save(ctx)
	if err != nil {
		return err
	}
	next := conversation.StateWaiting
	if !admin {
		next = conversation.StateOpen
	}
	count, err := tx.Conversation.Update().Where(conversation.IDEQ(thread.ID), conversation.VersionEQ(thread.Version)).AddVersion(1).AddPublicVersion(1).AddSequence(1).AddPublicSequence(1).SetState(next).SetUpdatedAt(s.now()).SetPublicUpdatedAt(s.now()).Save(ctx)
	if err != nil {
		return err
	}
	if count != 1 {
		return ErrConflict
	}
	return s.notifyMessage(ctx, tx, p, thread, message, admin)
}
