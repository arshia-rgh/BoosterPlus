import { useState } from "react";
import { Link } from "react-router";
import { z } from "zod";
import { Action, ErrorNotice, Text } from "../catalog/controls";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import { caseQueueSchema, outgoingQueueSchema } from "./cases-model";
export default function CaseQueue() {
  const [after, setAfter] = useState(""),
    [payment, setPayment] = useState(""),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [notice, setNotice] = useState("");
  const resource = useResource(
    `/admin/cases?after=${encodeURIComponent(after)}`,
    caseQueueSchema,
  );
  const [outgoingAfter, setOutgoingAfter] = useState("");
  const outgoing = useResource(
    `/admin/finance/outgoing?after=${encodeURIComponent(outgoingAfter)}`,
    outgoingQueueSchema,
  );
  async function reconcile() {
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      await post(
        "/admin/finance/outgoing/reconcile",
        { payment_id: payment, reason },
        z.object({ queued: z.boolean() }),
      );
      setNotice(
        "Outgoing reconciliation queued. Review the refund record after the worker reads provider evidence.",
      );
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="catalog-section">
      <h2>Open service cases</h2>
      <ErrorNotice error={resource.error ?? error} />
      <Action onClick={resource.reload}>Refresh case queue</Action>
      {resource.data?.cases.length === 0 && <p>No open cases.</p>}
      {resource.data?.cases.map((record) => (
        <article key={record.id}>
          <Link to={`/admin/orders/${record.order_id}`}>
            {record.kind.replaceAll("_", " ")} · Order{" "}
            {record.order_id.slice(0, 8)}
          </Link>
          <p>
            {record.state} · {new Date(record.updated_at).toLocaleString()}
          </p>
        </article>
      ))}
      {after && (
        <Action
          onClick={() => {
            setAfter("");
          }}
        >
          First cases
        </Action>
      )}
      {resource.data?.next && (
        <Action
          onClick={() => {
            setAfter(resource.data?.next ?? "");
          }}
        >
          More cases
        </Action>
      )}
      <h3>Outgoing exceptions</h3>
      <p>
        Outgoing transfers: {outgoing.data?.enabled ? "enabled" : "paused"}.
        Provider observations cannot create an approval.
      </p>
      <ErrorNotice error={outgoing.error} />
      <Action onClick={outgoing.reload}>Refresh outgoing exceptions</Action>
      {outgoing.data?.records.length === 0 && (
        <p>No outgoing exceptions recorded.</p>
      )}
      {outgoing.data?.records.map((record) => (
        <article key={record.id}>
          <strong>Provider transfer {record.payment_id}</strong>
          <p>
            {record.issue.replaceAll("_", " ")} · {record.state} ·{" "}
            {new Date(record.checked_at).toLocaleString()}
          </p>
        </article>
      ))}
      {outgoingAfter && (
        <Action
          onClick={() => {
            setOutgoingAfter("");
          }}
        >
          First outgoing exceptions
        </Action>
      )}
      {outgoing.data?.next && (
        <Action
          onClick={() => {
            setOutgoingAfter(outgoing.data?.next ?? "");
          }}
        >
          More outgoing exceptions
        </Action>
      )}
      <fieldset disabled={busy}>
        <legend>Reconcile an outgoing transfer</legend>
        <p>
          Use the provider payout ID. This requests a read; it cannot approve or
          send funds.
        </p>
        <Text
          label="Provider outgoing payment ID"
          value={payment}
          change={setPayment}
        />
        <Text
          label="Outgoing reconciliation reason"
          multiline
          value={reason}
          change={setReason}
        />
        <Action
          disabled={
            !/^[1-9][0-9]{0,31}$/.test(payment) || reason.trim().length < 10
          }
          onClick={() => void reconcile()}
        >
          Reconcile outgoing payment
        </Action>
      </fieldset>
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
