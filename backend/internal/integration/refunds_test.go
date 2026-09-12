//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/transferrecord"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

type outgoingFixture struct {
	mu                sync.Mutex
	row               nowpayments.Payout
	creates, verifies int
	ambiguous         bool
	unavailable       bool
}

func (f *outgoingFixture) CheckRecipient(_ context.Context, _ string, _ nowpayments.Recipient) error {
	return nil
}
func (f *outgoingFixture) CreatePayout(_ context.Context, input nowpayments.PayoutRequest) (nowpayments.Payout, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.creates++
	f.row = nowpayments.Payout{ID: "71", BatchID: "70", AttemptID: input.AttemptID, Currency: input.Currency, Amount: input.Amount, Recipient: input.Recipient, Status: "waiting"}
	if f.ambiguous {
		return nowpayments.Payout{}, nowpayments.ErrAmbiguous
	}
	return f.row, nil
}
func (f *outgoingFixture) VerifyPayout(_ context.Context, _ string, _ string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.verifies++
	f.row.Status = "processing"
	return nil
}
func (f *outgoingFixture) GetPayout(_ context.Context, _ string) (nowpayments.Payout, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.unavailable {
		return nowpayments.Payout{}, nowpayments.ErrUnavailable
	}
	return f.row, nil
}
func (f *outgoingFixture) ListPayouts(_ context.Context, _ int) (nowpayments.PayoutPage, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	ids := []string{}
	if f.row.ID != "" {
		ids = append(ids, f.row.ID)
	}
	return nowpayments.PayoutPage{IDs: ids, Pages: 1}, nil
}
func (f *outgoingFixture) status(value string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.row.Status = value
}

type refundFixture struct {
	*paymentFixture
	provider                   *outgoingFixture
	caseID, orderID, receiptID string
}

