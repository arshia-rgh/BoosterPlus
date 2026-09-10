package orders

import (
	"context"
	"slices"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/orderquote"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func changed(ctx context.Context, tx *ent.Tx, row *ent.Order, now time.Time, apply func(*ent.OrderUpdate)) (*ent.Order, error) {
	if row.Version >= 2147483646 {
		return nil, ErrConflict
	}
	update := tx.Order.Update().Where(order.IDEQ(row.ID), order.VersionEQ(row.Version)).AddVersion(1).SetUpdatedAt(now)
	apply(update)
	count, err := update.Save(ctx)
	if err != nil {
		return nil, err
	}
	if count != 1 {
		return nil, ErrConflict
	}
	return tx.Order.Get(ctx, row.ID)
}
func supersede(ctx context.Context, tx *ent.Tx, row *ent.Order) error {
	if row.CurrentQuote == "" {
		return nil
	}
	count, err := tx.OrderQuote.Update().Where(orderquote.IDEQ(row.CurrentQuote), orderquote.OrderIDEQ(row.ID), orderquote.StateEQ(orderquote.StateIssued)).SetState(orderquote.StateSuperseded).Save(ctx)
	if err != nil {
		return err
	}
	if count != 1 {
		return ErrConflict
	}
	return nil
}

// IssueQuote proposes an immutable agreement for a custom order. It cannot
// change a previously accepted contract or grant payment/fulfillment eligibility.
func (s *Store) IssueQuote(ctx context.Context, p *identity.Principal, id string, input QuoteInput) (Detail, error) {
	if err := validateQuote(input, s.instant()); err != nil {
		return Detail{}, err
	}
	var result Detail
	err := s.auth.StaffTransaction(ctx, p, true, func(tx *ent.Tx, current *identity.Principal) error {
		row, readErr := owned(ctx, tx.Client(), current, id, true)
		if readErr != nil {
			return readErr
		}
		if row.Kind != order.KindCustom || row.Version != input.Version || row.CurrentContract != "" || !slices.Contains([]order.State{order.StateSubmitted, order.StateQuoted}, row.State) {
			return ErrConflict
		}
		now := s.instant()
		discount, total, readErr := catalog.ContractDiscount(ctx, tx, row.UserID, row.CouponCode, catalog.CouponOffer{Slug: row.Slug, Service: row.Service, Currency: input.Currency, SubtotalMinor: input.AmountMinor}, now)
		if readErr != nil {
			return readErr
		}
		quoteID := uuid.NewString()
		lines := slices.Clone(input.Lines)
		if len(lines) == 0 {
			lines = []catalog.PriceLine{{Key: "scope", Label: "Quoted scope", AmountMinor: input.AmountMinor}}
		}
		if discount != nil {
			lines = append(lines, catalog.PriceLine{Key: "coupon", Label: "Coupon " + discount.Code, AmountMinor: "-" + discount.AmountMinor})
		}
		data := Commercial{QuoteID: quoteID, Revision: row.QuoteCount + 1, Currency: input.Currency, SubtotalMinor: input.AmountMinor, AmountMinor: total, Discount: discount, Lines: lines, Scope: input.Scope, Reason: input.Reason, DeliveryMinHours: input.DeliveryMinHours, DeliveryMaxHours: input.DeliveryMaxHours, ExpiresAt: input.ExpiresAt.UTC().Truncate(time.Microsecond), TermsVersion: s.auth.TermsVersion()}
		doc, readErr := document(data)
		if readErr != nil {
			return readErr
		}
		if readErr = supersede(ctx, tx, row); readErr != nil {
			return readErr
		}
		if _, readErr = tx.OrderQuote.Create().SetID(quoteID).SetOrderID(row.ID).SetRevision(data.Revision).SetState(orderquote.StateIssued).SetData(doc).SetCreatedBy(current.User.ID).SetCreatedAt(now).Save(ctx); readErr != nil {
			return readErr
		}
		row, readErr = changed(ctx, tx, row, now, func(u *ent.OrderUpdate) { u.SetState(order.StateQuoted).SetCurrentQuote(quoteID).AddQuoteCount(1) })
		if readErr != nil {
			return readErr
		}
		if readErr = event(ctx, tx, current, row, "quote_issued", input.Reason, now); readErr != nil {
			return readErr
		}
		result, readErr = view(ctx, tx.Client(), row)
		return readErr
	})
	return result, err
}

