import SellerPayoutQueue from "../resale/payout-queue";
import CaseQueue from "./case-queue";
import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { z } from "../validation";
import { Action, ErrorNotice, Select, Text } from "../catalog/controls";
import { minorDisplay } from "../catalog/dynamic-form";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import { financeSchema, paymentMessage, settingsSchema } from "./model";
import PaymentPolicyEditor from "./policy-editor";
export default function Finance() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("view");
  const view = ["payments", "cases", "payouts", "policy", "reconcile"].includes(
    requested ?? "",
  )
    ? requested
    : "payments";
  const [after, setAfter] = useState(""),
    [filter, setFilter] = useState("exceptions"),
    [paymentID, setPaymentID] = useState(""),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [notice, setNotice] = useState("");
  const queue = useResource(
      `/admin/finance?after=${encodeURIComponent(after)}&filter=${filter}`,
      financeSchema,
    ),
    settings = useResource("/admin/finance/policy", settingsSchema);
  const lock = useRef(false);
  async function reconcile() {
    if (lock.current || !/^[1-9][0-9]{0,31}$/.test(paymentID) || !reason.trim())
      return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      await post(
        "/admin/finance/reconcile",
        { payment_id: paymentID, reason },
        z.object({ queued: z.boolean() }),
      );
      setNotice(
        "Provider reconciliation queued. No manual payment state was applied.",
      );
      queue.reload();
    } catch (cause) {
      setError(cause);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <nav className="admin-view-nav" aria-label="Finance workspace">
        {[
          ["payments", "Payments"],
          ["cases", "Service cases"],
          ["payouts", "Seller payouts"],
          ["policy", "Payment policy"],
          ["reconcile", "Reconciliation"],
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-current={view === key ? "page" : undefined}
            onClick={() => {
              setParams({ view: key ?? "payments" });
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div hidden={view !== "cases"}>
        <CaseQueue />
      </div>
      <div hidden={view !== "payouts"}>
        <SellerPayoutQueue />
      </div>
      <div hidden={view !== "payments"}>
        <p className="admin-intro">
          Review received funds, payment exceptions and checkout policy. Order
          prices and crypto receipts remain separate.
        </p>
        <section className="catalog-section">
          <h2>Payment queue</h2>
          <Select
            label="Payment filter"
            value={filter}
            change={(value) => {
              setFilter(value);
              setAfter("");
            }}
            options={[
              ["exceptions", "Needs attention"],
              ["", "All attempts"],
            ]}
          />
          <Action disabled={queue.loading} onClick={queue.reload}>
            Refresh finance
          </Action>
          {queue.loading && <p role="status">Loading payment queue…</p>}
          <ErrorNotice error={queue.error} />
          {queue.data?.attempts.length === 0 && (
            <p>No matching payment attempts.</p>
          )}
          <div className="admin-record-grid">
            {queue.data?.attempts.map((a) => (
              <article className="catalog-section" key={a.id}>
                <h3>
                  <Link to={`/admin/orders/${a.order_id}`}>
                    Order {a.order_id.slice(0, 8)}
                  </Link>
                </h3>
                <p>
                  {a.currency} {minorDisplay(a.amount_minor)} · {a.route.label}
                </p>
                <p>{paymentMessage(a.state, a.issue)}</p>
                <small>{a.id}</small>
              </article>
            ))}
          </div>
          {after && (
            <Action
              onClick={() => {
                setAfter("");
              }}
            >
              Latest payments
            </Action>
          )}
          {queue.data?.next && (
            <Action
              onClick={() => {
                setAfter(queue.data?.next ?? "");
              }}
            >
              Older payments
            </Action>
          )}
          <h3>Provider records requiring attention</h3>
          {queue.data?.records.length === 0 && (
            <p>No unresolved provider records.</p>
          )}
          {queue.data?.records.map((r) => (
            <article key={r.id}>
              <strong>Payment {r.payment_id}</strong>
              <p>
                {r.issue.replaceAll("_", " ")} · Checked{" "}
                {new Date(r.checked_at).toLocaleString()}
              </p>
            </article>
          ))}
        </section>
      </div>
      <section hidden={view !== "reconcile"} className="catalog-section">
        <h2>Request provider reconciliation</h2>
        <ErrorNotice error={error} />
        <p>
          Use the provider payment ID, which differs from the invoice ID. This
          reads authoritative evidence and requires recent staff verification.
        </p>
        <fieldset disabled={busy}>
          <legend>Audited reconciliation request</legend>
          <Text
            label="Provider payment ID"
            value={paymentID}
            change={setPaymentID}
          />
          <Text
            label="Reason for reconciliation"
            value={reason}
            change={setReason}
            multiline
          />
          <Action
            disabled={!/^[1-9][0-9]{0,31}$/.test(paymentID) || !reason.trim()}
            onClick={() => void reconcile()}
          >
            Reconcile payment
          </Action>
        </fieldset>
        {notice && <p role="status">{notice}</p>}
      </section>
      <div hidden={view !== "policy"}>
        <ErrorNotice error={settings.error} />
        {settings.loading && <p role="status">Loading payment policy…</p>}
        {!!settings.error && (
          <Action onClick={settings.reload}>Try payment policy again</Action>
        )}
        {settings.data && (
          <PaymentPolicyEditor
            key={settings.data.version}
            settings={settings.data}
            done={settings.reload}
          />
        )}
      </div>
    </>
  );
}
