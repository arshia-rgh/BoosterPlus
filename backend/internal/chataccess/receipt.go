// Package chataccess reads protected form receipts without decrypting answers.
package chataccess

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationform"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
)

// Bundle binds an active protected response to its immutable form and respondent.
func Bundle(ctx context.Context, c *ent.Client, id string, now time.Time) (*ent.SecretBundle, error) {
	form, err := c.ConversationForm.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if form.State != conversationform.StateAnswered || !form.HasSecure || !form.ExpiresAt.After(now) {
		return nil, &ent.NotFoundError{}
	}
	return c.SecretBundle.Query().Where(secretbundle.PurposeEQ(secretbundle.PurposeChatForm), secretbundle.ResourceIDEQ(id), secretbundle.OwnerIDEQ(form.AnsweredBy), secretbundle.StateEQ(secretbundle.StateActive), secretbundle.ExpiresAtGT(now)).Only(ctx)
}

// Receipt never treats an ordinary questionnaire as operational access. A booster
// must be explicitly selected on this exact form; reassignment grants no access.
func Receipt(ctx context.Context, c *ent.Client, purpose, resource, respondent, booster string, after, now time.Time) (*ent.ConversationForm, error) {
	q := c.ConversationForm.Query().Where(conversationform.PurposeEQ(conversationform.Purpose(purpose)), conversationform.ResourceIDEQ(resource), conversationform.AnsweredByEQ(respondent), conversationform.StateEQ(conversationform.StateAnswered), conversationform.HasSecureEQ(true), conversationform.ExpiresAtGT(now))
	if !after.IsZero() {
		q.Where(conversationform.AnsweredAtGT(after))
	}
	if booster != "" {
		q.Where(conversationform.Or(conversationform.BoosterIDEQ(booster), conversationform.RecipientIDEQ(booster)))
	}
	forms, err := q.Order(ent.Desc(conversationform.FieldAnsweredAt)).All(ctx)
	if err != nil {
		return nil, err
	}
	for _, form := range forms {
		if _, err = Bundle(ctx, c, form.ID, now); err == nil {
			return form, nil
		}
		if !ent.IsNotFound(err) {
			return nil, err
		}
	}
	return nil, &ent.NotFoundError{}
}
