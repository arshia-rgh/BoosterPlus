//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/transferrecord"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
)

func TestFinanceReviewPrivateRationaleAndExactCapacity(t *testing.T) {
	f := refundDB(t)
	ctx := t.Context()
	detail, err := f.store.Case(ctx, f.base.admin, f.caseID, true, 0)
	if err != nil {
		t.Fatal(err)
	}
	input := payments.CaseChange{Version: detail.Case.Version, Note: "The customer-visible explanation.", InternalRationale: "Private staff reasoning only."}
	if _, err = f.store.ChangeCase(ctx, f.base.buyer, f.caseID, "reply", false, input); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer wrote staff rationale", err)
	}
	if _, err = f.store.ChangeCase(ctx, f.base.admin, f.caseID, "reply", true, input); err != nil {
		t.Fatal(err)
	}
	staff, err := f.store.Case(ctx, f.base.admin, f.caseID, true, 0)
	if err != nil {
		t.Fatal(err)
	}
	if staff.Events[len(staff.Events)-1].InternalRationale != input.InternalRationale {
		t.Fatal("staff rationale missing")
	}
	customer, err := f.store.Case(ctx, f.base.buyer, f.caseID, false, 0)
	if err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(customer)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(raw), "internal_rationale") || strings.Contains(string(raw), input.InternalRationale) {
		t.Fatal("private rationale leaked")
	}
	transfer := f.proposal(t, "4.000000000000000001")
	history, err := f.store.History(ctx, f.base.admin, f.orderID, true)
	if err != nil || len(history.Receipts) != 1 {
		t.Fatal("history", err)
	}
	if history.Receipts[0].RefundableAmount == nil || *history.Receipts[0].RefundableAmount != "8.340000009999999999" {
		t.Fatal("inexact remaining reserve", history.Receipts)
	}
	if _, err = f.store.CancelRefund(ctx, f.base.admin, transfer.ID, payments.TransferChange{Version: transfer.Version, Reason: "Cancel this unissued proposal after review."}); err != nil {
		t.Fatal(err)
	}
	history, err = f.store.History(ctx, f.base.admin, f.orderID, true)
	if err != nil || history.Receipts[0].RefundableAmount == nil || *history.Receipts[0].RefundableAmount != "12.34000001" {
		t.Fatal("cancelled reserve not released", err)
	}
}

func TestFinanceReviewTransferSnapshotsAndOwnership(t *testing.T) {
	f := refundDB(t)
	ctx := t.Context()
	transfer := f.recipient(t, f.proposal(t, "1.000000000000000001"))
	original := transfer.Recipient.Address
	transfer, err := f.store.ConfirmRecipient(ctx, f.base.buyer, transfer.ID, payments.RecipientInput{Version: transfer.Version, Address: "second-synthetic-destination", Memo: "new-tag", Accept: true})
	if err != nil {
		t.Fatal(err)
	}
	history, err := f.store.ReadTransferHistory(ctx, f.base.buyer, transfer.ID, "refund", false, 0)
	if err != nil || len(history.Events) != 3 {
		t.Fatal("missing transfer history", err)
	}
	if history.Events[1].Snapshot == nil || history.Events[1].Snapshot.Recipient.Address != original || history.Events[2].Snapshot == nil || history.Events[2].Snapshot.Recipient.Address != transfer.Recipient.Address {
		t.Fatal("recipient history overwritten")
	}
	if _, err = f.store.ReadTransferHistory(ctx, f.base.other, transfer.ID, "refund", false, 0); err == nil {
		t.Fatal("other beneficiary accessed history")
	}
	if _, err = f.store.ReadTransferHistory(ctx, f.base.buyer, transfer.ID, "refund", true, 0); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer used staff history", err)
	}
	if _, err = f.store.ReadTransferHistory(ctx, f.base.admin, transfer.ID, "seller_payout", true, 0); err == nil {
		t.Fatal("incorrect transfer kind disclosed")
	}
	for _, after := range []int{-1, 2147483647} {
		if _, err = f.store.ReadTransferHistory(ctx, f.base.admin, transfer.ID, "refund", true, after); !errors.Is(err, payments.ErrInvalid) {
			t.Fatal("bad history cursor", err)
		}
	}
}

