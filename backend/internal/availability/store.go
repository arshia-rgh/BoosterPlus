package availability

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	sub "github.com/arshia-rgh/BoosterPlus/backend/ent/availabilitysubscription"
	target "github.com/arshia-rgh/BoosterPlus/backend/ent/availabilitytarget"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Subscribe starts at the current opening cycle: an already-open offer is not a new alert.
func (s *Store) Subscribe(ctx context.Context, p *identity.Principal, input SubscribeInput) (View, error) {
	var result View
	if !validKey(input.Slug, 80) || (input.Account == nil && (!validKey(input.Package, 48) || !validKey(input.Variant, 48))) || !input.Accept || input.ConsentVersion != ConsentVersion {
		return result, ErrInvalid
	}
	var criteria map[string]any
	if input.Account != nil {
		if input.Package != "" || input.Variant != "" {
			return result, ErrInvalid
		}
		var key string
		var err error
		criteria, key, err = criteriaData(input.Account)
		if err != nil {
			return result, err
		}
		input.Package = "account_inventory"
		input.Variant = key
	}
	e := s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		if current.User.EmailVerifiedAt == nil {
			return identity.ErrForbidden
		}
		offer, e := readTarget(ctx, tx.Client(), &ent.AvailabilityTarget{Slug: input.Slug, PackageKey: input.Package, VariantKey: input.Variant, Criteria: criteria})
		if e != nil {
			return e
		}
		if !offer.exists || !offer.limited {
			return ErrConflict
		}
		t, e := tx.AvailabilityTarget.Query().Where(target.GameIDEQ(offer.gameID), target.PackageKeyEQ(input.Package), target.VariantKeyEQ(input.Variant)).Only(ctx)
		if ent.IsNotFound(e) {
			t, e = tx.AvailabilityTarget.Create().SetGameID(offer.gameID).SetSlug(input.Slug).SetPackageKey(input.Package).SetVariantKey(input.Variant).SetCriteria(criteria).SetStockMarker(offer.marker).SetAvailable(offer.available).SetCycle(0).SetCheckedAt(s.now()).SetCreatedAt(s.now()).Save(ctx)
		}
		if e != nil {
			return e
		}
		if (t.Criteria == nil) != (criteria == nil) {
			return ErrConflict
		}
		// Observe before consent so a delayed change job cannot send pre-consent stock.
		t, e = s.refresh(ctx, tx, t)
		if e != nil {
			return e
		}
		row, e := tx.AvailabilitySubscription.Query().Where(sub.UserIDEQ(current.User.ID), sub.TargetIDEQ(t.ID)).Only(ctx)
		if e == nil {
			if row.State != "active" || row.EmailFingerprint != s.fingerprint(current.User.Email) {
				return ErrConflict
			}
			result, e = s.view(ctx, tx.Client(), row)
			return e
		}
		if !ent.IsNotFound(e) {
			return e
		}
		if e = s.quota(ctx, tx, current.User.ID); e != nil {
			return e
		}
		row, e = tx.AvailabilitySubscription.Create().SetUserID(current.User.ID).SetTargetID(t.ID).SetVersion(1).SetState("active").SetEmailFingerprint(s.fingerprint(current.User.Email)).SetLastCycle(t.Cycle).SetConsentVersion(ConsentVersion).SetSuppressionReason("").SetCreatedAt(s.now()).SetUpdatedAt(s.now()).Save(ctx)
		if e != nil {
			return e
		}
		if e = s.audit(ctx, tx, current.User.ID, "", "subscribed", row.ID); e != nil {
			return e
		}
		result, e = s.view(ctx, tx.Client(), row)
		return e
	})
	return result, e
}
func (s *Store) quota(ctx context.Context, tx *ent.Tx, userID string) error {
	n, e := tx.AvailabilitySubscription.Query().Where(sub.UserIDEQ(userID), sub.StateEQ("active")).Count(ctx)
	if e != nil {
		return e
	}
	if n >= 50 {
		return ErrConflict
	}
	return nil
}

