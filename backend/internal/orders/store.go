package orders

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/couponclaim"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/orderevent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/orderquote"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Store shares Ent and identity's transactional authority. The optional clock is
// injected only by Go tests; it cannot be configured by requests.
type Store struct {
	client *ent.Client
	auth   *identity.Service
	now    func() time.Time
}

// New constructs the order service without running migrations.
func New(client *ent.Client, auth *identity.Service, now func() time.Time) *Store {
	if now == nil {
		now = time.Now
	}
	return &Store{client, auth, now}
}
func (s *Store) instant() time.Time { return s.now().UTC().Truncate(time.Microsecond) }
func summary(row *ent.Order) Summary {
	return Summary{row.ID, row.Version, string(row.Kind), string(row.State), row.Slug, row.Service, row.PackageKey, row.VariantKey, row.GameName, row.CreatedAt, row.UpdatedAt}
}
func view(ctx context.Context, client *ent.Client, row *ent.Order) (Detail, error) {
	result := Detail{Order: summary(row), CouponCode: row.CouponCode}
	var err error
	result.Offer, err = decode[catalog.Release](row.Snapshot)
	if err != nil {
		return result, err
	}
	result.Answers, err = decode[catalog.Answers](row.Answers)
	if err != nil {
		return result, err
	}
	result.Estimate, err = decode[catalog.Estimate](row.Estimate)
	if err != nil {
		return result, err
	}
	if row.CurrentQuote != "" {
		q, readErr := client.OrderQuote.Query().Where(orderquote.IDEQ(row.CurrentQuote), orderquote.OrderIDEQ(row.ID)).Only(ctx)
		if readErr != nil {
			return result, readErr
		}
		data, readErr := decode[Commercial](q.Data)
		if readErr != nil {
			return result, readErr
		}
		result.Quote = &QuoteView{q.ID, string(q.State), data}
	}
	if row.CurrentContract != "" {
		c, readErr := client.OrderContract.Query().Where(ordercontract.IDEQ(row.CurrentContract), ordercontract.OrderIDEQ(row.ID)).Only(ctx)
		if readErr != nil {
			return result, readErr
		}
		data, readErr := decode[Commercial](c.Data)
		if readErr != nil {
			return result, readErr
		}
		result.Contract = &ContractView{c.ID, string(c.PaymentState), data}
	}
	return result, nil
}
func require(p *identity.Principal, admin bool) error {
	capability := "account"
	if admin {
		capability = "admin"
	}
	return identity.Require(p, capability)
}
func owned(ctx context.Context, client *ent.Client, p *identity.Principal, id string, admin bool) (*ent.Order, error) {
	if err := require(p, admin); err != nil {
		return nil, err
	}
	q := client.Order.Query().Where(order.IDEQ(id))
	if !admin {
		q.Where(order.UserIDEQ(p.User.ID))
	}
	return q.Only(ctx)
}

// Get never treats a customer URL as an implicit administrative capability.
func (s *Store) Get(ctx context.Context, p *identity.Principal, id string, admin bool) (Detail, error) {
	row, err := owned(ctx, s.client, p, id, admin)
	if err != nil {
		return Detail{}, err
	}
	return view(ctx, s.client, row)
}

