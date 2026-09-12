package payments

import (
	"context"
	"encoding/json"
	"slices"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationmessage"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/orderevent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentattempt"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentreceipt"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func caseEvidence(ctx context.Context, tx *ent.Tx, orderID, messageID string) error {
	if messageID == "" {
		return nil
	}
	if !validID(messageID) {
		return ErrInvalid
	}
	message, err := tx.ConversationMessage.Get(ctx, messageID)
	if err != nil {
		return err
	}
	if message.Visibility != conversationmessage.VisibilityPublic {
		return identity.ErrForbidden
	}
	thread, err := tx.Conversation.Get(ctx, message.ConversationID)
	if err != nil {
		return err
	}
	if thread.OrderID == nil || *thread.OrderID != orderID {
		return identity.ErrForbidden
	}
	return nil
}
func (s *Store) caseEvent(ctx context.Context, tx *ent.Tx, p *identity.Principal, row *ent.ServiceCase, action, note, messageID string) error {
	if err := caseEvidence(ctx, tx, row.OrderID, messageID); err != nil {
		return err
	}
	_, err := tx.CaseEvent.Create().SetCaseID(row.ID).SetVersion(row.Version).SetAction(action).SetActorID(p.User.ID).SetActorRole(p.User.Role).SetNote(note).SetMessageID(messageID).SetCreatedAt(s.instant()).Save(ctx)
	if err != nil {
		return err
	}
	return s.audit(ctx, tx, p, "case_"+action, row.ID)
}
func (s *Store) casePolicy(ctx context.Context, tx *ent.Tx, row *ent.Order) (map[string]any, error) {
	attempt, err := tx.PaymentAttempt.Query().Where(paymentattempt.ContractIDEQ(row.CurrentContract)).Order(ent.Desc(paymentattempt.FieldCreatedAt)).First(ctx)
	if ent.IsNotFound(err) {
		return map[string]any{}, nil
	}
	if err != nil {
		return nil, err
	}
	return attempt.Policy, nil
}
func (s *Store) caseEligible(ctx context.Context, tx *ent.Tx, row *ent.Order, kind string, policy map[string]any, admin bool) error {
	if row.CurrentContract == "" {
		return ErrConflict
	}
	contract, err := tx.OrderContract.Get(ctx, row.CurrentContract)
	if err != nil {
		return err
	}
	if contract.PaymentState != ordercontract.PaymentStateSettled {
		received, e := tx.PaymentReceipt.Query().Where(paymentreceipt.OrderIDEQ(row.ID), paymentreceipt.StateIn("confirmed", "reversed")).Exist(ctx)
		if e != nil {
			return e
		}
		if !received {
			return ErrConflict
		}
	}
	if kind == "cancellation" && !slices.Contains([]order.State{order.StateQueued, order.StateInProgress, order.StateOnHold, order.StateAwaitingPayment}, row.State) {
		return ErrConflict
	}
	if row.State == order.StateCompleted && !admin {
		parsed, e := decode[Policy](policy)
		if e != nil {
			return e
		}
		if parsed.Remedies != nil {
			completed, e := tx.OrderEvent.Query().Where(orderevent.OrderIDEQ(row.ID), orderevent.ActionEQ("approve_completion")).Order(ent.Desc(orderevent.FieldCreatedAt)).First(ctx)
			if e != nil {
				return e
			}
			if !completed.CreatedAt.Add(time.Duration(parsed.Remedies.DisputeHours) * time.Hour).After(s.instant()) {
				return ErrConflict
			}
		}
	}
	return nil
}

// OpenCase records the actual accepted policy and holds active work atomically.
func (s *Store) OpenCase(ctx context.Context, p *identity.Principal, id string, admin bool, input CaseInput) (CaseView, error) {
	if !validID(id) || !validID(input.RequestKey) || !validText(input.Note, 10, 2000) || !slices.Contains([]string{"cancellation", "dispute", "no_show", "missed_target", "payment"}, input.Kind) {
		return CaseView{}, ErrInvalid
	}
	raw, err := json.Marshal(struct {
		OrderID string
		Input   CaseInput
	}{id, input})
	if err != nil {
		return CaseView{}, ErrInvalid
	}
	digest := s.auth.RequestDigest("case-open", raw)
	capability := "account"
	if admin {
		capability = "admin"
	}
	var result CaseView
	err = s.auth.AuthorizedTransaction(ctx, p, capability, admin, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := owned(ctx, tx.Client(), current, id, admin)
		if e != nil {
			return e
		}
		existing, e := tx.ServiceCase.Get(ctx, input.RequestKey)
		if e != nil && !ent.IsNotFound(e) {
			return e
		}
		if existing != nil {
			if existing.OrderID != id || existing.RequestHash != digest {
				return ErrConflict
			}
			result, e = caseView(existing)
			return e
		}
		duplicate, e := tx.ServiceCase.Query().Where(servicecase.OrderIDEQ(id), servicecase.Or(servicecase.ActiveOrderIDNotNil(), servicecase.KindEQ(input.Kind))).Exist(ctx)
		if e != nil {
			return e
		}
		if duplicate {
			return ErrConflict
		}
		policy, e := s.casePolicy(ctx, tx, row)
		if e != nil {
			return e
		}
		if e = s.caseEligible(ctx, tx, row, input.Kind, policy, admin); e != nil {
			return e
		}
		record, e := tx.ServiceCase.Create().SetID(input.RequestKey).SetRequestHash(digest).SetOrderID(id).SetActiveOrderID(id).SetUserID(row.UserID).SetKind(input.Kind).SetPolicy(policy).SetPreviousState(string(row.State)).SetCreatedAt(s.instant()).SetUpdatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		if e = s.caseEvent(ctx, tx, current, record, "opened", input.Note, input.MessageID); e != nil {
			return e
		}
		state := row.State
		if state == order.StateQueued || state == order.StateInProgress {
			state = order.StateOnHold
		}
		if e = s.event(ctx, tx, row, state, "case_opened", "A service case was opened. Active work is held while it is reviewed."); e != nil {
			return e
		}
		result, e = caseView(record)
		return e
	})
	return result, err
}
