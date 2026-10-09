package privacy

import (
	"context"
	"encoding/json"

	"entgo.io/ent/dialect/sql"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountsubmission"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/availabilitysubscription"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/booking"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/caseevent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationmessage"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/favorite"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/mediafile"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/moneytransfer"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/notification"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/orderevent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/orderquote"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentreceipt"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/review"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/selleroffer"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/submissionevent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/user"
)

func exportRecord(v any, fields []string) (map[string]any, error) {
	raw, e := json.Marshal(v)
	if e != nil {
		return nil, e
	}
	var source map[string]any
	if e = json.Unmarshal(raw, &source); e != nil {
		return nil, e
	}
	result := map[string]any{}
	for _, field := range fields {
		result[field] = source[field]
	}
	return result, nil
}
func exportRows(ctx context.Context, tx *ent.Tx, userID, section, after string) ([]map[string]any, error) {
	switch section {
	case "profile":
		return exportUser(ctx, tx, userID, after)
	case "orders":
		return exportOrder(ctx, tx, userID, after)
	case "quotes":
		return exportOrderQuote(ctx, tx, userID, after)
	case "contracts":
		return exportOrderContract(ctx, tx, userID, after)
	case "order_events":
		return exportOrderEvent(ctx, tx, userID, after)
	case "submissions":
		return exportAccountSubmission(ctx, tx, userID, after)
	case "offers":
		return exportSellerOffer(ctx, tx, userID, after)
	case "conversations":
		return exportConversation(ctx, tx, userID, after)
	case "messages":
		return exportConversationMessage(ctx, tx, userID, after)
	case "receipts":
		return exportPaymentReceipt(ctx, tx, userID, after)
	case "transfers":
		return exportMoneyTransfer(ctx, tx, userID, after)
	case "reviews":
		return exportReview(ctx, tx, userID, after)
	case "favorites":
		return exportFavorite(ctx, tx, userID, after)
	case "alerts":
		return exportAvailabilitySubscription(ctx, tx, userID, after)
	case "notifications":
		return exportNotification(ctx, tx, userID, after)
	case "cases":
		return exportServiceCase(ctx, tx, userID, after)
	case "bookings":
		return exportBooking(ctx, tx, userID, after)
	case "media":
		return exportMediaFile(ctx, tx, userID, after)
	case "case_events":
		return exportCaseEvent(ctx, tx, userID, after)
	case "submission_events":
		return exportSubmissionEvent(ctx, tx, userID, after)
	case "fulfillment":
		return exportFulfillment(ctx, tx, userID, after)
	default:
		return nil, ErrInvalid
	}
}
func exportUser(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "portal", "email", "display_name", "email_verified_at", "role", "staff_alias", "terms_version", "terms_accepted_at", "notify_updates", "created_at"}
	q := tx.User.Query().Order(ent.Asc(user.FieldID)).Limit(101)
	q.Where(user.IDEQ(userID))
	if after != "" {
		q.Where(user.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
func exportOrder(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "game_name", "slug", "service", "package_key", "variant_key", "kind", "state", "answers", "snapshot", "estimate", "terms_version", "shop_product_id", "shop_snapshot", "created_at", "updated_at"}
	q := tx.Order.Query().Order(ent.Asc(order.FieldID)).Limit(101)
	q.Where(order.UserIDEQ(userID))
	if after != "" {
		q.Where(order.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	if e = exportShopOrders(ctx, tx, userID, rows, out); e != nil {
		return nil, e
	}
	return out, nil
}
func exportOrderQuote(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "order_id", "data", "created_at"}
	q := tx.OrderQuote.Query().Order(ent.Asc(orderquote.FieldID)).Limit(101)
	q.Where(func(s *sql.Selector) {
		parent := sql.Table("orders")
		s.Where(sql.In(s.C("order_id"), sql.Select(parent.C("id")).From(parent).Where(sql.EQ(parent.C("user_id"), userID))))
	})
	if after != "" {
		q.Where(orderquote.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
func exportOrderContract(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "order_id", "data", "payment_state", "created_at"}
	q := tx.OrderContract.Query().Order(ent.Asc(ordercontract.FieldID)).Limit(101)
	q.Where(ordercontract.UserIDEQ(userID))
	if after != "" {
		q.Where(ordercontract.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
func exportOrderEvent(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "order_id", "action", "message", "created_at"}
	q := tx.OrderEvent.Query().Order(ent.Asc(orderevent.FieldID)).Limit(101)
	q.Where(func(s *sql.Selector) {
		parent := sql.Table("orders")
		s.Where(sql.In(s.C("order_id"), sql.Select(parent.C("id")).From(parent).Where(sql.EQ(parent.C("user_id"), userID))))
	})
	if after != "" {
		q.Where(orderevent.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
func exportAccountSubmission(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "game_name", "slug", "title", "state", "answers", "ownership_notes", "ownership_declared", "current_note", "created_at", "updated_at"}
	q := tx.AccountSubmission.Query().Order(ent.Asc(accountsubmission.FieldID)).Limit(101)
	q.Where(accountsubmission.UserIDEQ(userID))
	if after != "" {
		q.Where(accountsubmission.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
func exportSellerOffer(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "submission_id", "data", "state", "expires_at", "accepted_at", "created_at", "updated_at"}
	q := tx.SellerOffer.Query().Order(ent.Asc(selleroffer.FieldID)).Limit(101)
	q.Where(selleroffer.SellerIDEQ(userID))
	if after != "" {
		q.Where(selleroffer.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
func exportConversation(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "kind", "subject", "state", "order_id", "submission_id", "created_at", "public_updated_at"}
	q := tx.Conversation.Query().Order(ent.Asc(conversation.FieldID)).Limit(101)
	q.Where(conversation.UserIDEQ(userID))
	if after != "" {
		q.Where(conversation.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
func exportConversationMessage(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "conversation_id", "sender_role", "sender_label", "body", "attachments", "purpose", "created_at"}
	q := tx.ConversationMessage.Query().Order(ent.Asc(conversationmessage.FieldID)).Limit(101)
	q.Where(func(s *sql.Selector) {
		parent := sql.Table("conversations")
		s.Where(sql.In(s.C("conversation_id"), sql.Select(parent.C("id")).From(parent).Where(sql.EQ(parent.C("user_id"), userID))))
	})
	q.Where(conversationmessage.VisibilityEQ(conversationmessage.VisibilityPublic))
	if after != "" {
		q.Where(conversationmessage.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
func exportPaymentReceipt(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "order_id", "currency", "network", "amount", "state", "created_at", "updated_at"}
	q := tx.PaymentReceipt.Query().Order(ent.Asc(paymentreceipt.FieldID)).Limit(101)
	q.Where(paymentreceipt.UserIDEQ(userID))
	if after != "" {
		q.Where(paymentreceipt.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
func exportMoneyTransfer(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "kind", "order_id", "case_id", "seller_offer_id", "currency", "network", "amount", "terms", "recipient", "recipient_at", "state", "created_at", "updated_at"}
	q := tx.MoneyTransfer.Query().Order(ent.Asc(moneytransfer.FieldID)).Limit(101)
	q.Where(moneytransfer.UserIDEQ(userID))
	if after != "" {
		q.Where(moneytransfer.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
func exportReview(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "order_id", "rating", "body", "state", "response", "created_at", "updated_at"}
	q := tx.Review.Query().Order(ent.Asc(review.FieldID)).Limit(101)
	q.Where(review.UserIDEQ(userID))
	if after != "" {
		q.Where(review.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
func exportFavorite(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "kind", "slug", "service", "package_key", "name", "created_at"}
	q := tx.Favorite.Query().Order(ent.Asc(favorite.FieldID)).Limit(101)
	q.Where(favorite.UserIDEQ(userID))
	if after != "" {
		q.Where(favorite.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
func exportAvailabilitySubscription(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "target_id", "state", "consent_version", "suppression_reason", "created_at", "updated_at"}
	q := tx.AvailabilitySubscription.Query().Order(ent.Asc(availabilitysubscription.FieldID)).Limit(101)
	q.Where(availabilitysubscription.UserIDEQ(userID))
	if after != "" {
		q.Where(availabilitysubscription.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
func exportNotification(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "resource_id", "kind", "read_at", "created_at"}
	q := tx.Notification.Query().Order(ent.Asc(notification.FieldID)).Limit(101)
	q.Where(notification.UserIDEQ(userID))
	if after != "" {
		q.Where(notification.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
func exportServiceCase(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "order_id", "kind", "policy", "state", "outcome", "appeal_until", "created_at", "updated_at"}
	q := tx.ServiceCase.Query().Order(ent.Asc(servicecase.FieldID)).Limit(101)
	q.Where(servicecase.UserIDEQ(userID))
	if after != "" {
		q.Where(servicecase.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
func exportBooking(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "order_id", "state", "starts_at", "ends_at", "created_at", "updated_at"}
	q := tx.Booking.Query().Order(ent.Asc(booking.FieldID)).Limit(101)
	q.Where(func(s *sql.Selector) {
		parent := sql.Table("orders")
		s.Where(sql.In(s.C("order_id"), sql.Select(parent.C("id")).From(parent).Where(sql.EQ(parent.C("user_id"), userID))))
	})
	if after != "" {
		q.Where(booking.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
func exportMediaFile(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "conversation_id", "intake_order_id", "state", "content_type", "size", "created_at", "updated_at", "purged_at"}
	q := tx.MediaFile.Query().Order(ent.Asc(mediafile.FieldID)).Limit(101)
	q.Where(mediafile.UserIDEQ(userID))
	if after != "" {
		q.Where(mediafile.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
func exportCaseEvent(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "case_id", "action", "actor_role", "note", "created_at"}
	q := tx.CaseEvent.Query().Order(ent.Asc(caseevent.FieldID)).Limit(101)
	q.Where(func(s *sql.Selector) {
		parent := sql.Table("service_cases")
		s.Where(sql.In(s.C("case_id"), sql.Select(parent.C("id")).From(parent).Where(sql.EQ(parent.C("user_id"), userID))))
	})
	if after != "" {
		q.Where(caseevent.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
func exportSubmissionEvent(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "submission_id", "action", "state", "message", "actor_role", "created_at"}
	q := tx.SubmissionEvent.Query().Order(ent.Asc(submissionevent.FieldID)).Limit(101)
	q.Where(func(s *sql.Selector) {
		parent := sql.Table("account_submissions")
		s.Where(sql.In(s.C("submission_id"), sql.Select(parent.C("id")).From(parent).Where(sql.EQ(parent.C("user_id"), userID))))
	})
	if after != "" {
		q.Where(submissionevent.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
func exportFulfillment(ctx context.Context, tx *ent.Tx, userID, after string) ([]map[string]any, error) {
	fields := []string{"id", "order_id", "mode", "progress", "completion_pending", "current_note", "estimated_start", "estimated_finish", "forecast", "answers", "created_at", "updated_at"}
	q := tx.Fulfillment.Query().Order(ent.Asc(fulfillment.FieldID)).Limit(101)
	q.Where(func(s *sql.Selector) {
		parent := sql.Table("orders")
		s.Where(sql.In(s.C("order_id"), sql.Select(parent.C("id")).From(parent).Where(sql.EQ(parent.C("user_id"), userID))))
	})
	if after != "" {
		q.Where(fulfillment.IDGT(after))
	}
	rows, e := q.Select(fields...).All(ctx)
	if e != nil {
		return nil, e
	}
	out := []map[string]any{}
	for _, v := range rows {
		record, readErr := exportRecord(v, fields)
		if readErr != nil {
			return nil, readErr
		}
		out = append(out, record)
	}
	return out, nil
}