// List returns 50 chronological summaries; private form/quote payloads stay in detail endpoints.
func (s *Store) List(ctx context.Context, p *identity.Principal, admin bool, cursor, state, search string) (Listing, error) {
	result := Listing{Orders: []Summary{}}
	if err := require(p, admin); err != nil {
		return result, err
	}
	q := s.client.Order.Query().Order(ent.Desc(order.FieldCreatedAt), ent.Desc(order.FieldID)).Limit(51)
	if !admin {
		q.Where(order.UserIDEQ(p.User.ID))
	}
	if state != "" {
		if err := order.StateValidator(order.State(state)); err != nil {
			return result, invalid("state", "Unknown order state.")
		}
		q.Where(order.StateEQ(order.State(state)))
	}
	if search != "" {
		if !text(search, 3, 80) {
			return result, invalid("search", "Use a search phrase of 3–80 characters.")
		}
		q.Where(order.Or(order.IDEQ(search), order.GameNameContains(search), order.SlugContains(search)))
	}
	if cursor != "" {
		if len(cursor) > 160 {
			return result, ErrConflict
		}
		raw, err := base64.RawURLEncoding.DecodeString(cursor)
		if err != nil {
			return result, ErrConflict
		}
		parts := strings.Split(string(raw), "\n")
		if len(parts) != 2 {
			return result, ErrConflict
		}
		at, err := time.Parse(time.RFC3339Nano, parts[0])
		if err != nil {
			return result, ErrConflict
		}
		if _, err = uuid.Parse(parts[1]); err != nil {
			return result, ErrConflict
		}
		q.Where(order.Or(order.CreatedAtLT(at), order.And(order.CreatedAtEQ(at), order.IDLT(parts[1]))))
	}
	q.Select(order.FieldID, order.FieldVersion, order.FieldKind, order.FieldState, order.FieldSlug, order.FieldService, order.FieldPackageKey, order.FieldVariantKey, order.FieldGameName, order.FieldCreatedAt, order.FieldUpdatedAt)
	rows, err := q.All(ctx)
	if err != nil {
		return result, err
	}
	if len(rows) > 50 {
		last := rows[49]
		result.Next = base64.RawURLEncoding.EncodeToString([]byte(last.CreatedAt.Format(time.RFC3339Nano) + "\n" + last.ID))
		rows = rows[:50]
	}
	for _, row := range rows {
		result.Orders = append(result.Orders, summary(row))
	}
	return result, nil
}
func estimateSelections(c catalog.Configuration, key string, answers catalog.Answers) catalog.Answers {
	output := catalog.Answers{}
	for _, service := range c.Services {
		if service.Key != key {
			continue
		}
		for _, field := range service.Fields {
			if field.Stage == "estimate" {
				if answer, found := answers[field.Key]; found {
					output[field.Key] = answer
				}
			}
		}
	}
	return output
}
func variantFor(release catalog.Release, service, packKey, variantKey string) (*catalog.Variant, error) {
	i := slices.IndexFunc(release.Configuration.Packages, func(p catalog.Package) bool { return p.Key == packKey && p.Service == service })
	if i < 0 {
		return nil, ErrConflict
	}
	pack := release.Configuration.Packages[i]
	j := slices.IndexFunc(pack.Variants, func(v catalog.Variant) bool { return v.Key == variantKey })
	if j < 0 {
		return nil, ErrConflict
	}
	v := pack.Variants[j]
	if v.Capacity != nil && *v.Capacity == 0 {
		return nil, ErrConflict
	}
	return &v, nil
}
func event(ctx context.Context, tx *ent.Tx, p *identity.Principal, row *ent.Order, action, message string, now time.Time) error {
	_, err := tx.OrderEvent.Create().SetOrderID(row.ID).SetVersion(row.Version).SetAction(action).SetMessage(message).SetActorID(p.User.ID).SetActorRole(p.User.Role).SetCreatedAt(now).Save(ctx)
	return err
}

