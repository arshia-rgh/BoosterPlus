package supply

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplieritem"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierprice"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// Filters pins pagination to one immutable import, not a changing provider catalog.
type Filters struct{ ImportID, After, Search, GameID, CategoryID string }

// Library contains private metadata and one bounded product page.
type Library struct {
	Connection ConnectionView       `json:"connection"`
	Import     *ImportView          `json:"import"`
	Games      []suppliers.Game     `json:"games"`
	Categories []suppliers.Category `json:"categories"`
	Items      []ProductView        `json:"items"`
	Next       string               `json:"next"`
}

// ProductView uses strings for monetary and fractional numeric API fields.
type ProductView struct {
	ID                   string           `json:"id"`
	GameID               string           `json:"game_id"`
	CategoryID           string           `json:"category_id"`
	Name                 string           `json:"name"`
	Icon                 string           `json:"icon"`
	Description          string           `json:"description"`
	Kind                 string           `json:"kind"`
	Platform             string           `json:"platform"`
	InstructionAvailable bool             `json:"instruction_available"`
	Region               suppliers.Region `json:"region"`
	ReviewIssues         []string         `json:"review_issues"`
	Offers               []OfferView      `json:"offers"`
}

// OfferView separates supplier availability from publication and price review.
type OfferView struct {
	ID                string       `json:"id"`
	Name              string       `json:"name"`
	Available         bool         `json:"available"`
	SuggestedDelivery string       `json:"suggested_delivery"`
	Fields            []FieldView  `json:"fields"`
	Quantity          QuantityView `json:"quantity"`
	Pricing           Pricing      `json:"pricing"`
	Instruction       string       `json:"instruction"`
	CodeRequest       bool         `json:"code_request"`
	GooglePrompt      bool         `json:"google_prompt"`
	GameExit          bool         `json:"game_exit"`
}

// QuantityView preserves values that may exceed browser floating-point precision.
type QuantityView struct {
	Kind string `json:"kind"`
	Min  string `json:"min"`
	Max  string `json:"max"`
	Step string `json:"step"`
}

// FieldView is declarative; provider patterns are never executed by the browser.
type FieldView struct {
	ID        string             `json:"id"`
	Label     string             `json:"label"`
	Kind      string             `json:"kind"`
	Required  bool               `json:"required"`
	Secret    bool               `json:"secret"`
	Transient bool               `json:"transient"`
	Min       *string            `json:"min"`
	Max       *string            `json:"max"`
	Step      *string            `json:"step"`
	Options   []suppliers.Option `json:"options"`
}

func decimalString(value *suppliers.Decimal) *string {
	if value == nil {
		return nil
	}
	text := string(*value)
	return &text
}

func productView(product *suppliers.Product, markup int, prices map[string]*ent.SupplierPrice) ProductView {
	out := ProductView{ID: product.ID, GameID: product.GameID, CategoryID: product.CategoryID, Name: product.Name, Icon: product.Icon,
		Description: product.Description, Kind: product.Kind, Platform: product.Platform, InstructionAvailable: product.InstructionAvailable,
		Region: product.Region, ReviewIssues: append([]string{}, product.ReviewIssues...), Offers: []OfferView{}}
	for _, offer := range product.Offers {
		view := OfferView{ID: offer.ID, Name: offer.Name, Available: offer.Available, SuggestedDelivery: offer.SuggestedDelivery, Fields: []FieldView{},
			Quantity: QuantityView{offer.Quantity.Kind, string(offer.Quantity.Min), string(offer.Quantity.Max), string(offer.Quantity.Step)},
			Pricing:  pricing(offer, markup, prices[offer.ID]), Instruction: offer.Instruction, CodeRequest: offer.CodeRequest, GooglePrompt: offer.GooglePrompt, GameExit: offer.GameExit}
		for _, field := range offer.Fields {
			view.Fields = append(view.Fields, FieldView{field.ID, field.Label, field.Kind, field.Required, field.Secret, field.Transient,
				decimalString(field.Min), decimalString(field.Max), decimalString(field.Step), append([]suppliers.Option{}, field.Options...)})
		}
		out.Offers = append(out.Offers, view)
	}
	return out
}

