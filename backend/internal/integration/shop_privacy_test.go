//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/privacy"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/sitecontent"
)

func TestShopPrivacyExportOwnRecipientAndAuditBoundary(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	purchase, _, _ := shopPaymentOrder(t, f)
	otherBase := *f.base
	otherBase.buyer = f.base.other
	otherFixture := *f
	otherFixture.base = &otherBase
	foreign, _, _ := shopPaymentOrder(t, &otherFixture)
	for _, entry := range []struct{ orderID, userID, value string }{{purchase.Order.ID, f.base.buyer.User.ID, "synthetic-own-player"}, {foreign.Order.ID, f.base.other.User.ID, "synthetic-foreign-player"}} {
		if _, err := f.base.auth.client.ShopRecipient.Create().SetOrderID(entry.orderID).SetUserID(entry.userID).SetRecipientValues(map[string]string{"player_id": entry.value}).Save(ctx); err != nil {
			t.Fatal(err)
		}
	}
	store := privacy.New(f.base.auth.client, f.base.auth.service, func() time.Time { return time.Unix(f.base.auth.clock.Load(), 0) })
	page, err := store.Export(ctx, f.base.buyer, privacy.ExportInput{Section: "orders"})
	if err != nil || len(page.Records) != 1 || page.Records[0]["id"] != purchase.Order.ID || page.AuditID == "" {
		t.Fatal("own shop export missing", err)
	}
	raw, err := json.Marshal(page)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(raw), "synthetic-own-player") || !strings.Contains(string(raw), "shop_reservation") || strings.Contains(string(raw), "synthetic-foreign-player") {
		t.Fatal("shop export projection incorrect")
	}
	plain, err := f.base.store.Get(ctx, f.base.buyer, purchase.Order.ID, false)
	if err != nil {
		t.Fatal(err)
	}
	raw, err = json.Marshal(plain)
	if err != nil || strings.Contains(string(raw), "synthetic-own-player") {
		t.Fatal("recipient leaked through generic order", err)
	}
	// Erased markers fail closed even if a legacy row retained inconsistent values.
	// Select the actual owned row explicitly; UUID order must not decide ownership.
	executeSQL(t, f.base.auth.db, "UPDATE shop_recipients SET erased_at=NOW() WHERE order_id=?", purchase.Order.ID)
	page, err = store.Export(ctx, f.base.buyer, privacy.ExportInput{Section: "orders"})
	if err != nil {
		t.Fatal(err)
	}
	raw, err = json.Marshal(page)
	if err != nil || strings.Contains(string(raw), "synthetic-own-player") {
		t.Fatal("erased recipient disclosed", err)
	}
	executeSQL(t, f.base.auth.db, "DROP TABLE auth_audits")
	if _, err = store.Export(ctx, f.base.buyer, privacy.ExportInput{Section: "orders"}); err == nil {
		t.Fatal("shop data exported without audit")
	}
}

func TestShopPrivacyReservationHoldAndApprovedErasure(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	purchase, reservation, _ := shopPaymentOrder(t, f)
	recipient, err := f.base.auth.client.ShopRecipient.Create().SetOrderID(purchase.Order.ID).SetUserID(f.base.buyer.User.ID).SetRecipientValues(map[string]string{"player_id": "synthetic-private-destination"}).Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	foreign, err := f.base.auth.client.ShopRecipient.Create().SetOrderID(uuid.NewString()).SetUserID(f.base.other.User.ID).SetRecipientValues(map[string]string{"player_id": "synthetic-other-destination"}).Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	now := func() time.Time { return time.Unix(f.base.auth.clock.Load(), 0) }
	store := privacy.New(f.base.auth.client, f.base.auth.service, now)
	if _, err = store.Request(ctx, f.base.buyer, privacy.RequestInput{PolicyID: uuid.NewString(), Accept: true}); !errors.Is(err, privacy.ErrConflict) {
		t.Fatal("shop deletion bypassed missing owner policy", err)
	}
	owner := privacyOwner(t, f.base)
	content := sitecontent.New(f.base.auth.client, f.base.auth.service, now)
	policy, err := content.Save(ctx, owner, "retention", sitecontent.Input{Data: retentionData(), Label: "shop-retention-fixture", Publish: true})
	if err != nil {
		t.Fatal(err)
	}
	request, err := store.Request(ctx, f.base.buyer, privacy.RequestInput{PolicyID: policy.ReleaseID, Accept: true})
	if err != nil {
		t.Fatal(err)
	}
	// Simulate an old local order expiry without authoritative inventory release.
	if _, err = f.base.auth.client.Order.UpdateOneID(purchase.Order.ID).SetState(order.StateExpired).Save(ctx); err != nil {
		t.Fatal(err)
	}
	request, err = store.Update(ctx, owner, request.ID, true, privacy.Change{Version: request.Version, Action: "review", PolicyID: policy.ReleaseID})
	if err != nil || request.State != "held" {
		t.Fatal("unresolved reservation failed to hold deletion", err)
	}
	if _, err = store.Update(ctx, owner, request.ID, true, privacy.Change{Version: request.Version, Action: "erase", PolicyID: policy.ReleaseID}); !errors.Is(err, privacy.ErrConflict) {
		t.Fatal("held shop identifiers erased", err)
	}
	if _, err = f.base.auth.client.Order.UpdateOneID(purchase.Order.ID).SetState(order.StateAwaitingPayment).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.base.store.Transition(ctx, f.base.buyer, purchase.Order.ID, "cancel", false, orders.Action{Version: purchase.Order.Version}); err != nil {
		t.Fatal(err)
	}
	request, err = store.Update(ctx, owner, request.ID, true, privacy.Change{Version: request.Version, Action: "review", PolicyID: policy.ReleaseID})
	if err != nil || request.State != "reviewed" {
		t.Fatal("closed unpaid shop reservation still held", err)
	}
	request, err = store.Update(ctx, owner, request.ID, true, privacy.Change{Version: request.Version, Action: "erase", PolicyID: policy.ReleaseID})
	if err != nil || request.State != "erased_pending_files" {
		t.Fatal("approved shop erasure failed", err)
	}
	recipient, err = f.base.auth.client.ShopRecipient.Get(ctx, recipient.ID)
	if err != nil || len(recipient.RecipientValues) != 0 || recipient.ErasedAt == nil || recipient.Version != 2 {
		t.Fatal("private recipient values retained", err)
	}
	foreign, err = f.base.auth.client.ShopRecipient.Get(ctx, foreign.ID)
	if err != nil || foreign.RecipientValues["player_id"] != "synthetic-other-destination" || foreign.ErasedAt != nil {
		t.Fatal("foreign recipient erased", err)
	}
	if _, err = f.base.auth.client.OrderContract.Get(ctx, purchase.Contract.ID); err != nil {
		t.Fatal("accepted contract erased", err)
	}
	if _, err = f.base.auth.client.ShopReservation.Get(ctx, reservation.ID); err != nil {
		t.Fatal("reservation evidence erased", err)
	}
	if _, err = store.Export(ctx, f.base.buyer, privacy.ExportInput{Section: "orders"}); err == nil || errors.Is(err, identity.ErrRecent) {
		t.Fatal("erased account retained a usable session", err)
	}
}