// Quotes returns immutable agreement history for the owning customer or staff.
func (s *Store) Quotes(ctx context.Context, p *identity.Principal, id string, admin bool, before int) ([]QuoteView, error) {
	if _, err := owned(ctx, s.client, p, id, admin); err != nil {
		return nil, err
	}
	if before < 0 {
		return nil, ErrConflict
	}
	q := s.client.OrderQuote.Query().Where(orderquote.OrderIDEQ(id)).Order(ent.Desc(orderquote.FieldRevision)).Limit(20)
	if before > 0 {
		q.Where(orderquote.RevisionLT(before))
	}
	rows, err := q.All(ctx)
	if err != nil {
		return nil, err
	}
	result := make([]QuoteView, 0, len(rows))
	for _, row := range rows {
		data, readErr := decode[Commercial](row.Data)
		if readErr != nil {
			return nil, readErr
		}
		result = append(result, QuoteView{row.ID, string(row.State), data})
	}
	return result, nil
}
func sameDiscount(a, b *catalog.Discount) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return a.CouponID == b.CouponID && a.Version == b.Version && a.Code == b.Code && a.AmountMinor == b.AmountMinor
}
func (s *Store) accept(ctx context.Context, tx *ent.Tx, row *ent.Order, input Action, now time.Time) (string, error) {
	if row.Kind != order.KindCustom || row.State != order.StateQuoted || row.CurrentQuote == "" || row.CurrentQuote != input.QuoteID || row.CurrentContract != "" {
		return "", ErrConflict
	}
	q, err := tx.OrderQuote.Query().Where(orderquote.IDEQ(row.CurrentQuote), orderquote.OrderIDEQ(row.ID), orderquote.StateEQ(orderquote.StateIssued)).Only(ctx)
	if err != nil {
		return "", err
	}
	data, err := decode[Commercial](q.Data)
	if err != nil {
		return "", err
	}
	if !data.ExpiresAt.After(now) {
		return "", ErrConflict
	}
	if !input.AcceptTerms || input.TermsVersion != data.TermsVersion || data.TermsVersion != s.auth.TermsVersion() {
		return "", identity.ErrTerms
	}
	discount, total, err := catalog.ContractDiscount(ctx, tx, row.UserID, row.CouponCode, catalog.CouponOffer{Slug: row.Slug, Service: row.Service, Currency: data.Currency, SubtotalMinor: data.SubtotalMinor}, now)
	if err != nil {
		return "", err
	}
	if total != data.AmountMinor || !sameDiscount(discount, data.Discount) {
		return "", invalid("coupon", "The discount changed. Request a revised quote and accept its updated terms.")
	}
	contractID, err := createContract(ctx, tx, row, data, nil, now)
	if err != nil {
		return "", err
	}
	count, err := tx.OrderQuote.Update().Where(orderquote.IDEQ(q.ID), orderquote.StateEQ(orderquote.StateIssued)).SetState(orderquote.StateAccepted).Save(ctx)
	if err != nil {
		return "", err
	}
	if count != 1 {
		return "", ErrConflict
	}
	return contractID, nil
}

