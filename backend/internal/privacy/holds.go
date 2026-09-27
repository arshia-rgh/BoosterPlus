package privacy

import (
	"context"
	"time"

	"entgo.io/ent/dialect/sql"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountlisting"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountreservation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountsubmission"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authaudit"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/moneytransfer"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentattempt"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentreceipt"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/selleroffer"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopreservation"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/sitecontent"
)

// eligibility is recomputed under the shared authorization fence immediately before erasure.
func (s *Store) eligibility(ctx context.Context, tx *ent.Tx, row *ent.PrivacyRequest, r sitecontent.Retention) (time.Time, bool, error) {
	id := row.UserID
	checks := []func(context.Context) (bool, error){
		tx.Order.Query().Where(order.StateNotIn(order.StateCompleted, order.StateCancelled, order.StateRejected, order.StateExpired), func(q *sql.Selector) { q.Where(sql.In(q.C(order.FieldID), sellerOrders(id))) }).Exist,
		tx.ServiceCase.Query().Where(servicecase.Or(servicecase.ActiveOrderIDNotNil(), servicecase.AppealUntilGT(s.now())), func(q *sql.Selector) { q.Where(sql.In(q.C(servicecase.FieldOrderID), sellerOrders(id))) }).Exist,
		tx.ShopReservation.Query().Where(shopreservation.UserIDEQ(id), shopreservation.StateEQ("reserved")).Exist,
		tx.AccountReservation.Query().Where(accountreservation.UserIDEQ(id), accountreservation.StateEQ("reserved")).Exist,
		tx.Order.Query().Where(order.UserIDEQ(id), order.StateNotIn(order.StateCompleted, order.StateCancelled, order.StateRejected, order.StateExpired)).Exist,
		tx.ServiceCase.Query().Where(servicecase.UserIDEQ(id), servicecase.Or(servicecase.ActiveOrderIDNotNil(), servicecase.AppealUntilGT(s.now()))).Exist,
		tx.MoneyTransfer.Query().Where(moneytransfer.UserIDEQ(id), moneytransfer.StateNotIn("confirmed", "cancelled")).Exist,
		tx.PaymentAttempt.Query().Where(paymentattempt.UserIDEQ(id), paymentattempt.Or(paymentattempt.StateNotIn("settled", "expired", "failed", "cancelled"), paymentattempt.IssueNEQ(""))).Exist,
		tx.AccountListing.Query().Where(accountlisting.SellerIDEQ(id), accountlisting.StateNotIn("sold", "withdrawn")).Exist,
		tx.AccountSubmission.Query().Where(accountsubmission.UserIDEQ(id), accountsubmission.StateIn(accountsubmission.StateDraft, accountsubmission.StateSubmitted, accountsubmission.StateNeedsInformation, accountsubmission.StateApprovedPendingTerms)).Exist,
		tx.SellerOffer.Query().Where(selleroffer.SellerIDEQ(id), selleroffer.Or(selleroffer.StateEQ("offered"), selleroffer.And(selleroffer.StateEQ("accepted"), func(q *sql.Selector) {
			l := sql.Table("account_listings")
			q.Where(sql.NotIn(q.C("id"), sql.Select(l.C("offer_id")).From(l).Where(sql.In(l.C("state"), "sold", "withdrawn"))))
		}))).Exist,
		tx.Conversation.Query().Where(conversation.UserIDEQ(id), conversation.StateNEQ(conversation.StateResolved)).Exist,
	}
	for _, check := range checks {
		held, e := check(ctx)
		if e != nil {
			return time.Time{}, false, e
		}
		if held {
			return time.Time{}, true, nil
		}
	}
	at := row.CreatedAt.Add(time.Duration(*r.GraceDays) * 24 * time.Hour)
	advance := func(v time.Time, days int) {
		v = v.Add(time.Duration(days) * 24 * time.Hour)
		if v.After(at) {
			at = v
		}
	}
	// A single newest record per category keeps retention evaluation bounded. Financial/audit rows themselves are preserved.
	receipt, e := tx.PaymentReceipt.Query().Where(paymentreceipt.UserIDEQ(id)).Order(ent.Desc(paymentreceipt.FieldUpdatedAt)).First(ctx)
	if e != nil && !ent.IsNotFound(e) {
		return at, false, e
	}
	if receipt != nil {
		advance(receipt.UpdatedAt, *r.FinancialDays)
	}
	transfer, e := tx.MoneyTransfer.Query().Where(moneytransfer.UserIDEQ(id)).Order(ent.Desc(moneytransfer.FieldUpdatedAt)).First(ctx)
	if e != nil && !ent.IsNotFound(e) {
		return at, false, e
	}
	if transfer != nil {
		advance(transfer.UpdatedAt, *r.FinancialDays)
	}
	purchase, e := tx.Order.Query().Where(order.Or(order.UserIDEQ(id), func(q *sql.Selector) { q.Where(sql.In(q.C(order.FieldID), sellerOrders(id))) })).Order(ent.Desc(order.FieldUpdatedAt)).First(ctx)
	if e != nil && !ent.IsNotFound(e) {
		return at, false, e
	}
	if purchase != nil {
		advance(purchase.UpdatedAt, *r.FinancialDays)
	}
	dispute, e := tx.ServiceCase.Query().Where(servicecase.Or(servicecase.UserIDEQ(id), func(q *sql.Selector) { q.Where(sql.In(q.C(servicecase.FieldOrderID), sellerOrders(id))) })).Order(ent.Desc(servicecase.FieldUpdatedAt)).First(ctx)
	if e != nil && !ent.IsNotFound(e) {
		return at, false, e
	}
	if dispute != nil {
		advance(dispute.UpdatedAt, *r.DisputeDays)
	}
	thread, e := tx.Conversation.Query().Where(conversation.UserIDEQ(id)).Order(ent.Desc(conversation.FieldUpdatedAt)).First(ctx)
	if e != nil && !ent.IsNotFound(e) {
		return at, false, e
	}
	if thread != nil {
		advance(thread.UpdatedAt, *r.SupportDays)
	}
	submission, e := tx.AccountSubmission.Query().Where(accountsubmission.UserIDEQ(id)).Order(ent.Desc(accountsubmission.FieldUpdatedAt)).First(ctx)
	if e != nil && !ent.IsNotFound(e) {
		return at, false, e
	}
	if submission != nil {
		advance(submission.UpdatedAt, *r.SupportDays)
	}
	event, e := tx.AuthAudit.Query().Where(authaudit.Or(authaudit.ActorIDEQ(id), authaudit.TargetIDEQ(id)), func(q *sql.Selector) { q.Where(sql.Not(sql.HasPrefix(q.C(authaudit.FieldAction), "privacy_"))) }).Order(ent.Desc(authaudit.FieldCreatedAt)).First(ctx)
	if e != nil && !ent.IsNotFound(e) {
		return at, false, e
	}
	if event != nil {
		advance(event.CreatedAt, *r.AuditDays)
	}
	return at, false, nil
}

func sellerOrders(userID string) *sql.Selector {
	listings := sql.Table("account_listings")
	purchases := sql.Table("orders")
	return sql.Select(purchases.C("id")).From(purchases).Where(sql.In(purchases.C("listing_id"), sql.Select(listings.C("id")).From(listings).Where(sql.EQ(listings.C("seller_id"), userID))))
}
