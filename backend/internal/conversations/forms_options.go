package conversations

import (
	"context"
	"errors"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountdelivery"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationform"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/chataccess"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// FormPurposeOption gives only choices available in the current conversation.
type FormPurposeOption struct {
	Key      string   `json:"key"`
	Label    string   `json:"label"`
	Modes    []string `json:"modes"`
	MaxHours int      `json:"max_hours"`
}

// FormOptions is checked again on create; it is not an authorization token.
type FormOptions struct {
	Purposes []FormPurposeOption `json:"purposes"`
	Booster  bool                `json:"booster"`
	Open     bool                `json:"open"`
}

// FormOptions lists the modes and resource-bound purposes currently available to staff.
func (s *Store) FormOptions(ctx context.Context, p *identity.Principal, id string) (FormOptions, error) {
	var result FormOptions
	err := s.auth.AuthorizedTransaction(ctx, p, "admin", false, func(tx *ent.Tx, current *identity.Principal) error {
		result = FormOptions{Purposes: []FormPurposeOption{{"information", "Information", []string{"request", "share"}, 720}}}
		thread, e := owned(ctx, tx.Client(), current, id, true)
		if e != nil {
			return e
		}
		result.Open = thread.State != "resolved"
		_, e = assignedBooster(ctx, tx.Client(), thread)
		result.Booster = e == nil
		if e != nil && !ent.IsNotFound(e) && !errors.Is(e, identity.ErrForbidden) {
			return e
		}
		for _, candidate := range []FormPurposeOption{{"seller_access", "Seller account access", []string{"request"}, 720}, {"buyer_access", "Buyer account delivery", []string{"share"}, 720}, {"game_access", "Boosting account access", []string{"request"}, 720}} {
			in := FormCreate{Purpose: candidate.Key, Mode: candidate.Modes[0], Recipient: "customer", ExpiresAt: s.now().Add(25 * time.Hour)}
			if candidate.Key == "game_access" {
				in.ExpiresAt = s.now().Add(time.Hour)
			}
			_, e = formResource(ctx, tx.Client(), thread, in, s.now())
			var bad *Invalid
			if e != nil {
				if ent.IsNotFound(e) || errors.Is(e, identity.ErrForbidden) || errors.As(e, &bad) {
					continue
				}
				return e
			}
			if candidate.Key == "game_access" {
				row, e := tx.Order.Get(ctx, threadOrder(thread))
				if e != nil {
					return e
				}
				hours, e := formSecretHours(row)
				if e != nil {
					return e
				}
				candidate.MaxHours = hours
			}
			result.Purposes = append(result.Purposes, candidate)
		}
		return nil
	})
	return result, err
}
func (s *Store) checkedFormView(ctx context.Context, c *ent.Client, row *ent.ConversationForm, thread *ent.Conversation, p *identity.Principal, admin bool, now time.Time) (FormView, error) {
	result, err := formView(row, thread, p, admin, now)
	if err != nil {
		return result, err
	}
	if err = formOperationalAccess(ctx, c, thread, row); err != nil {
		if !ent.IsNotFound(err) && !errors.Is(err, identity.ErrForbidden) {
			return result, err
		}
		result.CanRespond = false
		result.CanReveal = false
	}
	if result.CanReveal {
		_, err = chataccess.Bundle(ctx, c, row.ID, now)
		if ent.IsNotFound(err) {
			result.CanReveal = false
		} else if err != nil {
			return result, err
		}
	}
	if row.Purpose == conversationform.PurposeBuyerAccess {
		delivered, e := c.AccountDelivery.Query().Where(accountdelivery.FormIDEQ(row.ID), accountdelivery.StateIn("delivered", "acknowledged")).Exist(ctx)
		if e != nil {
			return result, e
		}
		if !admin && !delivered {
			result.CanReveal = false
		}
		if delivered {
			result.CanCancel = false
		}
	}
	return result, nil
}