func refundDB(t *testing.T) *refundFixture {
	t.Helper()
	return refundFromPayment(t, paymentDB(t))
}
func refundFromPayment(t *testing.T, f *paymentFixture) *refundFixture {
	t.Helper()
	ctx := t.Context()
	detail := f.base.create(t, "package")
	a := f.start(t, detail)
	f.issue(t, a)
	f.reconcile(t, f.evidence(t, a, "801", "finished", "12.34000001"))
	history, err := f.store.History(ctx, f.base.buyer, detail.Order.ID, false)
	if err != nil || len(history.Receipts) != 1 {
		t.Fatal("missing source receipt", err)
	}
	value, err := f.store.OpenCase(ctx, f.base.buyer, detail.Order.ID, false, payments.CaseInput{RequestKey: uuid.NewString(), Kind: "cancellation", Note: "Please review cancellation and unused work."})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.base.auth.client.User.UpdateOneID(f.base.admin.User.ID).SetRole(identity.RoleOwner).Save(ctx); err != nil {
		t.Fatal(err)
	}
	f.base.admin = f.base.auth.principalFromSession(t, f.base.admin)
	outgoing := &outgoingFixture{}
	f.store.ConfigureOutgoing(outgoing, true)
	return &refundFixture{f, outgoing, value.ID, detail.Order.ID, history.Receipts[0].ID}
}
func (f *refundFixture) decision(t *testing.T) payments.CaseView {
	t.Helper()
	value, err := f.store.Case(t.Context(), f.base.admin, f.caseID, true, 0)
	if err != nil {
		t.Fatal(err)
	}
	result, err := f.store.ChangeCase(t.Context(), f.base.admin, f.caseID, "decide", true, payments.CaseChange{Version: value.Case.Version, Note: "Reviewed the evidence and propose cancellation.", Outcome: "cancel"})
	if err != nil {
		t.Fatal(err)
	}
	return result
}
func (f *refundFixture) proposal(t *testing.T, amount string) payments.TransferView {
	t.Helper()
	v, err := f.store.ProposeRefund(t.Context(), f.base.admin, f.caseID, payments.RefundInput{RequestKey: uuid.NewString(), ReceiptID: f.receiptID, Amount: amount, Terms: "Return the agreed exact unused portion; synthetic fee terms only."})
	if err != nil {
		t.Fatal(err)
	}
	return v
}
func (f *refundFixture) recipient(t *testing.T, v payments.TransferView) payments.TransferView {
	t.Helper()
	v, err := f.store.ConfirmRecipient(t.Context(), f.base.buyer, v.ID, payments.RecipientInput{Version: v.Version, Address: "synthetic-recipient-address", Memo: "synthetic-tag", Accept: true})
	if err != nil {
		t.Fatal(err)
	}
	return v
}
func (f *refundFixture) latest(t *testing.T, id string) payments.TransferView {
	t.Helper()
	values, err := f.store.Transfers(t.Context(), f.base.buyer, f.orderID, false)
	if err != nil {
		t.Fatal(err)
	}
	for _, v := range values {
		if v.ID == id {
			return v
		}
	}
	t.Fatal("missing refund")
	return payments.TransferView{}
}
func (f *refundFixture) issue(t *testing.T, id string) {
	t.Helper()
	row, err := f.base.auth.client.MoneyTransfer.Get(t.Context(), id)
	if err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(map[string]string{"attempt_id": row.CurrentAttempt})
	if err != nil {
		t.Fatal(err)
	}
	if err = f.store.RefundHandler()(t.Context(), jobs.Job{Payload: raw}); err != nil {
		t.Fatal(err)
	}
}
func (f *refundFixture) read(t *testing.T) {
	t.Helper()
	if err := f.store.DiscoverOutgoing(t.Context()); err != nil {
		t.Fatal(err)
	}
	record, err := f.base.auth.client.TransferRecord.Query().Where(transferrecord.ProviderIDEQ("71")).Only(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	if err = f.store.ReconcileTransfer(t.Context(), record.ID); err != nil {
		t.Fatal(err)
	}
}
func TestRefundConfirmedEvidenceRecipientAuthorityAndCaseClosure(t *testing.T) {
	f := refundDB(t)
	ctx := t.Context()
	v := f.proposal(t, "4.000000000000000001")
	if _, err := f.store.ConfirmRecipient(ctx, f.base.other, v.ID, payments.RecipientInput{Version: v.Version, Address: "synthetic-other-address", Accept: true}); err == nil {
		t.Fatal("other customer changed refund destination")
	}
	v = f.recipient(t, v)
	approve := payments.TransferChange{Version: v.Version, Reason: "Approved the exact recipient and refund terms."}
	if _, err := f.store.ApproveRefund(ctx, f.base.admin, v.ID, approve); !errors.Is(err, payments.ErrConflict) {
		t.Fatal("undecided case refund approved", err)
	}
	decision := f.decision(t)
	if _, err := f.store.ChangeCase(ctx, f.base.buyer, f.caseID, "accept", false, payments.CaseChange{Version: decision.Version, Note: "Accept the proposed cancellation resolution."}); !errors.Is(err, payments.ErrConflict) {
		t.Fatal("case closed over unresolved refund", err)
	}
	if _, err := f.store.ApproveRefund(ctx, f.base.buyer, v.ID, approve); err == nil {
		t.Fatal("customer approved outgoing funds")
	}
	v, err := f.store.ApproveRefund(ctx, f.base.admin, v.ID, approve)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.store.ConfirmRecipient(ctx, f.base.buyer, v.ID, payments.RecipientInput{Version: v.Version, Address: "changed-after-approval", Accept: true}); !errors.Is(err, payments.ErrConflict) {
		t.Fatal("approved recipient changed", err)
	}
	f.issue(t, v.ID)
	f.issue(t, v.ID)
	v = f.latest(t, v.ID)
	verify := payments.TransferChange{Version: v.Version, Reason: "Verify the independently checked transfer.", Code: "123456"}
	if err = f.store.VerifyRefund(ctx, f.base.admin, v.ID, verify); err == nil {
		t.Fatal("creation response accepted as authorization evidence")
	}
	f.read(t)
	v = f.latest(t, v.ID)
	verify.Version = v.Version
	if err = f.store.VerifyRefund(ctx, f.base.admin, v.ID, verify); err != nil {
		t.Fatal(err)
	}
	f.read(t)
	v = f.latest(t, v.ID)
	if v.State != "processing" {
		t.Fatal("provider verification fabricated completion", v.State)
	}
	f.provider.status("finished")
	f.read(t)
	v = f.latest(t, v.ID)
	if v.State != "confirmed" {
		t.Fatal("confirmed outgoing not recorded", v.State)
	}
	f.provider.mu.Lock()
	creates, verifies := f.provider.creates, f.provider.verifies
	f.provider.mu.Unlock()
	if creates != 1 || verifies != 1 {
		t.Fatal("repeated financial write", creates, verifies)
	}
	result, err := f.store.ChangeCase(ctx, f.base.buyer, f.caseID, "accept", false, payments.CaseChange{Version: decision.Version, Note: "Accept the confirmed refund and cancellation."})
	if err != nil || result.State != "closed" {
		t.Fatal(err)
	}
	row, err := f.base.auth.client.Order.Get(ctx, f.orderID)
	if err != nil || string(row.State) != "cancelled" {
		t.Fatal("service not cancelled", err)
	}
	held, err := f.base.auth.client.OrderContract.Query().Where(ordercontract.IDEQ(row.CurrentContract), ordercontract.CapacityHeldEQ(true)).Exist(ctx)
	if err != nil || held {
		t.Fatal("capacity not released", err)
	}
}
func TestRefundCumulativeReserveAndAmbiguousRecovery(t *testing.T) {
	f := refundDB(t)
	ctx := t.Context()
	f.decision(t)
	v := f.recipient(t, f.proposal(t, "8"))
	if _, err := f.store.ProposeRefund(ctx, f.base.admin, f.caseID, payments.RefundInput{RequestKey: uuid.NewString(), ReceiptID: f.receiptID, Amount: "5", Terms: "Cannot exceed received funds after reservations."}); !errors.Is(err, payments.ErrConflict) {
		t.Fatal("refund cap exceeded", err)
	}
	v, err := f.store.ApproveRefund(ctx, f.base.admin, v.ID, payments.TransferChange{Version: v.Version, Reason: "Owner accepts exact refund obligation."})
	if err != nil {
		t.Fatal(err)
	}
	f.provider.ambiguous = true
	f.issue(t, v.ID)
	f.issue(t, v.ID)
	v = f.latest(t, v.ID)
	if v.State != "uncertain" {
		t.Fatal("lost uncertain transfer", v.State)
	}
	if _, err = f.store.CancelRefund(ctx, f.base.admin, v.ID, payments.TransferChange{Version: v.Version, Reason: "Must not release uncertain funds."}); !errors.Is(err, payments.ErrConflict) {
		t.Fatal("uncertain reserve released", err)
	}
	if _, err = f.store.ApproveRefund(ctx, f.base.admin, v.ID, payments.TransferChange{Version: v.Version, Reason: "Must not resend uncertain payment."}); !errors.Is(err, payments.ErrConflict) {
		t.Fatal("uncertain financial write retried", err)
	}
	f.read(t)
	v = f.latest(t, v.ID)
	if v.State != "awaiting_verification" {
		t.Fatal("discovery did not recover ambiguous creation", v.State)
	}
	f.provider.mu.Lock()
	creates := f.provider.creates
	f.provider.mu.Unlock()
	if creates != 1 {
		t.Fatal("duplicated ambiguous POST")
	}
}
func TestCaseAppealBlocksOutgoingAndPreservesAcceptedPolicy(t *testing.T) {
	f := refundDB(t)
	ctx := t.Context()
	decision := f.decision(t)
	v := f.recipient(t, f.proposal(t, "1"))
	v, err := f.store.ApproveRefund(ctx, f.base.admin, v.ID, payments.TransferChange{Version: v.Version, Reason: "Owner approved precise refund terms."})
	if err != nil {
		t.Fatal(err)
	}
	f.issue(t, v.ID)
	f.read(t)
	v = f.latest(t, v.ID)
	appeal, err := f.store.ChangeCase(ctx, f.base.buyer, f.caseID, "appeal", false, payments.CaseChange{Version: decision.Version, Note: "Please reconsider the partial work deduction."})
	if err != nil || appeal.Appeals != 1 {
		t.Fatal(err)
	}
	if err = f.store.VerifyRefund(ctx, f.base.admin, v.ID, payments.TransferChange{Version: v.Version, Reason: "Appealed decision must block authorization.", Code: "123456"}); !errors.Is(err, payments.ErrConflict) {
		t.Fatal("appeal failed to block outgoing authorization", err)
	}
	if _, err = f.store.ChangeCase(ctx, f.base.buyer, f.caseID, "decide", false, payments.CaseChange{Version: appeal.Version, Note: "Customer cannot approve own dispute.", Outcome: "cancel"}); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer decided own case", err)
	}
	if appeal.Policy == nil || appeal.Policy.AppealHours != 48 {
		t.Fatal("lost accepted policy")
	}
	f.base.auth.clock.Add(int64(49 * time.Hour / time.Second))
	if _, err = f.store.ApproveRefund(ctx, f.base.admin, v.ID, payments.TransferChange{Version: v.Version, Reason: "Stale authentication cannot authorize refund."}); err == nil {
		t.Fatal("stale staff factors accepted")
	}
}

