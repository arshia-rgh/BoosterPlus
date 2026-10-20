package shop

import (
	"entgo.io/ent/dialect/sql"
	"entgo.io/ent/dialect/sql/sqljson"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/catalogrelease"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/game"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopproduct"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopstock"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierbinding"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierconnection"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// purchasableProduct applies release-backed availability before list pagination.
// A private draft, paused game or obsolete stock projection never counts as an offer.
func (s *Store) purchasableProduct(product *sql.Selector) *sql.Predicate {
	stock := sql.Table(shopstock.Table).As("available_stock")
	inventory := sql.Select(stock.C(shopstock.FieldProductID)).From(stock).Where(sql.And(
		sql.EQ(stock.C(shopstock.FieldEnabled), true),
		sql.ColumnsEQ(stock.C(shopstock.FieldReleaseID), product.C(shopproduct.FieldCurrentRelease)),
		sql.ExprP("`available_stock`.`total` - `available_stock`.`reserved` - `available_stock`.`committed` >= `available_stock`.`min_quantity` AND `available_stock`.`min_quantity` > 0"),
	))
	games := sql.Table(game.Table).As("available_game")
	released := sql.Table(catalogrelease.Table).As("available_catalog")
	enabled := sql.Select(games.C(game.FieldID)).From(games).Join(released).On(games.C(game.FieldCurrentRelease), released.C(catalogrelease.FieldID)).Where(sql.And(
		sql.EQ(games.C(game.FieldPublished), true), sql.EQ(games.C(game.FieldPaused), false), sql.EQ(games.C(game.FieldArchived), false),
		sqljson.ValueContains(released.C(catalogrelease.FieldConfiguration), map[string]string{"service": "shop", "state": "active"}, sqljson.Path("discovery", "capabilities")),
	))
	availability := sql.In(product.C(shopproduct.FieldID), inventory)
	if s.supplier != nil {
		merchant := s.supplier.ConfiguredMerchant(suppliers.NexusSandbox)
		if s.supplier.CanPurchase(suppliers.NexusSandbox, merchant) {
			binding := sql.Table(supplierbinding.Table).As("available_binding")
			connection := sql.Table(supplierconnection.Table).As("available_connection")
			releases := sql.Select(binding.C(supplierbinding.FieldID)).From(binding).Where(sql.And(
				sqljson.ValueEQ(binding.C(supplierbinding.FieldData), string(suppliers.NexusSandbox), sqljson.Path("connection")),
				sql.Exists(sql.Select(connection.C(supplierconnection.FieldID)).From(connection).Where(sql.And(sql.EQ(connection.C(supplierconnection.FieldID), string(suppliers.NexusSandbox)), sql.EQ(connection.C(supplierconnection.FieldMerchantID), merchant), sql.EQ(connection.C(supplierconnection.FieldPurchasesEnabled), true)))),
				sqljson.ValueEQ(binding.C(supplierbinding.FieldData), merchant, sqljson.Path("merchant_id")), sql.ColumnsEQ(binding.C(supplierbinding.FieldShopProductID), product.C(shopproduct.FieldID))))
			availability = sql.Or(availability, sql.In(product.C(shopproduct.FieldCurrentRelease), releases))
		}
	}
	return sql.And(sql.EQ(product.C(shopproduct.FieldState), "published"), availability, sql.In(product.C(shopproduct.FieldGameID), enabled))
}