func TestFinanceReviewReconciliationDeduplicatesPendingReads(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	before, err := f.store.InspectReconciliation(ctx, f.base.admin, "incoming", "900")
	if err != nil || before.Found {
		t.Fatal("unknown reference invented", err)
	}
	if _, err = f.store.InspectReconciliation(ctx, f.base.buyer, "incoming", "900"); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer inspected finance", err)
	}
	input := payments.ReconcileInput{PaymentID: "900", Reason: "Review the exact provider reference."}
	var wait sync.WaitGroup
	failures := make(chan error, 2)
	for range 2 {
		wait.Go(func() { failures <- f.store.RequestReconciliation(ctx, f.base.admin, input) })
	}
	wait.Wait()
	close(failures)
	for failure := range failures {
		if failure != nil {
			t.Fatal(failure)
		}
	}
	review, err := f.store.InspectReconciliation(ctx, f.base.admin, "incoming", "900")
	if err != nil || !review.Found || review.Job == nil || review.Job.State != "pending" || review.CheckedAt != nil {
		t.Fatal("incorrect pending inspection", review, err)
	}
	assertFinanceReviewContract(t, "ReconciliationReview", review)
	var count int
	if err = f.base.auth.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM jobs WHERE idempotency_key LIKE 'finance-manual:%'").Scan(&count); err != nil || count != 1 {
		t.Fatal("duplicate pending reads", count, err)
	}
	executeSQL(t, f.base.auth.db, "UPDATE jobs SET state='failed' WHERE id=?", review.Job.ID)
	if err = f.store.RequestReconciliation(ctx, f.base.admin, input); err != nil {
		t.Fatal(err)
	}
	retried, err := f.store.InspectReconciliation(ctx, f.base.admin, "incoming", "900")
	if err != nil || retried.Job == nil || retried.Job.ID == review.Job.ID {
		t.Fatal("failed check could not retry", err)
	}
}

func TestFinanceReviewBoundedHistoricalEvidence(t *testing.T) {
	f := refundDB(t)
	ctx := t.Context()
	transfer := f.proposal(t, "1")
	// Old events have no recoverable destination; do not invent one from today's recipient.
	executeSQL(t, f.base.auth.db, "UPDATE transfer_events SET snapshot=NULL WHERE transfer_id=?", transfer.ID)
	events := make([]*ent.TransferEventCreate, 0, 51)
	for version := 2; version <= 52; version++ {
		events = append(events, f.base.auth.client.TransferEvent.Create().SetTransferID(transfer.ID).SetVersion(version).SetAction("fixture_review").SetActorID(f.base.admin.User.ID).SetCreatedAt(time.Unix(f.base.auth.clock.Load(), 0)))
	}
	if _, err := f.base.auth.client.TransferEvent.CreateBulk(events...).Save(ctx); err != nil {
		t.Fatal(err)
	}
	attempts := make([]*ent.TransferAttemptCreate, 0, 11)
	for index := range 11 {
		instant := time.Unix(f.base.auth.clock.Load(), 0).Add(time.Duration(index) * time.Second)
		attempts = append(attempts, f.base.auth.client.TransferAttempt.Create().SetTransferID(transfer.ID).SetAccount("fixture:synthetic-merchant").SetRecipient(map[string]any{"address": "private-fixture-recipient"}).SetData(map[string]any{"private_payload": "never expose"}).SetCheckedAt(instant.Add(-time.Hour)).SetCreatedAt(instant).SetUpdatedAt(instant))
	}
	if _, err := f.base.auth.client.TransferAttempt.CreateBulk(attempts...).Save(ctx); err != nil {
		t.Fatal(err)
	}
	first, err := f.store.ReadTransferHistory(ctx, f.base.buyer, transfer.ID, "refund", false, 0)
	if err != nil || len(first.Events) != 50 || first.Next != 50 || first.Events[0].Snapshot != nil || len(first.Attempts) != 10 || !first.MoreAttempts {
		t.Fatal("unbounded or invented history", err)
	}
	assertFinanceReviewContract(t, "TransferHistory", first)
	for _, attempt := range first.Attempts {
		if attempt.CheckedAt != nil {
			t.Fatal("unread attempt implied provider check")
		}
	}
	last, err := f.store.ReadTransferHistory(ctx, f.base.buyer, transfer.ID, "refund", false, first.Next)
	if err != nil || len(last.Events) != 2 || last.Next != 0 || last.Events[0].Version != 51 {
		t.Fatal("broken history continuation", err)
	}
	raw, err := json.Marshal(first)
	if err != nil {
		t.Fatal(err)
	}
	for _, private := range []string{"actor_id", "private_payload", "private-fixture-recipient", "fixture:synthetic-merchant"} {
		if strings.Contains(string(raw), private) {
			t.Fatal("private history projection leaked", private)
		}
	}
}