func TestRefundConcurrentProposalsCannotOverReserve(t *testing.T) {
	f := refundDB(t)
	ctx := t.Context()
	var wg sync.WaitGroup
	var mu sync.Mutex
	successes := 0
	for range 4 {
		wg.Go(func() {
			_, err := f.store.ProposeRefund(ctx, f.base.admin, f.caseID, payments.RefundInput{RequestKey: uuid.NewString(), ReceiptID: f.receiptID, Amount: "4", Terms: "Synthetic bounded partial refund obligation."})
			if err == nil {
				mu.Lock()
				successes++
				mu.Unlock()
			} else if !errors.Is(err, payments.ErrConflict) {
				t.Error(err)
			}
		})
	}
	wg.Wait()
	if successes != 3 {
		t.Fatal("concurrent refund reserve limit", successes)
	}
}

func TestRefundUnavailableOrMismatchedEvidenceCannotAuthorize(t *testing.T) {
	f := refundDB(t)
	ctx := t.Context()
	f.decision(t)
	v := f.recipient(t, f.proposal(t, "1"))
	v, err := f.store.ApproveRefund(ctx, f.base.admin, v.ID, payments.TransferChange{Version: v.Version, Reason: "Approved exact customer recipient and amount."})
	if err != nil {
		t.Fatal(err)
	}
	f.issue(t, v.ID)
	f.read(t)
	v = f.latest(t, v.ID)
	f.provider.mu.Lock()
	f.provider.row.Amount = "2"
	f.provider.mu.Unlock()
	f.read(t)
	if err = f.store.VerifyRefund(ctx, f.base.admin, v.ID, payments.TransferChange{Version: v.Version, Reason: "Mismatch must stop provider authorization.", Code: "123456"}); !errors.Is(err, payments.ErrConflict) {
		t.Fatal("mismatched outgoing evidence authorized", err)
	}
	f.provider.mu.Lock()
	f.provider.row.Amount = "1"
	f.provider.unavailable = true
	f.provider.mu.Unlock()
	record, err := f.base.auth.client.TransferRecord.Query().Where(transferrecord.ProviderIDEQ("71")).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if err = f.store.ReconcileTransfer(ctx, record.ID); err == nil {
		t.Fatal("unavailable provider reported success")
	}
	if err = f.store.VerifyRefund(ctx, f.base.admin, v.ID, payments.TransferChange{Version: v.Version, Reason: "Failed read must stop provider authorization.", Code: "123456"}); !errors.Is(err, payments.ErrConflict) {
		t.Fatal("failed read authorized payout", err)
	}
	f.provider.mu.Lock()
	verifies := f.provider.verifies
	f.provider.mu.Unlock()
	if verifies != 0 {
		t.Fatal("unverified payout sent")
	}
}