// Transition checks actor, current state, observed revision and required reasons.
// No caller can request paid/queued/completed states before verified fulfillment.
func (s *Store) Transition(ctx context.Context, p *identity.Principal, id, action string, admin bool, input Action) (Detail, error) {
	if !text(input.Message, 0, 2000) {
		return Detail{}, invalid("message", "Use a customer-visible message of at most 2,000 characters.")
	}
	capability := "account"
	allowed := []string{"accept", "decline", "cancel"}
	if admin {
		capability = "admin"
		allowed = []string{"clarify", "reject", "cancel"}
	}
	if !slices.Contains(allowed, action) {
		return Detail{}, invalid("action", "This role cannot perform that order action.")
	}
	if admin && !text(input.Message, 1, 2000) {
		return Detail{}, invalid("message", "Explain this action to the customer.")
	}
	var result Detail
	err := s.auth.AuthorizedTransaction(ctx, p, capability, admin && action == "cancel", func(tx *ent.Tx, current *identity.Principal) error {
		row, readErr := owned(ctx, tx.Client(), current, id, admin)
		if readErr != nil {
			return readErr
		}
		if row.Version != input.Version {
			return ErrConflict
		}
		now := s.instant()
		next := row.State
		contractID := row.CurrentContract
		quoteID := row.CurrentQuote
		switch action {
		case "accept":
			contractID, readErr = s.accept(ctx, tx, row, input, now)
			if readErr != nil {
				return readErr
			}
			next = order.StateAwaitingPayment
		case "decline":
			if row.State != order.StateQuoted || row.CurrentQuote != input.QuoteID || row.CurrentContract != "" {
				return ErrConflict
			}
			count, updateErr := tx.OrderQuote.Update().Where(orderquote.IDEQ(row.CurrentQuote), orderquote.OrderIDEQ(row.ID), orderquote.StateEQ(orderquote.StateIssued)).SetState(orderquote.StateDeclined).Save(ctx)
			if updateErr != nil {
				return updateErr
			}
			if count != 1 {
				return ErrConflict
			}
			next = order.StateSubmitted
			quoteID = ""
		case "clarify", "reject":
			if row.CurrentContract != "" || !slices.Contains([]order.State{order.StateSubmitted, order.StateNeedsInformation, order.StateQuoted}, row.State) {
				return ErrConflict
			}
			if readErr = supersede(ctx, tx, row); readErr != nil {
				return readErr
			}
			quoteID = ""
			next = order.StateNeedsInformation
			if action == "reject" {
				next = order.StateRejected
			}
		case "cancel":
			if !slices.Contains([]order.State{order.StateSubmitted, order.StateNeedsInformation, order.StateQuoted, order.StateAwaitingPayment}, row.State) {
				return ErrConflict
			}
			if readErr = retireUnissued(ctx, tx, row); readErr != nil {
				return readErr
			}
			if row.CurrentContract == "" {
				if readErr = supersede(ctx, tx, row); readErr != nil {
					return readErr
				}
				quoteID = ""
			}
			next = order.StateCancelled
		}
		row, readErr = changed(ctx, tx, row, now, func(u *ent.OrderUpdate) { u.SetState(next).SetCurrentContract(contractID).SetCurrentQuote(quoteID) })
		if readErr != nil {
			return readErr
		}
		message := input.Message
		if message == "" {
			message = "Customer action: " + action + "."
		}
		if readErr = event(ctx, tx, current, row, action, message, now); readErr != nil {
			return readErr
		}
		result, readErr = view(ctx, tx.Client(), row)
		return readErr
	})
	return result, err
}

// Revise validates against the original immutable form and invalidates unaccepted
// quotes. A reorder, unlike a revision, uses the currently published catalog.
func (s *Store) Revise(ctx context.Context, p *identity.Principal, id string, input Revision) (Detail, error) {
	if len(input.CouponCode) > 40 {
		return Detail{}, invalid("coupon_code", "Coupon code is too long.")
	}
	code, codeErr := catalog.NormalizeCouponCode(input.CouponCode)
	if codeErr != nil {
		return Detail{}, codeErr
	}
	input.CouponCode = code
	var result Detail
	err := s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		row, readErr := owned(ctx, tx.Client(), current, id, false)
		if readErr != nil {
			return readErr
		}
		if row.Kind != order.KindCustom || row.CurrentContract != "" || row.Version != input.Version || !slices.Contains([]order.State{order.StateSubmitted, order.StateNeedsInformation, order.StateQuoted}, row.State) {
			return ErrConflict
		}
		release, readErr := decode[catalog.Release](row.Snapshot)
		if readErr != nil {
			return readErr
		}
		validated := catalog.ValidateAnswers(release.Configuration, row.Service, "order", input.Answers, nil)
		if len(validated.Issues) > 0 {
			return &Invalid{validated.Issues}
		}
		answers, readErr := document(validated.Answers)
		if readErr != nil {
			return readErr
		}
		now := s.instant()
		estimate, readErr := document(catalog.Calculate(release, row.Service, estimateSelections(release.Configuration, row.Service, validated.Answers), now))
		if readErr != nil {
			return readErr
		}
		if readErr = supersede(ctx, tx, row); readErr != nil {
			return readErr
		}
		row, readErr = changed(ctx, tx, row, now, func(u *ent.OrderUpdate) {
			u.SetState(order.StateSubmitted).SetCurrentQuote("").SetAnswers(answers).SetEstimate(estimate).SetCouponCode(input.CouponCode)
		})
		if readErr != nil {
			return readErr
		}
		if readErr = event(ctx, tx, current, row, "revised", "Customer revised the request; a fresh review is required.", now); readErr != nil {
			return readErr
		}
		result, readErr = view(ctx, tx.Client(), row)
		return readErr
	})
	return result, err
}
