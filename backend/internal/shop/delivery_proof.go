package shop

import (
	"context"
	"encoding/hex"
	"slices"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationmessage"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/mediafile"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// deliveryProof accepts only the assigned staff member's published, scanned
// evidence images in this customer's exact order conversation. The immutable
// proof purpose must already be established when the message is published.
func deliveryProof(ctx context.Context, tx *ent.Tx, row *ent.Order, work *ent.ShopDelivery, id string) error {
	if !validID(id) {
		return ErrInvalid
	}
	message, err := tx.ConversationMessage.Get(ctx, id)
	if ent.IsNotFound(err) {
		return ErrConflict
	}
	if err != nil {
		return err
	}
	if message.SenderID != work.AssignedID || !slices.Contains([]string{identity.RoleAdmin, identity.RoleOwner}, message.SenderRole) || message.Visibility != conversationmessage.VisibilityPublic || len(message.Attachments) < 1 || len(message.Attachments) > 4 {
		return ErrConflict
	}
	thread, err := tx.Conversation.Get(ctx, message.ConversationID)
	if err != nil {
		return err
	}
	if thread.OrderID == nil || *thread.OrderID != row.ID || thread.UserID != row.UserID {
		return ErrConflict
	}
	seen := map[string]bool{}
	for _, id := range message.Attachments {
		if !validID(id) || seen[id] {
			return ErrConflict
		}
		seen[id] = true
		file, e := tx.MediaFile.Get(ctx, id)
		if e != nil {
			return e
		}
		digest, e := hex.DecodeString(file.CleanChecksum)
		if e != nil || len(digest) != 32 || file.CleanSize < 1 || !slices.Contains([]string{"image/png", "image/jpeg", "image/webp"}, file.CleanContentType) || file.State != mediafile.StateReady || file.Visibility != mediafile.VisibilityPublic || file.UserID != work.AssignedID || file.ConversationID != thread.ID || file.MessageID == nil || *file.MessageID != message.ID {
			return ErrConflict
		}
	}
	if message.Purpose != conversationmessage.PurposeProof {
		return ErrConflict
	}
	return nil
}