// Library returns only complete imports and rechecks staff authority on every page.
func (s *Store) Library(ctx context.Context, p *identity.Principal, id suppliers.Connection, filter Filters) (out Library, err error) {
	out.Games, out.Categories, out.Items = []suppliers.Game{}, []suppliers.Category{}, []ProductView{}
	if !validConnection(id) || filter.ImportID != "" && !validID(filter.ImportID) || filter.After != "" && (!validID(filter.After) || filter.ImportID == "") || !boundedText(filter.Search, 120) || !boundedText(filter.GameID, 240) || !boundedText(filter.CategoryID, 240) {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, _ *identity.Principal) error {
		conn, e := tx.SupplierConnection.Get(ctx, string(id))
		if ent.IsNotFound(e) {
			if filter.ImportID != "" {
				return ErrConflict
			}
			out.Connection = connectionView(&ent.SupplierConnection{ID: string(id), Version: 1, MarkupBps: suppliers.DefaultMarkupBPS}, s.readers[id] != nil)
			return nil
		}
		if e != nil {
			return e
		}
		out.Connection = connectionView(conn, s.readers[id] != nil)
		importID := filter.ImportID
		if importID == "" {
			importID = conn.CurrentImport
		}
		if importID == "" {
			return nil
		}
		run, e := tx.SupplierImport.Get(ctx, importID)
		if e != nil {
			return e
		}
		if run.ConnectionID != string(id) || run.State != "complete" {
			return ErrConflict
		}
		view := importView(run)
		out.Import = &view
		raw, e := json.Marshal(run.Metadata)
		if e != nil {
			return e
		}
		var metadata struct {
			Games      []suppliers.Game     `json:"games"`
			Categories []suppliers.Category `json:"categories"`
		}
		if json.Unmarshal(raw, &metadata) != nil {
			return ErrConflict
		}
		out.Games = append(out.Games, metadata.Games...)
		out.Categories = append(out.Categories, metadata.Categories...)
		query := tx.SupplierItem.Query().Where(supplieritem.ImportIDEQ(importID)).Order(ent.Asc(supplieritem.FieldID)).Limit(26)
		if filter.After != "" {
			query.Where(supplieritem.IDGT(filter.After))
		}
		if filter.GameID != "" {
			query.Where(supplieritem.GameIDEQ(filter.GameID))
		}
		if filter.CategoryID != "" {
			query.Where(supplieritem.CategoryIDEQ(filter.CategoryID))
		}
		if search := strings.TrimSpace(filter.Search); search != "" {
			query.Where(supplieritem.Or(supplieritem.TitleContainsFold(search), supplieritem.ProductIDEQ(search)))
		}
		rows, e := query.All(ctx)
		if e != nil {
			return e
		}
		if len(rows) > 25 {
			out.Next = rows[24].ID
			rows = rows[:25]
		}
		if len(rows) == 0 {
			return nil
		}
		ids := make([]string, len(rows))
		for i, row := range rows {
			ids[i] = row.ProductID
		}
		prices, e := tx.SupplierPrice.Query().Where(supplierprice.ConnectionIDEQ(string(id)), supplierprice.ProductIDIn(ids...)).All(ctx)
		if e != nil {
			return e
		}
		index := map[string]map[string]*ent.SupplierPrice{}
		for _, row := range prices {
			if index[row.ProductID] == nil {
				index[row.ProductID] = map[string]*ent.SupplierPrice{}
			}
			index[row.ProductID][row.OfferID] = row
		}
		for _, row := range rows {
			if row.Data == nil || row.ConnectionID != string(id) || row.Data.ID != row.ProductID {
				return ErrConflict
			}
			out.Items = append(out.Items, productView(row.Data, conn.MarkupBps, index[row.ProductID]))
		}
		return nil
	})
	return out, err
}
