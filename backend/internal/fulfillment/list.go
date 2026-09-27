package fulfillment

import (
	"context"
	"encoding/base64"
	"slices"
	"strings"
	"time"

	"entgo.io/ent/dialect/sql"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/booking"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Listing is bounded and excludes other boosters' work at the SQL query boundary.
type Listing struct {
	Items []View `json:"items"`
	Next  string `json:"next"`
}

// ListFilters applies bounded discovery before cursor pagination.
type ListFilters struct{ After, Search, State string }

// List preserves the existing chronological listing contract.
func (s *Store) List(ctx context.Context, p *identity.Principal, audience, cursor string) (Listing, error) {
	return s.ListFiltered(ctx, p, audience, ListFilters{After: cursor})
}

// ListFiltered restricts discovery to the caller's current assignment audience.
func (s *Store) ListFiltered(ctx context.Context, p *identity.Principal, audience string, filters ListFilters) (Listing, error) {
	cursor := filters.After
	search := strings.TrimSpace(filters.Search)
	result := Listing{Items: []View{}}
	if audience != "admin" && audience != "booster" {
		return result, identity.ErrForbidden
	}
	if !bounded(filters.Search, 0, 160) || !slices.Contains([]string{"", "active", "queued", "in_progress", "on_hold", "review", "completed"}, filters.State) {
		return result, ErrInvalid
	}
	err := s.auth.AuthorizedTransaction(ctx, p, audience, false, func(tx *ent.Tx, current *identity.Principal) error {
		result = Listing{Items: []View{}}
		q := tx.Fulfillment.Query().Order(ent.Desc(fulfillment.FieldUpdatedAt), ent.Desc(fulfillment.FieldID)).Limit(51)
		if audience == "booster" {
			q.Where(fulfillment.AssignedIDEQ(current.User.ID))
		}
		q.Where(func(selector *sql.Selector) {
			rows := sql.Select(order.FieldID).From(sql.Table(order.Table))
			contract := sql.Table(ordercontract.Table)
			paidCurrent := sql.Select(contract.C(ordercontract.FieldID)).From(contract).Where(sql.And(
				sql.ColumnsEQ(contract.C(ordercontract.FieldID), rows.C(order.FieldCurrentContract)),
				sql.ColumnsEQ(contract.C(ordercontract.FieldOrderID), rows.C(order.FieldID)),
				sql.ColumnsEQ(contract.C(ordercontract.FieldActiveOrderID), rows.C(order.FieldID)),
				sql.ColumnsEQ(contract.C(ordercontract.FieldUserID), rows.C(order.FieldUserID)),
				sql.EQ(contract.C(ordercontract.FieldPaymentState), string(ordercontract.PaymentStateSettled)),
			))
			rows.Where(sql.Exists(paidCurrent))
			order.KindIn(order.KindCustom, order.KindPackage)(rows)
			if search != "" {
				order.Or(order.GameNameContainsFold(search), order.IDEQ(search))(rows)
			}
			switch filters.State {
			case "active":
				order.StateIn(order.StateQueued, order.StateInProgress, order.StateOnHold)(rows)
			case "review":
				order.StateEQ(order.StateInProgress)(rows)
			case "":
			default:
				order.StateEQ(order.State(filters.State))(rows)
			}
			selector.Where(sql.In(selector.C(fulfillment.FieldOrderID), rows))
		})
		if filters.State == "review" {
			q.Where(fulfillment.CompletionPendingEQ(true))
		}
		if cursor != "" {
			if len(cursor) > 160 {
				return ErrInvalid
			}
			raw, e := base64.RawURLEncoding.DecodeString(cursor)
			if e != nil {
				return ErrInvalid
			}
			parts := strings.Split(string(raw), "\n")
			if len(parts) != 2 {
				return ErrInvalid
			}
			at, e := time.Parse(time.RFC3339Nano, parts[0])
			if e != nil {
				return ErrInvalid
			}
			if _, e = uuid.Parse(parts[1]); e != nil {
				return ErrInvalid
			}
			q.Where(fulfillment.Or(fulfillment.UpdatedAtLT(at), fulfillment.And(fulfillment.UpdatedAtEQ(at), fulfillment.IDLT(parts[1]))))
		}
		rows, e := q.All(ctx)
		if e != nil {
			return e
		}
		if len(rows) > 50 {
			last := rows[49]
			result.Next = base64.RawURLEncoding.EncodeToString([]byte(last.UpdatedAt.Format(time.RFC3339Nano) + "\n" + last.ID))
			rows = rows[:50]
		}
		for _, work := range rows {
			row, readErr := paid(ctx, tx.Client(), work.OrderID)
			if readErr != nil {
				return readErr
			}
			item, readErr := view(ctx, tx.Client(), row, work, audience)
			if readErr != nil {
				return readErr
			}
			if active(row) && work.Mode == fulfillment.ModeTogether {
				next, lookupErr := tx.Booking.Query().Where(booking.OrderIDEQ(row.ID), booking.AssignedIDEQ(work.AssignedID), booking.StateEQ(booking.StateConfirmed), booking.EndsAtGT(s.now())).Order(ent.Asc(booking.FieldStartsAt), ent.Asc(booking.FieldID)).First(ctx)
				if lookupErr != nil && !ent.IsNotFound(lookupErr) {
					return lookupErr
				}
				if next != nil {
					item.NextSession = &AgendaItem{next.ID, next.OrderID, row.GameName, next.StartsAt, next.EndsAt, next.Timezone, string(next.State)}
				}
			}
			result.Items = append(result.Items, item)
		}
		return nil
	})
	return result, err
}
