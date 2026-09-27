//go:build integration

package integration

import (
	"errors"
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	work "github.com/arshia-rgh/BoosterPlus/backend/internal/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func TestBoosterDiscoveryAudienceAndAgenda(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	detail := f.paid(t, "duo")
	v := f.handoff(t, f.assign(t, detail))
	window, start := f.availability(t)
	proposal := f.propose(t, v, window, start)
	list, err := f.work.ListFiltered(ctx, f.booster, "booster", work.ListFilters{Search: strings.ToUpper(v.Game), State: "active"})
	if err != nil || len(list.Items) != 1 || list.Items[0].OrderID != v.OrderID {
		t.Fatal("owned search", list, err)
	}
	list, err = f.work.ListFiltered(ctx, f.second, "booster", work.ListFilters{Search: v.OrderID})
	if err != nil || len(list.Items) != 0 {
		t.Fatal("foreign reference exposed", list, err)
	}
	if _, err = f.work.ListFiltered(ctx, f.buyer, "booster", work.ListFilters{}); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer discovered staff work", err)
	}
	for _, filters := range []work.ListFilters{{State: "administrator"}, {Search: strings.Repeat("a", 161)}, {After: "invalid"}} {
		if _, err = f.work.ListFiltered(ctx, f.booster, "booster", filters); !errors.Is(err, work.ErrInvalid) {
			t.Fatal("invalid filters accepted", err)
		}
	}
	agenda, err := f.work.Agenda(ctx, f.booster, "", "")
	if err != nil || len(agenda.Items) != 1 || agenda.Items[0].ID != proposal.ID || agenda.Items[0].State != "proposed" {
		t.Fatal("proposed agenda", agenda, err)
	}
	agenda, err = f.work.Agenda(ctx, f.booster, "", "confirmed")
	if err != nil || len(agenda.Items) != 0 {
		t.Fatal("proposal treated as confirmed", agenda, err)
	}
	if _, err = f.work.Agenda(ctx, f.buyer, "", ""); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer read agenda", err)
	}
	agenda, err = f.work.Agenda(ctx, f.second, "", "")
	if err != nil || len(agenda.Items) != 0 {
		t.Fatal("foreign agenda", agenda, err)
	}
	if _, err = f.work.ChangeBooking(ctx, f.booster, v.OrderID, proposal.ID, "booster", "confirm", work.BookingAction{Version: proposal.Version, Note: "Confirmed synthetic slot"}); err != nil {
		t.Fatal(err)
	}
	agenda, err = f.work.Agenda(ctx, f.booster, "", "confirmed")
	if err != nil || len(agenda.Items) != 1 {
		t.Fatal("confirmed missing", agenda, err)
	}
	// A stale booking owner alone must never grant access after reassignment.
	if _, err = f.auth.client.Fulfillment.Update().Where(fulfillment.OrderIDEQ(v.OrderID)).SetAssignedID(f.second.User.ID).Save(ctx); err != nil {
		t.Fatal(err)
	}
	agenda, err = f.work.Agenda(ctx, f.booster, "", "")
	if err != nil || len(agenda.Items) != 0 {
		t.Fatal("stale assignee agenda", agenda, err)
	}
	if _, err = f.auth.client.Fulfillment.Update().Where(fulfillment.OrderIDEQ(v.OrderID)).SetAssignedID(f.booster.User.ID).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.auth.client.OrderContract.UpdateOneID(detail.Contract.ID).SetPaymentState(ordercontract.PaymentStateRetired).Save(ctx); err != nil {
		t.Fatal(err)
	}
	agenda, err = f.work.Agenda(ctx, f.booster, "", "")
	if err != nil || len(agenda.Items) != 0 {
		t.Fatal("retired contract agenda", agenda, err)
	}
	list, err = f.work.ListFiltered(ctx, f.booster, "booster", work.ListFilters{})
	if err != nil || len(list.Items) != 0 {
		t.Fatal("retired contract poisoned queue", list, err)
	}
	if _, err = f.auth.client.OrderContract.UpdateOneID(detail.Contract.ID).SetPaymentState(ordercontract.PaymentStateSettled).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.auth.client.Order.UpdateOneID(v.OrderID).SetState(order.StateCompleted).Save(ctx); err != nil {
		t.Fatal(err)
	}
	agenda, err = f.work.Agenda(ctx, f.booster, "", "")
	if err != nil || len(agenda.Items) != 0 {
		t.Fatal("completed agenda", agenda, err)
	}
	if _, err = f.auth.client.Order.UpdateOneID(v.OrderID).SetState(order.StateQueued).Save(ctx); err != nil {
		t.Fatal(err)
	}
}
