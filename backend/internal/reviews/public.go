package reviews

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"regexp"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/game"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/review"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

var targetKey = regexp.MustCompile(`^[a-z][a-z0-9_]{0,47}$`)
var gameSlug = regexp.MustCompile(`^[a-z][a-z0-9-]{0,79}$`)

// Feedback contains only approved ordinary attributes, never internal field or actor metadata.
type Feedback struct {
	Label string          `json:"label"`
	Value json.RawMessage `json:"value"`
}

// PublicReview intentionally has no customer, order, contract or moderator identifiers.
type PublicReview struct {
	ID             string     `json:"id"`
	Rating         int        `json:"rating"`
	Body           string     `json:"body"`
	Feedback       []Feedback `json:"feedback"`
	Response       string     `json:"response"`
	PolicyContent  string     `json:"policy_content"`
	PurchaseStatus string     `json:"purchase_status"`
	PublishedAt    time.Time  `json:"published_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// RatingCount contains a published rating bucket, including zero-count buckets.
type RatingCount struct {
	Rating int `json:"rating"`
	Count  int `json:"count"`
}

// Feed contains aggregates and a current page from one repeatable snapshot.
type Feed struct {
	Game      catalog.Release `json:"game"`
	Items     []PublicReview  `json:"items"`
	Next      string          `json:"next"`
	Count     int             `json:"count"`
	RatingSum int             `json:"rating_sum"`
	Histogram []RatingCount   `json:"histogram"`
}

// Public lists moderated feedback without consuming the global private-write authorization fence.
func (s *Store) Public(ctx context.Context, slug, service, pack, after string) (out Feed, err error) {
	out = Feed{Items: []PublicReview{}, Histogram: []RatingCount{{1, 0}, {2, 0}, {3, 0}, {4, 0}, {5, 0}}}
	if !gameSlug.MatchString(slug) || service != "" && !targetKey.MatchString(service) || pack != "" && !targetKey.MatchString(pack) {
		return out, ErrInvalid
	}
	var at time.Time
	var id string
	if after != "" {
		at, id, err = cursor(after)
		if err != nil {
			return out, err
		}
	}
	// TiDB rejects READ ONLY; do not enable its no-op emulation. This scope executes only SELECTs.
	tx, err := s.client.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelRepeatableRead})
	if err != nil {
		return out, err
	}
	defer func() {
		if rollbackErr := tx.Rollback(); rollbackErr != nil && !errors.Is(rollbackErr, sql.ErrTxDone) {
			err = errors.Join(err, rollbackErr)
		}
	}()
	g, err := tx.Game.Query().Where(game.SlugEQ(slug), game.CurrentReleaseNEQ("")).Only(ctx)
	if err != nil {
		return out, err
	}
	out.Game, err = released(ctx, tx.Client(), g.ID)
	if err != nil {
		return out, err
	}
	base := tx.Review.Query().Where(review.GameIDEQ(g.ID), review.StateEQ(review.StatePublished), review.PublishedAtNotNil())
	if service != "" {
		base.Where(review.ServiceEQ(service))
	}
	if pack != "" {
		base.Where(review.PackageKeyEQ(pack))
	}
	var buckets []struct {
		Rating int8 `json:"rating"`
		Count  int  `json:"count"`
	}
	if err = base.Clone().GroupBy(review.FieldRating).Aggregate(ent.Count()).Scan(ctx, &buckets); err != nil {
		return out, err
	}
	for _, bucket := range buckets {
		if bucket.Rating < 1 || bucket.Rating > 5 {
			return out, ErrConflict
		}
		out.Count += bucket.Count
		out.RatingSum += int(bucket.Rating) * bucket.Count
		out.Histogram[int(bucket.Rating)-1].Count = bucket.Count
	}
	q := base.Clone().Order(ent.Desc(review.FieldPublishedAt), ent.Desc(review.FieldID)).Limit(21)
	if after != "" {
		q.Where(review.Or(review.PublishedAtLT(at), review.And(review.PublishedAtEQ(at), review.IDLT(id))))
	}
	rows, err := q.All(ctx)
	if err != nil {
		return out, err
	}
	// Fail closed if a database access-path regression violates the first-page snapshot.
	if after == "" && len(rows) != min(21, out.Count) {
		return out, ErrConflict
	}
	if len(rows) > 20 {
		last := rows[19]
		out.Next = continuation(*last.PublishedAt, last.ID)
		rows = rows[:20]
	}
	if len(rows) == 0 {
		return out, nil
	}
	ids := make([]string, 0, len(rows))
	contracts := make([]string, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.OrderID)
		contracts = append(contracts, row.ContractID)
	}
	purchases, err := tx.Order.Query().Where(order.IDIn(ids...)).All(ctx)
	if err != nil {
		return out, err
	}
	agreements, err := tx.OrderContract.Query().Where(ordercontract.IDIn(contracts...)).All(ctx)
	if err != nil {
		return out, err
	}
	purchaseMap := map[string]*ent.Order{}
	contractMap := map[string]*ent.OrderContract{}
	for _, row := range purchases {
		purchaseMap[row.ID] = row
	}
	for _, row := range agreements {
		contractMap[row.ID] = row
	}
	for _, row := range rows {
		item, convertErr := publicView(row, purchaseMap[row.OrderID], contractMap[row.ContractID])
		if convertErr != nil {
			return out, convertErr
		}
		item.PurchaseStatus, err = financialStatus(ctx, tx.Client(), purchaseMap[row.OrderID], item.PurchaseStatus)
		if err != nil {
			return out, err
		}
		out.Items = append(out.Items, item)
	}
	return out, nil
}
func publicView(row *ent.Review, purchase *ent.Order, contract *ent.OrderContract) (PublicReview, error) {
	if row.State != review.StatePublished || row.PublishedAt == nil {
		return PublicReview{}, ErrConflict
	}
	pinned, err := decode[Policy](row.Policy)
	if err != nil {
		return PublicReview{}, err
	}
	answers, err := decode[catalog.Answers](row.Answers)
	if err != nil {
		return PublicReview{}, err
	}
	status := "verified_purchase"
	if purchase == nil || contract == nil || purchase.UserID != row.UserID || purchase.CurrentContract != row.ContractID || contract.OrderID != row.OrderID || contract.UserID != row.UserID || contract.PaymentState != ordercontract.PaymentStateSettled || contract.ActiveOrderID == nil || *contract.ActiveOrderID != row.OrderID {
		status = "purchase_status_updated"
	} else if purchase.State != order.StateCompleted {
		status = "fulfillment_status_updated"
	}
	out := PublicReview{ID: row.ID, Rating: int(row.Rating), Body: row.Body, Feedback: []Feedback{}, Response: row.Response, PolicyContent: pinned.Policy.Content, PurchaseStatus: status, PublishedAt: *row.PublishedAt, UpdatedAt: row.UpdatedAt}
	for _, field := range pinned.Policy.Fields {
		if value, ok := answers[field.Key]; ok {
			out.Feedback = append(out.Feedback, Feedback{field.Label, value})
		}
	}
	return out, nil
}
