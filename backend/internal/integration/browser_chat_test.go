//go:build integration && browsertest

package integration

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationmessage"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationread"
)

// seedBrowserChat creates historical synthetic content only in the disposable
// browser database. New sends still use the authenticated, rate-limited API.
func seedBrowserChat(t *testing.T, f *authFixture, fixtures map[string]string) {
	t.Helper()
	ctx := t.Context()
	for _, project := range []string{"desktop", "mobile"} {
		buyer, staff := fixtures[project+"_supportbuyer_id"], fixtures[project+"_supportadmin_id"]
		thread, err := f.client.Conversation.Create().SetUserID(buyer).SetKind(conversation.KindPresales).
			SetSubject("A longer conversation about your Mobile Legends goals and preferred play schedule").
			SetState(conversation.StateWaiting).SetRequestKey(uuid.NewString()).SetRequestHash("synthetic-chat-history").
			SetCreatedBy(buyer).SetSequence(125).SetPublicSequence(120).SetVersion(126).SetPublicVersion(121).Save(ctx)
		if err != nil {
			t.Fatal(err)
		}
		fixtures[project+"_chat_history"] = thread.ID
		start := time.Now().UTC().Add(-125 * time.Hour)
		for i := 1; i <= 125; i++ {
			body := fmt.Sprintf("History message %03d\n%s", i, strings.Repeat("Clear coordination for the next session. ", 3))
			if i == 80 {
				body += "\nhttps://example.test/" + strings.Repeat("long-reference", 60)
			}
			sender, role, label := buyer, "customer", "Customer"
			if i%2 == 0 || i > 120 {
				sender, role, label = staff, "administrator", "PLAYORA support"
			}
			builder := f.client.ConversationMessage.Create().SetConversationID(thread.ID).SetSenderID(sender).
				SetSenderRole(role).SetSenderLabel(label).SetSequence(i).SetRequestKey(uuid.NewString()).
				SetRequestHash("synthetic-chat-history").SetCreatedAt(start.Add(time.Duration(i) * time.Hour))
			if i <= 120 {
				builder.SetVisibility(conversationmessage.VisibilityPublic).SetPublicSequence(i).SetBody(body)
			} else {
				builder.SetVisibility(conversationmessage.VisibilityInternal).SetBody("Internal history fixture: staff only")
			}
			if _, err = builder.Save(ctx); err != nil {
				t.Fatal(err)
			}
		}
		if _, err = f.client.ConversationRead.Create().SetConversationID(thread.ID).SetUserID(buyer).
			SetAudience(conversationread.AudiencePublic).SetSequence(120).Save(ctx); err != nil {
			t.Fatal(err)
		}
	}
}