// Create snapshots a custom request or immediately creates an unpaid package contract.
func (s *Store) Create(ctx context.Context, p *identity.Principal, input CreateInput) (Detail, error) {
	requestKey, parseErr := uuid.Parse(input.RequestKey)
	if parseErr != nil {
		return Detail{}, invalid("request_key", "Use a UUID idempotency key for this request.")
	}
	input.RequestKey = requestKey.String()
	if !slices.Contains([]string{"custom", "package"}, input.Kind) || len(input.CouponCode) > 40 {
		return Detail{}, invalid("kind", "Choose a supported order type and bounded coupon code.")
	}
	if input.Kind == "custom" && (input.Package != "" || input.Variant != "" || input.ExpectedAmount != "" || input.ExpectedCouponVersion != 0) {
		return Detail{}, invalid("package", "Custom requests cannot accept a package price or payment contract.")
	}
	code, codeErr := catalog.NormalizeCouponCode(input.CouponCode)
	if codeErr != nil {
		return Detail{}, codeErr
	}
	input.CouponCode = code
	raw, err := json.Marshal(input)
	if err != nil {
		return Detail{}, err
	}
	digest := s.auth.RequestDigest("order-create", raw)
	var result Detail
	err = s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		existing, readErr := tx.Order.Query().Where(order.UserIDEQ(current.User.ID), order.RequestKeyEQ(input.RequestKey)).Only(ctx)
		if readErr == nil {
			if existing.RequestHash != digest {
				return ErrConflict
			}
			result, readErr = view(ctx, tx.Client(), existing)
			return readErr
		}
		if !ent.IsNotFound(readErr) {
			return readErr
		}
		if !input.AcceptTerms || input.TermsVersion != s.auth.TermsVersion() {
			return identity.ErrTerms
		}
		release, readErr := catalog.New(tx.Client(), s.auth).Published(ctx, input.Slug)
		if readErr != nil {
			return readErr
		}
		if release.Paused || release.ID != input.ReleaseID {
			return ErrConflict
		}
		var variant *catalog.Variant
		if input.Kind == "package" {
			variant, readErr = variantFor(release, input.Service, input.Package, input.Variant)
			if readErr != nil {
				return readErr
			}
		}
		validated := catalog.ValidateAnswers(release.Configuration, input.Service, "order", input.Answers, variant)
		if len(validated.Issues) > 0 {
			return &Invalid{validated.Issues}
		}
		now := s.instant()
		estimate := catalog.Calculate(release, input.Service, estimateSelections(release.Configuration, input.Service, validated.Answers), now)
		answerData, readErr := document(validated.Answers)
		if readErr != nil {
			return readErr
		}
		snapshot, readErr := document(release)
		if readErr != nil {
			return readErr
		}
		estimateData, readErr := document(estimate)
		if readErr != nil {
			return readErr
		}
		row, readErr := tx.Order.Create().SetUserID(current.User.ID).SetGameID(release.GameID).SetGameName(release.Configuration.Name).SetSlug(input.Slug).SetService(input.Service).SetPackageKey(input.Package).SetVariantKey(input.Variant).SetKind(order.Kind(input.Kind)).SetRequestKey(input.RequestKey).SetRequestHash(digest).SetState(order.StateSubmitted).SetAnswers(answerData).SetSnapshot(snapshot).SetEstimate(estimateData).SetCouponCode(input.CouponCode).SetTermsVersion(input.TermsVersion).SetCreatedAt(now).SetUpdatedAt(now).Save(ctx)
		if readErr != nil {
			return readErr
		}
		if variant != nil {
			discount, total, priceErr := catalog.ContractDiscount(ctx, tx, current.User.ID, input.CouponCode, catalog.CouponOffer{Slug: row.Slug, Service: row.Service, Package: row.PackageKey, Currency: variant.Currency, SubtotalMinor: variant.AmountMinor}, now)
			if priceErr != nil {
				return priceErr
			}
			couponVersion := 0
			if discount != nil {
				couponVersion = discount.Version
			}
			if total != input.ExpectedAmount || couponVersion != input.ExpectedCouponVersion {
				return ErrConflict
			}
			data := Commercial{Currency: variant.Currency, SubtotalMinor: variant.AmountMinor, AmountMinor: total, Discount: discount, Lines: []catalog.PriceLine{{Key: "package", Label: variant.Name, AmountMinor: variant.AmountMinor}}, Scope: release.Configuration.Name + " / " + variant.Name, Reason: "Published fixed package", DeliveryMinHours: variant.DeliveryMinHours, DeliveryMaxHours: variant.DeliveryMaxHours, ExpiresAt: now.Add(48 * time.Hour), TermsVersion: input.TermsVersion}
			if discount != nil {
				data.Lines = append(data.Lines, catalog.PriceLine{Key: "coupon", Label: "Coupon " + discount.Code, AmountMinor: "-" + discount.AmountMinor})
			}
			contractID, contractErr := createContract(ctx, tx, row, data, variant, now)
			if contractErr != nil {
				return contractErr
			}
			row, readErr = tx.Order.UpdateOne(row).SetState(order.StateAwaitingPayment).SetCurrentContract(contractID).Save(ctx)
			if readErr != nil {
				return readErr
			}
		}
		if readErr = event(ctx, tx, current, row, "created", "Order created.", now); readErr != nil {
			return readErr
		}
		result, readErr = view(ctx, tx.Client(), row)
		return readErr
	})
	return result, err
}
func createContract(ctx context.Context, tx *ent.Tx, row *ent.Order, data Commercial, variant *catalog.Variant, now time.Time) (string, error) {
	if variant != nil && variant.Capacity != nil {
		count, err := tx.OrderContract.Query().Where(ordercontract.GameIDEQ(row.GameID), ordercontract.PackageKeyEQ(row.PackageKey), ordercontract.VariantKeyEQ(row.VariantKey), ordercontract.CapacityHeldEQ(true)).Count(ctx)
		if err != nil {
			return "", err
		}
		if count >= *variant.Capacity {
			return "", ErrConflict
		}
	}
	if data.Discount != nil {
		copyDiscount := *data.Discount
		copyDiscount.Indicative = false
		data.Discount = &copyDiscount
	}
	doc, err := document(data)
	if err != nil {
		return "", err
	}
	contract, err := tx.OrderContract.Create().SetOrderID(row.ID).SetActiveOrderID(row.ID).SetUserID(row.UserID).SetGameID(row.GameID).SetPackageKey(row.PackageKey).SetVariantKey(row.VariantKey).SetCapacityHeld(variant != nil).SetPaymentState(ordercontract.PaymentStateUnissued).SetData(doc).SetCreatedAt(now).Save(ctx)
	if err != nil {
		return "", err
	}
	if err = catalog.ClaimCoupon(ctx, tx, row.UserID, contract.ID, data.Discount); err != nil {
		return "", err
	}
	return contract.ID, nil
}

