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
			t := sql.Table("fulfillments")
			sub := sql.Select(t.C("order_id")).From(t)
			if f.Assigned == "unassigned" {
				sub.Where(sql.NEQ(t.C("assigned_id"), ""))
				s.Where(sql.NotIn(s.C(order.FieldID), sub))
			} else {
				sub.Where(sql.EQ(t.C("assigned_id"), f.Assigned))
				s.Where(sql.In(s.C(order.FieldID), sub))
			}
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
