package notifications

import (
	"context"
	"strings"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/emailtemplate"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/sitecontent"
)

// currentAction selects only an owned, current immutable event. Older queued
// updates remain useful links, but never claim a superseded status is current.
func (s *Store) currentAction(ctx context.Context, n *ent.Notification) (string, bool, error) {
	switch n.Kind {
	case "order_customer":
		row, err := s.client.Order.Get(ctx, n.ResourceID)
		if ent.IsNotFound(err) {
			return "", false, nil
		}
		if err != nil {
			return "", false, err
		}
		if row.UserID != n.UserID {
			return "", false, nil
		}
		event, err := s.client.OrderEvent.Get(ctx, n.MessageID)
		// Order-linked conversation messages use the same generic notification kind.
		if ent.IsNotFound(err) {
			return "", true, nil
		}
		if err != nil {
			return "", false, err
		}
		if event.OrderID != row.ID {
			return "", false, nil
		}
		if event.Version == row.Version {
			return event.Action, true, nil
		}
	case "submission_seller":
		row, err := s.client.AccountSubmission.Get(ctx, n.ResourceID)
		if ent.IsNotFound(err) {
			return "", false, nil
		}
		if err != nil {
			return "", false, err
		}
		if row.UserID != n.UserID {
			return "", false, nil
		}
		event, err := s.client.SubmissionEvent.Get(ctx, n.MessageID)
		if ent.IsNotFound(err) {
			return "", true, nil
		}
		if err != nil {
			return "", false, err
		}
		if event.SubmissionID != row.ID {
			return "", false, nil
		}
		if event.Version == row.Version {
			return event.Action, true, nil
		}
	}
	return "", true, nil
}

func activityMessage(to, origin, href, kind, action string, copyText sitecontent.Notifications) identity.Message {
	notice := emailtemplate.Event(kind, action)
	subject := copyText.ActivitySubject
	if subject == "New activity on PLAYORA" {
		subject = notice.Heading + " | PLAYORA"
	}
	body := notice.Description
	if intro := strings.TrimSpace(copyText.ActivityIntro); intro != "" && intro != "There is an update in your PLAYORA account." {
		body += "\n\n" + intro
	}
	body += "\n\n" + origin + href + "\n\nChange activity email preferences in your account settings.\n\n" + copyText.Footer
	return identity.Message{To: to, Subject: subject, Body: body, View: emailtemplate.View{Heading: notice.Heading, Preview: notice.Description, ActionLabel: notice.ActionLabel, ActionURL: origin + href}}
}

// emailDestination resolves links at delivery time, so queued notices follow a
// portal-host migration without changing their immutable event/reference data.
func (s *Store) emailDestination(kind, href string) (string, string, error) {
	portal := identity.PortalCustomer
	switch kind {
	case "conversation_staff":
		portal = identity.PortalAdmin
	case "coordination_booster", "booking_staff", "order_staff":
		portal = identity.PortalBooster
	}
	if portal == identity.PortalCustomer {
		return s.origin, href, nil
	}
	destination, err := s.auth.PortalLink(portal, href)
	return "", destination, err
}
