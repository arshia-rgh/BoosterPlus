package orders

import (
	"time"

	"entgo.io/ent/dialect/sql"
	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
)

// Filters is the structured staff queue filter; all dates use inclusive/exclusive UTC bounds.
type Filters struct {
	Delivery string
	Game     string
	Kind     string
	Customer string
	Assigned string
	From     string
	To       string
}

func applyFilters(q *ent.OrderQuery, admin bool, f Filters) error {
	if !admin && f != (Filters{}) {
		return ErrConflict
	}
	if f.Game != "" {
		if !text(f.Game, 1, 80) {
			return ErrConflict
		}
		q.Where(order.SlugEQ(f.Game))
	}
	if f.Kind != "" {
		if e := order.KindValidator(order.Kind(f.Kind)); e != nil {
			return ErrConflict
		}
		q.Where(order.KindEQ(order.Kind(f.Kind)))
	}
	if f.Customer != "" {
		id, e := uuid.Parse(f.Customer)
		if e != nil || id.String() != f.Customer {
			return ErrConflict
		}
		q.Where(order.UserIDEQ(f.Customer))
	}
	if f.Assigned != "" {
		if f.Assigned != "unassigned" {
			id, e := uuid.Parse(f.Assigned)
			if e != nil || id.String() != f.Assigned {
				return ErrConflict
			}
		}
		q.Where(func(s *sql.Selector) {
			boost, shop := sql.Table("fulfillments"), sql.Table("shop_deliveries")
			a, b := sql.Select(boost.C("order_id")).From(boost), sql.Select(shop.C("order_id")).From(shop)
			if f.Assigned == "unassigned" {
				a.Where(sql.NEQ(boost.C("assigned_id"), ""))
				b.Where(sql.NEQ(shop.C("assigned_id"), ""))
				supplier := sql.Table("supplier_purchases")
				s.Where(sql.And(sql.NotIn(s.C(order.FieldID), a), sql.NotIn(s.C(order.FieldID), b), sql.NotIn(s.C(order.FieldID), sql.Select(supplier.C("order_id")).From(supplier))))
			} else {
				a.Where(sql.EQ(boost.C("assigned_id"), f.Assigned))
				b.Where(sql.EQ(shop.C("assigned_id"), f.Assigned))
				s.Where(sql.Or(sql.In(s.C(order.FieldID), a), sql.In(s.C(order.FieldID), b)))
			}
		})
	}
	if f.Delivery != "" {
		switch f.Delivery {
		case "processing", "held", "submitted", "completed", "cancelled", "supplier":
		default:
			return ErrConflict
		}
		q.Where(order.KindEQ(order.KindShop), func(s *sql.Selector) {
			t := sql.Table("shop_deliveries")
			manual := sql.In(s.C(order.FieldID), sql.Select(t.C("order_id")).From(t).Where(sql.EQ(t.C("state"), f.Delivery)))
			provider := sql.Table("supplier_purchases")
			q := sql.Select(provider.C("order_id")).From(provider)
			switch f.Delivery {
			case "processing":
				q.Where(sql.In(provider.C("state"), "checking", "sending", "pending", "unresolved"))
			case "held":
				q.Where(sql.In(provider.C("state"), "held", "partial", "cancelled"))
			case "supplier":
			default:
				q.Where(sql.EQ(provider.C("state"), f.Delivery))
			}
			s.Where(sql.Or(manual, sql.In(s.C(order.FieldID), q)))
		})
	}
	var from, to time.Time
	if f.From != "" {
		var e error
		from, e = time.Parse("2006-01-02", f.From)
		if e != nil || from.Year() < 1000 {
			return ErrConflict
		}
		q.Where(order.CreatedAtGTE(from))
	}
	if f.To != "" {
		var e error
		to, e = time.Parse("2006-01-02", f.To)
		if e != nil || to.Year() < 1000 {
			return ErrConflict
		}
		q.Where(order.CreatedAtLT(to))
	}
	if !from.IsZero() && !to.IsZero() && !from.Before(to) {
		return ErrConflict
	}
	return nil
}
