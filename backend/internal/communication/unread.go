package communication

import (
	"context"

	"entgo.io/ent/dialect/sql"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationmessage"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationread"
)

// unreadMessage considers only other senders after this audience's read marker.
// Sending never advances that marker: earlier incoming messages may still be unseen.
func unreadMessage(column func(string) string, userID string, staff bool) *sql.Predicate {
	sequence, audience := conversationmessage.FieldPublicSequence, string(conversationread.AudiencePublic)
	if staff {
		sequence, audience = conversationmessage.FieldSequence, string(conversationread.AudienceStaff)
	}
	marker := sql.Table(conversationread.Table)
	read := sql.Select(marker.C(conversationread.FieldID)).From(marker).Where(sql.And(
		sql.EQ(marker.C(conversationread.FieldUserID), userID),
		sql.EQ(marker.C(conversationread.FieldAudience), audience),
		sql.ColumnsEQ(marker.C(conversationread.FieldConversationID), column(conversationmessage.FieldConversationID)),
		sql.ColumnsGTE(marker.C(conversationread.FieldSequence), column(sequence)),
	))
	where := sql.And(sql.NEQ(column(conversationmessage.FieldSenderID), userID), sql.NotExists(read))
	if !staff {
		where = sql.And(where, sql.EQ(column(conversationmessage.FieldVisibility), string(conversationmessage.VisibilityPublic)))
	}
	return where
}

// HasUnread scopes existence before pagination without exposing bodies or sender IDs.
// The outer query must already enforce the reader's conversation membership.
func HasUnread(threadColumn, userID string, staff bool) *sql.Predicate {
	message := sql.Table(conversationmessage.Table)
	unread := sql.Select(message.C(conversationmessage.FieldID)).From(message).Where(sql.And(
		sql.ColumnsEQ(message.C(conversationmessage.FieldConversationID), threadColumn),
		unreadMessage(message.C, userID, staff),
	))
	return sql.Exists(unread)
}

// Unread returns the count and first visible incoming sequence in one snapshot.
// Read markers and message sequences remain audience-specific and unchanged.
func Unread(ctx context.Context, client *ent.Client, threadID, userID string, staff bool) (int, int, error) {
	sequence := conversationmessage.FieldPublicSequence
	if staff {
		sequence = conversationmessage.FieldSequence
	}
	var counts []struct {
		Count int  `json:"count"`
		First *int `json:"first_sequence"`
	}
	err := client.ConversationMessage.Query().Where(conversationmessage.ConversationIDEQ(threadID), func(selector *sql.Selector) {
		selector.Where(unreadMessage(selector.C, userID, staff))
	}).Aggregate(ent.Count(), ent.As(ent.Min(sequence), "first_sequence")).Scan(ctx, &counts)
	if err != nil {
		return 0, 0, err
	}
	if len(counts) == 0 || counts[0].First == nil {
		return 0, 0, nil
	}
	return counts[0].Count, *counts[0].First, nil
}