func TestShopPrivacyExportPaginationAndStaleSession(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	purchase, _, _ := shopPaymentOrder(t, f)
	ids := []string{purchase.Order.ID}
	builders := make([]*ent.OrderCreate, 0, 100)
	for range 100 {
		id := uuid.NewString()
		ids = append(ids, id)
		builders = append(builders, f.base.auth.client.Order.Create().SetID(id).SetUserID(f.base.buyer.User.ID).SetGameID(f.base.game.ID).SetGameName("Synthetic export game").SetSlug(f.base.game.Slug).SetService("shop").SetKind(order.KindShop).SetRequestKey(uuid.NewString()).SetRequestHash(strings.Repeat("d", 64)).SetState(order.StateExpired).SetAnswers(map[string]any{}).SetSnapshot(map[string]any{}).SetEstimate(map[string]any{}).SetTermsVersion(f.base.auth.cfg.TermsVersion))
	}
	if _, err := f.base.auth.client.Order.CreateBulk(builders...).Save(ctx); err != nil {
		t.Fatal(err)
	}
	recipients := make([]*ent.ShopRecipientCreate, 0, len(ids))
	for _, id := range ids {
		recipients = append(recipients, f.base.auth.client.ShopRecipient.Create().SetOrderID(id).SetUserID(f.base.buyer.User.ID).SetRecipientValues(map[string]string{"player_id": "synthetic-recipient-" + id}))
	}
	if _, err := f.base.auth.client.ShopRecipient.CreateBulk(recipients...).Save(ctx); err != nil {
		t.Fatal(err)
	}
	store := privacy.New(f.base.auth.client, f.base.auth.service, func() time.Time { return time.Unix(f.base.auth.clock.Load(), 0) })
	first, err := store.Export(ctx, f.base.buyer, privacy.ExportInput{Section: "orders"})
	if err != nil || len(first.Records) != 100 || first.Next == "" {
		t.Fatal("bounded shop export first page", err)
	}
	second, err := store.Export(ctx, f.base.buyer, privacy.ExportInput{Section: "orders", After: first.Next})
	if err != nil || len(second.Records) != 1 || second.Next != "" {
		t.Fatal("bounded shop export last page", err)
	}
	seen := map[string]bool{}
	for _, record := range append(first.Records, second.Records...) {
		id, ok := record["id"].(string)
		if !ok || seen[id] {
			t.Fatal("duplicate or invalid exported order")
		}
		seen[id] = true
		raw, e := json.Marshal(record)
		if e != nil || !strings.Contains(string(raw), "synthetic-recipient-"+id) {
			t.Fatal("recipient omitted or attached to wrong order", e)
		}
	}
	if _, err = f.base.auth.client.AuthSession.UpdateOneID(f.base.buyer.Session.ID).SetAuthenticatedAt(time.Unix(f.base.auth.clock.Load(), 0).Add(-time.Hour)).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Export(ctx, f.base.buyer, privacy.ExportInput{Section: "orders"}); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("stale verification disclosed delivery data", err)
	}
}
