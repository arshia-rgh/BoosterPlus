package fulfillment

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/booking"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/availabilityevents"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func handoffValidation(row *ent.Order, work *ent.Fulfillment) (catalog.Validation, error) {
	release, _, answers, err := definition(row)
	if err != nil {
		return catalog.Validation{}, err
	}
	extra, err := decode[catalog.Answers](work.Answers)
	if err != nil {
		return catalog.Validation{}, err
	}
	for key, value := range extra {
		answers[key] = value
	}
	var variant *catalog.Variant
	for _, pack := range release.Configuration.Packages {
		if pack.Key == row.PackageKey {
			for _, v := range pack.Variants {
				if v.Key == row.VariantKey {
					variant = &v
				}
			}
		}
	}
	return catalog.ValidateAnswers(release.Configuration, row.Service, "fulfillment", answers, variant), nil
}
func (s *Store) canStart(ctx context.Context, tx *ent.Tx, row *ent.Order, work *ent.Fulfillment) error {
	blocked, err := tx.ServiceCase.Query().Where(servicecase.ActiveOrderIDEQ(row.ID)).Exist(ctx)
	if err != nil {
		return err
	}
	if blocked {
		return ErrConflict
	}
	validated, err := handoffValidation(row, work)
	if err != nil {
		return err
	}
	if len(validated.Issues) > 0 {
		return &catalog.Invalid{Issues: validated.Issues}
	}
	if work.Mode == "account" {
		ok, e := tx.SecretBundle.Query().Where(secretbundle.PurposeEQ(secretbundle.PurposeGameAccess), secretbundle.ResourceIDEQ(row.ID), secretbundle.OwnerIDEQ(row.UserID), secretbundle.StateEQ(secretbundle.StateActive), secretbundle.ExpiresAtGT(s.now())).Exist(ctx)
		if e != nil {
			return e
		}
		if !ok {
			return ErrConflict
		}
	}
	if work.Mode == "together" {
		ok, e := tx.Booking.Query().Where(booking.OrderIDEQ(row.ID), booking.AssignedIDEQ(work.AssignedID), booking.StateEQ(booking.StateConfirmed), booking.EndsAtGT(s.now())).Exist(ctx)
		if e != nil {
			return e
		}
		if !ok {
			return ErrConflict
		}
	}
	return nil
}

