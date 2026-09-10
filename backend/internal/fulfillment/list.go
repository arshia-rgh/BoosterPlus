package fulfillment

import (
	"context"
	"encoding/base64"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Listing is bounded and excludes other boosters' work at the SQL query boundary.
type Listing struct {
	Items []View `json:"items"`
	Next  string `json:"next"`
}

// List returns current assigned work using a stable chronological cursor.
func (s *Store) List(ctx context.Context, p *identity.Principal, audience, cursor string) (Listing, error) {
	result := Listing{Items: []View{}}
	if audience != "admin" && audience != "booster" {
		return result, identity.ErrForbidden
	}
	err := s.auth.AuthorizedTransaction(ctx, p, audience, false, func(tx *ent.Tx, current *identity.Principal) error {
		result = Listing{Items: []View{}}
		q := tx.Fulfillment.Query().Order(ent.Desc(fulfillment.FieldUpdatedAt), ent.Desc(fulfillment.FieldID)).Limit(51)
		if audience == "booster" {
			q.Where(fulfillment.AssignedIDEQ(current.User.ID))
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
			result.Items = append(result.Items, item)
		}
		return nil
	})
	return result, err
}
