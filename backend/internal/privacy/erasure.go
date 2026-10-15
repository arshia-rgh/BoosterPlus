package privacy

import (
	"context"

	"entgo.io/ent/dialect/sql"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authidentity"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authsession"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/availabilitysubscription"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/favorite"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/mediafile"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/notification"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/predicate"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shoprecipient"
)

func (s *Store) erase(ctx context.Context, tx *ent.Tx, target *ent.User) error {
	id := target.ID
	if _, e := tx.User.UpdateOne(target).SetEmail(id + "@deleted.invalid").SetDisplayName("").SetStaffAlias("").SetNotifyUpdates(false).SetSuspended(true).AddAuthVersion(1).SetDeletedAt(s.now()).ClearEmailVerifiedAt().ClearMfaSecret().ClearMfaPending().ClearMfaPendingExpires().ClearMfaRecoveryHashes().SetMfaEnabled(false).Save(ctx); e != nil {
		return e
	}
	if _, e := tx.AuthSession.Update().Where(authsession.UserIDEQ(id)).SetRevokedAt(s.now()).Save(ctx); e != nil {
		return e
	}
	if _, e := tx.AuthIdentity.Delete().Where(authidentity.UserIDEQ(id)).Exec(ctx); e != nil {
		return e
	}
	if _, e := tx.SecretBundle.Update().Where(secretbundle.OwnerIDEQ(id)).SetState(secretbundle.StateDeleted).ClearEncryptedPayload().ClearWrappedKey().SetKeyVersion("").AddVersion(1).SetUpdatedAt(s.now()).Save(ctx); e != nil {
		return e
	}
	if _, e := tx.AvailabilitySubscription.Update().Where(availabilitysubscription.UserIDEQ(id)).SetState("suppressed").SetSuppressionReason("privacy_erasure").SetEmailFingerprint("").AddVersion(1).SetUpdatedAt(s.now()).Save(ctx); e != nil {
		return e
	}
	if _, e := tx.Notification.Update().Where(notification.UserIDEQ(id)).SetEmailState(notification.EmailStateSuppressed).Save(ctx); e != nil {
		return e
	}
	// Recipient values are ordinary delivery data, separate from retained contracts/evidence.
	if _, e := tx.ShopRecipient.Update().Where(shoprecipient.UserIDEQ(id), shoprecipient.ErasedAtIsNil()).SetRecipientValues(map[string]string{}).SetErasedAt(s.now()).AddVersion(1).Save(ctx); e != nil {
		return e
	}
	if _, e := tx.Favorite.Delete().Where(favorite.UserIDEQ(id)).Exec(ctx); e != nil {
		return e
	}
	if _, e := tx.MediaFile.Update().Where(personalMedia(id)).SetState(mediafile.StateDeleted).ClearPurgedAt().SetUpdatedAt(s.now()).Save(ctx); e != nil {
		return e
	}
	// Reviewed privacy erasure is the sole deliberate redaction path for these normally immutable personal fields.
	// Financial agreements, receipts, transfer routes, case evidence and audit history are preserved by the accepted policy.
	commands := []struct {
		query string
		args  []any
	}{
		{"UPDATE auth_messages SET encrypted_payload=NULL WHERE challenge_id IN (SELECT id FROM auth_challenges WHERE user_id=? OR (portal=? AND email=?))", []any{id, target.Portal, target.Email}},
		{"DELETE FROM auth_challenges WHERE user_id=? OR (portal=? AND email=?)", []any{id, target.Portal, target.Email}},
		{"DELETE FROM auth_flows WHERE user_id=?", []any{id}},
		{"UPDATE auth_recoveries SET new_email='',state='redacted',case_reference='' WHERE user_id=?", []any{id}},
		{"UPDATE conversation_messages SET body='[Removed following an approved privacy request]',sender_label='Removed account',attachments=JSON_ARRAY() WHERE sender_id=? AND purpose='message' AND id NOT IN (SELECT message_id FROM case_events WHERE message_id<>'')", []any{id}},
		{"UPDATE secret_bundles SET state='deleted',encrypted_payload=NULL,wrapped_key=NULL,key_version='',version=version+1,updated_at=? WHERE purpose='chat_form' AND resource_id IN (SELECT id FROM conversation_forms WHERE recipient_id=? OR answered_by=?)", []any{s.now(), id, id}},
		{"UPDATE conversation_forms SET answers=JSON_OBJECT(),state='cancelled',version=version+1,updated_at=? WHERE recipient_id=? OR answered_by=?", []any{s.now(), id, id}},
		{"UPDATE conversations SET subject='Archived private conversation' WHERE user_id=?", []any{id}},
		{"UPDATE account_submissions SET title='Archived submission',answers=JSON_OBJECT(),ownership_notes='',current_note='' WHERE user_id=?", []any{id}},
		{"UPDATE submission_events SET message='[Removed following an approved privacy request]' WHERE submission_id IN (SELECT id FROM account_submissions WHERE user_id=?)", []any{id}},
		{"UPDATE fulfillments SET answers=JSON_OBJECT() WHERE order_id IN (SELECT id FROM orders WHERE user_id=?)", []any{id}},
		{"UPDATE orders SET answers=JSON_OBJECT() WHERE user_id=?", []any{id}},
	}
	for _, command := range commands {
		if _, e := tx.ExecContext(ctx, command.query, command.args...); e != nil {
			return e
		}
	}
	return nil
}

// personalMedia excludes immutable proof and explicit case evidence. Its retained
// references remain private; the accepted policy preserves those evidence records.
func personalMedia(id string) predicate.MediaFile {
	return mediafile.And(mediafile.UserIDEQ(id), func(q *sql.Selector) {
		messages := sql.Table("conversation_messages")
		events := sql.Table("case_events")
		protected := sql.Select(messages.C("id")).From(messages).Where(sql.Or(sql.EQ(messages.C("purpose"), "proof"), sql.In(messages.C("id"), sql.Select(events.C("message_id")).From(events).Where(sql.NEQ(events.C("message_id"), "")))))
		q.Where(sql.Or(sql.IsNull(q.C(mediafile.FieldMessageID)), sql.NotIn(q.C(mediafile.FieldMessageID), protected)))
	})
}
