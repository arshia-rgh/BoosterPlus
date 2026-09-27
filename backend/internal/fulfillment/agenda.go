package fulfillment

import (
	"context"
	"time"

	"entgo.io/ent/dialect/sql"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/booking"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// AgendaItem exposes session timing and an assignment reference, never other customers or notes.
type AgendaItem struct {
	ID       string    `json:"id"`
	OrderID  string    `json:"order_id"`
	Game     string    `json:"game"`
	StartsAt time.Time `json:"starts_at"`
	EndsAt   time.Time `json:"ends_at"`
	Timezone string    `json:"timezone"`
	State    string    `json:"state"`
}

// AgendaListing pages only the current booster's future proposed or confirmed sessions.
type AgendaListing struct {
	Items []AgendaItem `json:"items"`
	Next  string       `json:"next"`
}

// Agenda rechecks assignment, paid current contract and session authority together.
func (s *Store) Agenda(ctx context.Context, p *identity.Principal, cursor, state string) (AgendaListing, error) {
	result := AgendaListing{Items: []AgendaItem{}}
	if state != "" && state != "confirmed" && state != "proposed" {
		return result, ErrInvalid
	}
	err := s.auth.AuthorizedTransaction(ctx, p, "booster", false, func(tx *ent.Tx, current *identity.Principal) error {
		result = AgendaListing{Items: []AgendaItem{}}
		q := tx.Booking.Query().Where(booking.AssignedIDEQ(current.User.ID), booking.EndsAtGT(s.now()), booking.StateIn(booking.StateProposed, booking.StateConfirmed)).Order(ent.Asc(booking.FieldStartsAt), ent.Asc(booking.FieldID)).Limit(51)
		if state != "" {
			q.Where(booking.StateEQ(booking.State(state)))
		}
		q.Where(func(selector *sql.Selector) {
			work := sql.Table(fulfillment.Table)
			orders := sql.Table(order.Table)
			contract := sql.Table(ordercontract.Table)
			permitted := sql.Select(work.C(fulfillment.FieldID)).From(work).Join(orders).On(work.C(fulfillment.FieldOrderID), orders.C(order.FieldID)).Join(contract).On(contract.C(ordercontract.FieldID), orders.C(order.FieldCurrentContract)).Where(sql.And(
				sql.ColumnsEQ(work.C(fulfillment.FieldOrderID), selector.C(booking.FieldOrderID)), sql.EQ(work.C(fulfillment.FieldAssignedID), current.User.ID),
				sql.EQ(work.C(fulfillment.FieldMode), string(fulfillment.ModeTogether)), sql.In(orders.C(order.FieldState), string(order.StateQueued), string(order.StateInProgress), string(order.StateOnHold)),
				sql.ColumnsEQ(contract.C(ordercontract.FieldOrderID), orders.C(order.FieldID)), sql.ColumnsEQ(contract.C(ordercontract.FieldActiveOrderID), orders.C(order.FieldID)), sql.ColumnsEQ(contract.C(ordercontract.FieldUserID), orders.C(order.FieldUserID)), sql.EQ(contract.C(ordercontract.FieldPaymentState), string(ordercontract.PaymentStateSettled)),
			))
			selector.Where(sql.Exists(permitted))
		})
		if cursor != "" {
			at, id, e := cursorPair(cursor)
			if e != nil {
				return e
			}
			q.Where(booking.Or(booking.StartsAtGT(at), booking.And(booking.StartsAtEQ(at), booking.IDGT(id))))
		}
		rows, e := q.All(ctx)
		if e != nil {
			return e
		}
		if len(rows) > 50 {
			last := rows[49]
			result.Next = nextCursor(last.StartsAt, last.ID)
			rows = rows[:50]
		}
		for _, row := range rows {
			record, e := tx.Order.Get(ctx, row.OrderID)
			if e != nil {
				return e
			}
			result.Items = append(result.Items, AgendaItem{row.ID, row.OrderID, record.GameName, row.StartsAt, row.EndsAt, row.Timezone, string(row.State)})
		}
		return nil
	})
	return result, err
}