// Events returns ordered timeline entries after an observed revision, with ownership checks.
func (s *Store) Events(ctx context.Context, p *identity.Principal, id string, admin bool, after int) ([]Event, error) {
	if _, err := owned(ctx, s.client, p, id, admin); err != nil {
		return nil, err
	}
	if after < 0 {
		return nil, ErrConflict
	}
	rows, err := s.client.OrderEvent.Query().Where(orderevent.OrderIDEQ(id), orderevent.VersionGT(after)).Order(ent.Asc(orderevent.FieldVersion)).Limit(50).All(ctx)
	if err != nil {
		return nil, err
	}
	result := make([]Event, 0, len(rows))
	for _, row := range rows {
		result = append(result, Event{row.ID, row.Version, row.Action, row.Message, row.ActorRole, row.CreatedAt})
	}
	return result, nil
}

func retireUnissued(ctx context.Context, tx *ent.Tx, row *ent.Order) error {
	if row.CurrentContract == "" {
		return nil
	}
	count, err := tx.OrderContract.Update().Where(ordercontract.IDEQ(row.CurrentContract), ordercontract.OrderIDEQ(row.ID), ordercontract.PaymentStateEQ(ordercontract.PaymentStateUnissued)).SetPaymentState(ordercontract.PaymentStateRetired).ClearActiveOrderID().SetCapacityHeld(false).Save(ctx)
	if err != nil {
		return err
	}
	if count != 1 {
		return ErrConflict
	}
	_, err = tx.CouponClaim.Update().Where(couponclaim.ContractIDEQ(row.CurrentContract), couponclaim.StateEQ(couponclaim.StateHeld)).SetState(couponclaim.StateReleased).Save(ctx)
	return err
}
