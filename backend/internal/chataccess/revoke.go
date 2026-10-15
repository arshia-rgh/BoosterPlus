package chataccess

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationform"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
)

// Revoke retires operational forms inside the caller's authorized transaction.
// Completion and reassignment must clear the new envelopes as well as legacy ones.
func Revoke(ctx context.Context, tx *ent.Tx, resource, purpose, actor, reason string, now time.Time) error {
	rows, err := tx.ConversationForm.Query().Where(conversationform.ResourceIDEQ(resource), conversationform.PurposeEQ(conversationform.Purpose(purpose)), conversationform.StateNEQ(conversationform.StateCancelled)).All(ctx)
	if err != nil {
		return err
	}
	for _, row := range rows {
		if _, err = tx.ConversationForm.UpdateOneID(row.ID).Where(conversationform.VersionEQ(row.Version)).AddVersion(1).SetState(conversationform.StateCancelled).ClearAnswers().SetUpdatedAt(now).Save(ctx); err != nil {
			return err
		}
		if _, err = tx.SecretBundle.Update().Where(secretbundle.PurposeEQ(secretbundle.PurposeChatForm), secretbundle.ResourceIDEQ(row.ID)).AddVersion(1).SetState(secretbundle.StateDeleted).ClearEncryptedPayload().ClearWrappedKey().SetKeyVersion("").SetUpdatedAt(now).Save(ctx); err != nil {
			return err
		}
		if _, err = tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(actor).SetTargetID(row.ID).SetAction("conversation_form_" + reason).SetMetadata(map[string]string{}).SetCreatedAt(now).Save(ctx); err != nil {
			return err
		}
	}
	return nil
}