func TestRefundUnissuedCancellationRetainsAuthorityAndReleasesReserve(t *testing.T) {
	f := refundDB(t)
	ctx := t.Context()
	v := f.proposal(t, "12")
	input := payments.TransferChange{Version: v.Version, Reason: "Withdraw the unissued refund proposal."}
	if _, err := f.store.CancelRefund(ctx, f.base.buyer, v.ID, input); err == nil {
		t.Fatal("customer released owner refund reserve")
	}
	result, err := f.store.CancelRefund(ctx, f.base.admin, v.ID, input)
	if err != nil || result.State != "cancelled" {
		t.Fatal(err)
	}
	f.proposal(t, "12.34000001")
	if _, err = f.store.CancelRefund(ctx, f.base.admin, v.ID, input); !errors.Is(err, payments.ErrConflict) {
		t.Fatal("stale cancellation accepted", err)
	}
}

func TestRefundRetryRequiresFreshFailureAndStopsWhenEarlierAttemptSettles(t *testing.T) {
	f := refundDB(t)
	ctx := t.Context()
	f.decision(t)
	v := f.recipient(t, f.proposal(t, "1"))
	v, err := f.store.ApproveRefund(ctx, f.base.admin, v.ID, payments.TransferChange{Version: v.Version, Reason: "Owner approved the exact refund recipient."})
	if err != nil {
		t.Fatal(err)
	}
	f.issue(t, v.ID)
	f.provider.status("failed")
	f.read(t)
	v = f.latest(t, v.ID)
	if v.State != "failed" {
		t.Fatal("missing independent failure evidence")
	}
	row, err := f.base.auth.client.MoneyTransfer.Get(ctx, v.ID)
	if err != nil {
		t.Fatal(err)
	}
	previous := row.CurrentAttempt
	f.base.auth.clock.Add(61)
	input := payments.TransferChange{Version: v.Version, Reason: "Owner reviewed a fresh definitive failure before retry."}
	if _, err = f.store.ApproveRefund(ctx, f.base.admin, v.ID, input); !errors.Is(err, payments.ErrConflict) {
		t.Fatal("stale failure allowed another transfer", err)
	}
	f.read(t)
	v, err = f.store.ApproveRefund(ctx, f.base.admin, v.ID, input)
	if err != nil {
		t.Fatal(err)
	}
	row, err = f.base.auth.client.MoneyTransfer.Get(ctx, v.ID)
	if err != nil || row.CurrentAttempt == previous {
		t.Fatal("retry overwrote attempt history", err)
	}
	f.read(t)
	f.provider.status("finished")
	f.read(t)
	raw, err := json.Marshal(map[string]string{"attempt_id": row.CurrentAttempt})
	if err != nil {
		t.Fatal(err)
	}
	if err = f.store.RefundHandler()(ctx, jobs.Job{Payload: raw}); !errors.Is(err, payments.ErrConflict) {
		t.Fatal("earlier confirmation failed to stop retry", err)
	}
	f.provider.mu.Lock()
	creates := f.provider.creates
	f.provider.mu.Unlock()
	if creates != 1 {
		t.Fatal("sent a second payment after earlier confirmation")
	}
	attempt, err := f.base.auth.client.TransferAttempt.Get(ctx, previous)
	if err != nil || attempt.State != "confirmed" {
		t.Fatal("earlier confirmed evidence lost", err)
	}
}
