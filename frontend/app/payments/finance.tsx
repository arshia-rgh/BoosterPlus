import { useState } from "react";
import { Link } from "react-router";
import { z } from "zod";
import { Action, ErrorNotice, Select, Text } from "../catalog/controls";
import { minorDisplay } from "../catalog/dynamic-form";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import { financeSchema, paymentMessage, settingsSchema } from "./model";
import PaymentPolicyEditor from "./policy-editor";
export default function Finance() {
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
  async function reconcile() {
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
      setBusy(false);
    }
  }
  return (
    <>
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
        <Action onClick={queue.reload}>Refresh finance</Action>
        <ErrorNotice error={queue.error ?? error} />
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
      <section className="catalog-section">
        <h2>Request provider reconciliation</h2>
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
      <ErrorNotice error={settings.error} />
      {settings.data && (
        <PaymentPolicyEditor
          key={settings.data.version}
          settings={settings.data}
          done={settings.reload}
        />
      )}
    </>
  );
}