// Transition guards execution changes and reserves final completion for admins.
func (s *Store) Transition(ctx context.Context, p *identity.Principal, id, audience, action string, input Update) (View, error) {
	if audience != "admin" && audience != "booster" {
		return View{}, identity.ErrForbidden
	}
	if !bounded(input.Note, 1, 2000) || input.Version < 1 || input.Version >= 2147483646 || input.Progress < 0 || input.Progress > 99 {
		return View{}, ErrInvalid
	}
	if action != "estimate" && (input.EstimatedStart != nil || input.EstimatedFinish != nil) {
		return View{}, ErrInvalid
	}
	if action != "progress" && input.Progress != 0 {
		return View{}, ErrInvalid
	}
	var result View
	err := s.auth.AuthorizedTransaction(ctx, p, audience, audience == "admin", func(tx *ent.Tx, current *identity.Principal) error {
		row, e := paid(ctx, tx.Client(), id)
		if e != nil {
			return e
		}
		work, e := record(ctx, tx.Client(), id)
		if e != nil {
			return e
		}
		if e = authority(current, row, work, audience); e != nil {
			return e
		}
		if !active(row) || work.Version != input.Version || row.Version != input.OrderVersion || row.Version >= 2147483646 {
			return ErrConflict
		}
		if action == "progress" || action == "submit_completion" || action == "approve_completion" {
			blocked, caseErr := tx.ServiceCase.Query().Where(servicecase.ActiveOrderIDEQ(row.ID)).Exist(ctx)
			if caseErr != nil {
				return caseErr
			}
			if blocked {
				return ErrConflict
			}
		}
		now := s.now().UTC()
		change := tx.Fulfillment.UpdateOneID(work.ID).AddVersion(1).SetCurrentNote(input.Note).SetUpdatedAt(now)
		next := row.State
		switch action {
		case "start", "resume":
			if (action == "start" && row.State != order.StateQueued) || (action == "resume" && row.State != order.StateOnHold) {
				return ErrConflict
			}
			if e = s.canStart(ctx, tx, row, work); e != nil {
				return e
			}
			next = order.StateInProgress
		case "hold":
			if row.State == order.StateOnHold {
				return ErrConflict
			}
			next = order.StateOnHold
			change.SetCompletionPending(false)
		case "progress":
			if row.State != order.StateInProgress || work.CompletionPending {
				return ErrConflict
			}
			change.SetProgress(input.Progress)
		case "submit_completion":
			if row.State != order.StateInProgress || work.CompletionPending {
				return ErrConflict
			}
			change.SetCompletionPending(true)
		case "approve_completion":
			if audience != "admin" {
				return identity.ErrForbidden
			}
			if row.State != order.StateInProgress || !work.CompletionPending {
				return ErrConflict
			}
			if e = s.cancelBookingsInTx(ctx, tx, current, row.ID, "Order completed; future sessions closed."); e != nil {
				return e
			}
			next = order.StateCompleted
			change.SetProgress(100).SetCompletionPending(false).AddAccessVersion(1)
			if e = s.revokeInTx(ctx, tx, current, row, "completed"); e != nil {
				return e
			}
			if _, e = tx.OrderContract.UpdateOneID(row.CurrentContract).SetCapacityHeld(false).Save(ctx); e != nil {
				return e
			}
			if e = availabilityevents.Changed(ctx, tx, row.GameID); e != nil {
				return e
			}
		case "return_completion":
			if audience != "admin" {
				return identity.ErrForbidden
			}
			if !work.CompletionPending {
				return ErrConflict
			}
			change.SetCompletionPending(false)
		case "estimate":
			if audience != "admin" {
				return identity.ErrForbidden
			}
			if input.EstimatedStart == nil || input.EstimatedFinish == nil || input.EstimatedStart.Before(now) || input.EstimatedFinish.Before(*input.EstimatedStart) || input.EstimatedFinish.After(now.Add(366*24*time.Hour)) {
				return ErrInvalid
			}
			change.SetEstimatedStart(*input.EstimatedStart).SetEstimatedFinish(*input.EstimatedFinish).ClearForecast()
		default:
			return ErrInvalid
		}
		work, e = change.Save(ctx)
		if e != nil {
			return e
		}
		row, e = tx.Order.UpdateOneID(row.ID).AddVersion(1).SetState(next).SetUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		if e = audit(ctx, tx, current, row, action, input.Note, now); e != nil {
			return e
		}
		result, e = view(ctx, tx.Client(), row, work, audience)
		return e
	})
	return result, err
}

// SaveHandoff validates only later-stage inputs against the immutable purchased release.
func (s *Store) SaveHandoff(ctx context.Context, p *identity.Principal, id string, input Handoff) (View, error) {
	if input.Version < 1 || input.Version >= 2147483646 || len(input.Answers) > 40 {
		return View{}, ErrInvalid
	}
	var result View
	err := s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := paid(ctx, tx.Client(), id)
		if e != nil {
			return e
		}
		work, e := record(ctx, tx.Client(), id)
		if e != nil {
			return e
		}
		if e = authority(current, row, work, "account"); e != nil {
			return e
		}
		if !active(row) || work.Version != input.Version || row.Version != input.OrderVersion || row.Version >= 2147483646 {
			return ErrConflict
		}
		_, service, _, e := definition(row)
		if e != nil {
			return e
		}
		allowed := map[string]bool{}
		for _, field := range service.Fields {
			if field.Stage == "fulfillment" {
				allowed[field.Key] = true
			}
		}
		for key := range input.Answers {
			if !allowed[key] {
				return ErrInvalid
			}
		}
		data, e := document(input.Answers)
		if e != nil {
			return e
		}
		work.Answers = data
		validated, e := handoffValidation(row, work)
		if e != nil {
			return e
		}
		if len(validated.Issues) > 0 {
			return &catalog.Invalid{Issues: validated.Issues}
		}
		normalized := catalog.Answers{}
		for key, value := range validated.Answers {
			if allowed[key] {
				normalized[key] = value
			}
		}
		data, e = document(normalized)
		if e != nil {
			return e
		}
		now := s.now().UTC()
		work, e = tx.Fulfillment.UpdateOneID(work.ID).AddVersion(1).SetAnswers(data).SetUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		row, e = tx.Order.UpdateOneID(row.ID).AddVersion(1).SetUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		if e = audit(ctx, tx, current, row, "handoff_updated", "Fulfillment information updated.", now); e != nil {
			return e
		}
		result, e = view(ctx, tx.Client(), row, work, "account")
		return e
	})
	return result, err
}