func TestFinanceReviewOutgoingInspectionAndPausedReconciliation(t *testing.T) {
	f := refundDB(t)
	ctx := t.Context()
	transfer := f.recipient(t, f.proposal(t, "1.000000000000000001"))
	f.decision(t)
	transfer, err := f.store.ApproveRefund(ctx, f.base.admin, transfer.ID, payments.TransferChange{Version: transfer.Version, Reason: "Reviewed the exact terms and recipient."})
	if err != nil {
		t.Fatal(err)
	}
	f.issue(t, transfer.ID)
	f.read(t)
	f.store.ConfigureOutgoing(f.provider, false)
	input := payments.ReconcileInput{PaymentID: "71", Reason: "Check existing transfer while new outgoing transfers are paused."}
	if err = f.store.RequestOutgoingRead(ctx, f.base.admin, input); err != nil {
		t.Fatal("paused reconciliation failed", err)
	}
	review, err := f.store.InspectReconciliation(ctx, f.base.admin, "outgoing", "71")
	if err != nil || !review.Found || review.TransferID != transfer.ID || review.OrderID != f.orderID || review.CaseID != f.caseID || review.Job == nil || review.CheckedAt == nil || review.ObservedAt == nil {
		t.Fatal("missing outgoing evidence", review, err)
	}
	if err = f.store.RequestOutgoingRead(ctx, f.base.admin, input); err != nil {
		t.Fatal(err)
	}
	duplicate, err := f.store.InspectReconciliation(ctx, f.base.admin, "outgoing", "71")
	if err != nil || duplicate.Job == nil || duplicate.Job.ID != review.Job.ID {
		t.Fatal("outgoing duplicate job", err)
	}
	f.base.auth.clock.Add(30)
	f.provider.unavailable = true
	record, err := f.base.auth.client.TransferRecord.Query().Where(transferrecord.ProviderIDEQ("71")).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if err = f.store.ReconcileTransfer(ctx, record.ID); !errors.Is(err, nowpayments.ErrUnavailable) {
		t.Fatal("missing provider failure", err)
	}
	stale, err := f.store.InspectReconciliation(ctx, f.base.admin, "outgoing", "71")
	if err != nil || stale.CheckedAt == nil || stale.ObservedAt == nil || !stale.CheckedAt.After(*stale.ObservedAt) || !stale.ObservedAt.Equal(*review.ObservedAt) {
		t.Fatal("failed read lost original observation", err)
	}
	foreign := payments.New(f.base.auth.client, f.base.auth.service, f.paymentFixture.provider, "fixture:other-merchant", false, func() time.Time { return time.Unix(f.base.auth.clock.Load(), 0) })
	hidden, err := foreign.InspectReconciliation(ctx, f.base.admin, "outgoing", "71")
	if err != nil || hidden.Found {
		t.Fatal("cross-merchant evidence exposed", err)
	}
	for _, direction := range []string{"incoming", "outgoing", "unknown"} {
		if _, err = f.store.InspectReconciliation(ctx, f.base.admin, direction, "not-a-reference"); !errors.Is(err, payments.ErrInvalid) {
			t.Fatal("invalid reference accepted", err)
		}
	}
}

func assertFinanceReviewContract(t *testing.T, schema string, value any) {
	t.Helper()
	var contract, response any
	if err := json.Unmarshal(api.Contract, &contract); err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	if err = json.Unmarshal(raw, &response); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err = compiler.AddResource("contract.json", contract); err != nil {
		t.Fatal(err)
	}
	compiled, err := compiler.Compile("contract.json#/components/schemas/" + schema)
	if err != nil {
		t.Fatal(err)
	}
	if err = compiled.Validate(response); err != nil {
		t.Fatal(schema, err)
	}
}
