package orders

import (
	"context"

	"entgo.io/ent/dialect/sql"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationread"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopdelivery"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// listContext batches accepted prices and unread existence for at most 50 owned
// summaries. Message contents and staff-only cursors never enter the response.
func (s *Store) listContext(ctx context.Context, p *identity.Principal, admin bool, rows []*ent.Order, result *Listing) error {
	if len(rows) == 0 {
		return nil
	}
	ids, contracts := make([]string, 0, len(rows)), make([]string, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.ID)
		if row.CurrentContract != "" {
			contracts = append(contracts, row.CurrentContract)
		}
	}
	assignments := map[string]string{}
	deliveryStates := map[string]string{}
	if admin {
		work, err := s.client.Fulfillment.Query().Where(fulfillment.OrderIDIn(ids...)).Select(fulfillment.FieldOrderID, fulfillment.FieldAssignedID).Limit(50).All(ctx)
		if err != nil {
			return err
		}
		for _, item := range work {
			assignments[item.OrderID] = item.AssignedID
		}
		deliveries, err := s.client.ShopDelivery.Query().Where(shopdelivery.OrderIDIn(ids...)).Limit(50).All(ctx)
		if err != nil {
			return err
		}
		for _, delivery := range deliveries {
			assignments[delivery.OrderID] = delivery.AssignedID
			deliveryStates[delivery.OrderID] = delivery.State
		}

	}
	prices := map[string]*ent.OrderContract{}
	if len(contracts) > 0 {
		records, err := s.client.OrderContract.Query().Where(ordercontract.IDIn(contracts...), ordercontract.OrderIDIn(ids...)).Limit(50).All(ctx)
		if err != nil {
			return err
		}
		for _, record := range records {
			prices[record.ID] = record
		}
	}
	audience, sequence := string(conversationread.AudiencePublic), conversation.FieldPublicSequence
	if admin {
		audience, sequence = string(conversationread.AudienceStaff), conversation.FieldSequence
	}
	unread, err := s.client.Order.Query().Where(order.IDIn(ids...), func(selector *sql.Selector) {
		thread, marker := sql.Table(conversation.Table), sql.Table(conversationread.Table)
		read := sql.Select(marker.C(conversationread.FieldID)).From(marker).Where(sql.And(
			sql.EQ(marker.C(conversationread.FieldUserID), p.User.ID), sql.EQ(marker.C(conversationread.FieldAudience), audience),
			sql.ColumnsEQ(marker.C(conversationread.FieldConversationID), thread.C(conversation.FieldID)),
			sql.ColumnsGTE(marker.C(conversationread.FieldSequence), thread.C(sequence)),
		))
		linked := sql.Select(thread.C(conversation.FieldID)).From(thread).Where(sql.And(
			sql.Or(sql.ColumnsEQ(thread.C(conversation.FieldOrderID), selector.C(order.FieldID)), sql.ColumnsEQ(thread.C(conversation.FieldLinkedOrderID), selector.C(order.FieldID))),
			sql.ColumnsEQ(thread.C(conversation.FieldUserID), selector.C(order.FieldUserID)),
			sql.GT(thread.C(sequence), 0), sql.Not(sql.Exists(read)),
		))
		selector.Where(sql.Exists(linked))
	}).IDs(ctx)
	if err != nil {
		return err
	}
	flags := map[string]bool{}
	for _, id := range unread {
		flags[id] = true
	}
	for _, row := range rows {
		item := summary(row)
		if admin {
			item.Staff = &StaffSummary{DeliveryState: deliveryStates[row.ID], CustomerID: row.UserID, AssignedID: assignments[row.ID], PaymentState: "no_agreement"}
		}
		flag := flags[row.ID]
		item.Unread = &flag
		if row.CurrentContract != "" {
			contract := prices[row.CurrentContract]
			if contract == nil || contract.OrderID != row.ID || contract.UserID != row.UserID {
				return ErrConflict
			}
			price, decodeErr := decode[Commercial](contract.Data)
			if decodeErr != nil {
				return decodeErr
			}
			if item.Staff != nil {
				item.Staff.PaymentState = string(contract.PaymentState)
			}
			item.AcceptedPrice = &ListPrice{Currency: price.Currency, AmountMinor: price.AmountMinor}
		}
		result.Orders = append(result.Orders, item)
	}
	return nil
}