// Change requires owned current consent; reactivation binds the current verified email.
func (s *Store) Change(ctx context.Context, p *identity.Principal, id string, input ChangeInput) (View, error) {
	var result View
	if !validID(id) || input.Version < 1 || input.Version >= maxVersion || input.Active && (!input.Accept || input.ConsentVersion != ConsentVersion) {
		return result, ErrInvalid
	}
	e := s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.AvailabilitySubscription.Query().Where(sub.IDEQ(id), sub.UserIDEQ(current.User.ID)).Only(ctx)
		if e != nil {
			return e
		}
		if row.Version != input.Version {
			return ErrConflict
		}
		update := tx.AvailabilitySubscription.UpdateOne(row).AddVersion(1).SetState("unsubscribed").SetUpdatedAt(s.now()).SetSuppressionReason("")
		action := "unsubscribed"
		if input.Active {
			if current.User.EmailVerifiedAt == nil {
				return identity.ErrForbidden
			}
			if row.State != "active" {
				if e = s.quota(ctx, tx, current.User.ID); e != nil {
					return e
				}
			}
			t, readErr := tx.AvailabilityTarget.Get(ctx, row.TargetID)
			if readErr != nil {
				return readErr
			}
			offer, readErr := readTarget(ctx, tx.Client(), t)
			if readErr != nil {
				return readErr
			}
			if !offer.exists || !offer.limited {
				return ErrConflict
			}
			t, readErr = s.refresh(ctx, tx, t)
			if readErr != nil {
				return readErr
			}
			update.SetState("active").SetEmailFingerprint(s.fingerprint(current.User.Email)).SetConsentVersion(ConsentVersion).SetLastCycle(t.Cycle)
			action = "subscribed"
		}
		row, e = update.Save(ctx)
		if e != nil {
			return e
		}
		if e = s.audit(ctx, tx, current.User.ID, "", action, row.ID); e != nil {
			return e
		}
		result, e = s.view(ctx, tx.Client(), row)
		return e
	})
	return result, e
}

// List uses a bounded stable ID cursor and live ownership authorization.
func (s *Store) List(ctx context.Context, p *identity.Principal, after string) (Listing, error) {
	result := Listing{Subscriptions: []View{}}
	if after != "" && !validID(after) {
		return result, ErrInvalid
	}
	e := s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		q := tx.AvailabilitySubscription.Query().Where(sub.UserIDEQ(current.User.ID)).Order(ent.Asc(sub.FieldID)).Limit(51)
		if after != "" {
			q.Where(sub.IDGT(after))
		}
		rows, e := q.All(ctx)
		if e != nil {
			return e
		}
		if len(rows) > 50 {
			result.Next = rows[49].ID
			rows = rows[:50]
		}
		for _, row := range rows {
			v, viewErr := s.view(ctx, tx.Client(), row)
			if viewErr != nil {
				return viewErr
			}
			result.Subscriptions = append(result.Subscriptions, v)
		}
		return nil
	})
	return result, e
}

// Link inspects or confirms a scoped unsubscribe. GET requests never change consent.
func (s *Store) Link(ctx context.Context, input LinkInput, confirm bool) (LinkView, error) {
	result := LinkView{}
	if !validID(input.ID) || input.Version < 1 || input.Version >= maxVersion || len(input.Token) != 64 {
		return result, nil
	}
	e := s.fenced(ctx, func(tx *ent.Tx) error {
		row, e := tx.AvailabilitySubscription.Get(ctx, input.ID)
		if ent.IsNotFound(e) {
			return nil
		}
		if e != nil {
			return e
		}
		if !s.linkCurrent(row, input) {
			return nil
		}
		result.Current = true
		if !confirm {
			return nil
		}
		if _, e = tx.AvailabilitySubscription.UpdateOne(row).SetState("unsubscribed").AddVersion(1).SetUpdatedAt(s.now()).Save(ctx); e != nil {
			return e
		}
		return s.audit(ctx, tx, "", "scoped-unsubscribe-link", "unsubscribed", row.ID)
	})
	return result, e
}
