package payments

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/caseevent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// CaseInput binds a customer's single-use request key to an immutable request.
type CaseInput struct {
	RequestKey string `json:"request_key"`
	Kind       string `json:"kind"`
	Note       string `json:"note"`
	MessageID  string `json:"message_id"`
}

// CaseChange requires a freshly observed revision for every action.
type CaseChange struct {
	Version   int    `json:"version"`
	Note      string `json:"note"`
	MessageID string `json:"message_id"`
	Outcome   string `json:"outcome"`
}

// CaseView excludes staff identifiers and internal conversations.
type CaseView struct {
	ID          string     `json:"id"`
	OrderID     string     `json:"order_id"`
	Kind        string     `json:"kind"`
	State       string     `json:"state"`
	Outcome     string     `json:"outcome"`
	Version     int        `json:"version"`
	Appeals     int        `json:"appeals"`
	AppealUntil *time.Time `json:"appeal_until"`
	Policy      *Remedies  `json:"policy"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// CaseEntry is a private customer-visible review event.
type CaseEntry struct {
	Role      string    `json:"role"`
	ID        string    `json:"id"`
	Version   int       `json:"version"`
	Action    string    `json:"action"`
	Note      string    `json:"note"`
	MessageID string    `json:"message_id"`
	CreatedAt time.Time `json:"created_at"`
}

// CaseHistory is bounded; event pagination uses the explicit next revision.
type CaseHistory struct {
	Cases []CaseView `json:"cases"`
}

// CaseDetail carries one case and a bounded chronological event page.
type CaseDetail struct {
	Case   CaseView    `json:"case"`
	Events []CaseEntry `json:"events"`
	Next   int         `json:"next"`
}

func caseView(row *ent.ServiceCase) (CaseView, error) {
	policy, err := decode[struct {
		Remedies *Remedies `json:"remedies"`
	}](row.Policy)
	return CaseView{row.ID, row.OrderID, row.Kind, row.State, row.Outcome, row.Version, row.AppealCount, row.AppealUntil, policy.Remedies, row.CreatedAt, row.UpdatedAt}, err
}

// Cases lists the private cases for an authorized order.
func (s *Store) Cases(ctx context.Context, p *identity.Principal, id string, admin bool) (CaseHistory, error) {
	result := CaseHistory{Cases: []CaseView{}}
	if _, err := owned(ctx, s.client, p, id, admin); err != nil {
		return result, err
	}
	rows, err := s.client.ServiceCase.Query().Where(servicecase.OrderIDEQ(id)).Order(ent.Desc(servicecase.FieldCreatedAt), ent.Desc(servicecase.FieldID)).Limit(50).All(ctx)
	if err != nil {
		return result, err
	}
	for _, row := range rows {
		view, e := caseView(row)
		if e != nil {
			return result, e
		}
		result.Cases = append(result.Cases, view)
	}
	return result, nil
}

// Case reads customer-visible evidence after checking order ownership.
func (s *Store) Case(ctx context.Context, p *identity.Principal, id string, admin bool, after int) (CaseDetail, error) {
	result := CaseDetail{Events: []CaseEntry{}}
	if after < 0 || after >= maxVersion || !validID(id) {
		return result, ErrInvalid
	}
	row, err := s.client.ServiceCase.Get(ctx, id)
	if err != nil {
		return result, err
	}
	if _, err = owned(ctx, s.client, p, row.OrderID, admin); err != nil {
		return result, err
	}
	result.Case, err = caseView(row)
	if err != nil {
		return result, err
	}
	events, err := s.client.CaseEvent.Query().Where(caseevent.CaseIDEQ(id), caseevent.VersionGT(after)).Order(ent.Asc(caseevent.FieldVersion)).Limit(51).All(ctx)
	if err != nil {
		return result, err
	}
	if len(events) > 50 {
		events = events[:50]
		result.Next = events[49].Version
	}
	for _, event := range events {
		result.Events = append(result.Events, CaseEntry{event.ActorRole, event.ID, event.Version, event.Action, event.Note, event.MessageID, event.CreatedAt})
	}
	return result, nil
}
