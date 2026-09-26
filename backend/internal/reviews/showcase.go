package reviews

import (
	"context"
	"database/sql"
	"errors"
	"time"

	entsql "entgo.io/ent/dialect/sql"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/catalogrelease"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/game"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/review"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

// ShowcaseItem identifies a public game alongside already moderated feedback.
// It intentionally contains no customer, order, contract or staff identifiers.
type ShowcaseItem struct {
	Slug   string       `json:"slug"`
	Game   string       `json:"game"`
	Review PublicReview `json:"review"`
}

// Showcase is a bounded recent-review carousel, not a site-wide rating claim.
type Showcase struct {
	Items []ShowcaseItem `json:"items"`
}

// Showcase returns up to eight recently published reviews across visible games.
// Every rating is eligible, including low ratings and changed purchase statuses.
func (s *Store) Showcase(ctx context.Context) (out Showcase, err error) {
	out.Items = []ShowcaseItem{}
	ctx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()
	tx, err := s.client.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelRepeatableRead})
	if err != nil {
		return out, err
	}
	defer func() {
		if rollbackErr := tx.Rollback(); rollbackErr != nil && !errors.Is(rollbackErr, sql.ErrTxDone) {
			err = errors.Join(err, rollbackErr)
		}
	}()
	rows, err := tx.Review.Query().Where(review.StateEQ(review.StatePublished), review.PublishedAtNotNil(), func(q *entsql.Selector) {
		games := entsql.Table(game.Table)
		q.Where(entsql.Exists(entsql.Select(games.C(game.FieldID)).From(games).Where(entsql.And(
			entsql.ColumnsEQ(games.C(game.FieldID), q.C(review.FieldGameID)),
			entsql.EQ(games.C(game.FieldPublished), true), entsql.EQ(games.C(game.FieldArchived), false),
			entsql.NEQ(games.C(game.FieldCurrentRelease), ""),
		))))
	}).Order(ent.Desc(review.FieldPublishedAt), ent.Desc(review.FieldID)).Limit(8).All(ctx)
	if err != nil || len(rows) == 0 {
		return out, err
	}
	return showcaseItems(ctx, tx.Client(), rows)
}

func showcaseItems(ctx context.Context, client *ent.Client, rows []*ent.Review) (Showcase, error) {
	out := Showcase{Items: []ShowcaseItem{}}
	gameIDs, orderIDs, contractIDs := []string{}, []string{}, []string{}
	for _, row := range rows {
		gameIDs = append(gameIDs, row.GameID)
		orderIDs = append(orderIDs, row.OrderID)
		contractIDs = append(contractIDs, row.ContractID)
	}
	games, err := client.Game.Query().Where(game.IDIn(gameIDs...)).All(ctx)
	if err != nil {
		return out, err
	}
	releaseIDs := []string{}
	gameMap := map[string]*ent.Game{}
	for _, row := range games {
		gameMap[row.ID] = row
		releaseIDs = append(releaseIDs, row.CurrentRelease)
	}
	releases, err := client.CatalogRelease.Query().Where(catalogrelease.IDIn(releaseIDs...)).All(ctx)
	if err != nil {
		return out, err
	}
	names := map[string]string{}
	for _, row := range releases {
		g := gameMap[row.GameID]
		if g == nil || g.CurrentRelease != row.ID {
			return out, ErrConflict
		}
		config, decodeErr := decode[catalog.Configuration](row.Configuration)
		if decodeErr != nil {
			return out, decodeErr
		}
		names[row.GameID] = config.Name
	}
	purchases, err := client.Order.Query().Where(order.IDIn(orderIDs...)).All(ctx)
	if err != nil {
		return out, err
	}
	agreements, err := client.OrderContract.Query().Where(ordercontract.IDIn(contractIDs...)).All(ctx)
	if err != nil {
		return out, err
	}
	purchaseMap, contractMap := map[string]*ent.Order{}, map[string]*ent.OrderContract{}
	for _, row := range purchases {
		purchaseMap[row.ID] = row
	}
	for _, row := range agreements {
		contractMap[row.ID] = row
	}
	for _, row := range rows {
		g := gameMap[row.GameID]
		name := names[row.GameID]
		if g == nil || name == "" {
			return out, ErrConflict
		}
		item, convertErr := publicView(row, purchaseMap[row.OrderID], contractMap[row.ContractID])
		if convertErr != nil {
			return out, convertErr
		}
		item.PurchaseStatus, err = financialStatus(ctx, client, purchaseMap[row.OrderID], item.PurchaseStatus)
		if err != nil {
			return out, err
		}
		out.Items = append(out.Items, ShowcaseItem{Slug: g.Slug, Game: name, Review: item})
	}
	return out, nil
}
