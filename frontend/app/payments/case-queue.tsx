import { Link, useSearchParams } from "../portal-router";
import { Action, ErrorNotice } from "../catalog/controls";
import { useResource } from "../orders/resource";
import { caseQueueSchema, outgoingQueueSchema } from "./cases-model";
export default function CaseQueue() {
  const [params, setParams] = useSearchParams();
  const after = params.get("casesAfter") ?? "";
  const setAfter = (after: string) => {
    setParams({ ...Object.fromEntries(params), casesAfter: after });
  };
  const resource = useResource(
    `/admin/cases?after=${encodeURIComponent(after)}`,
    caseQueueSchema,
  );
  const outgoingAfter = params.get("outgoingAfter") ?? "";
  const setOutgoingAfter = (after: string) => {
    setParams({ ...Object.fromEntries(params), outgoingAfter: after });
  };
  const outgoing = useResource(
    `/admin/finance/outgoing?after=${encodeURIComponent(outgoingAfter)}`,
    outgoingQueueSchema,
  );
  return (
    <section className="catalog-section">
      <h2>Open service cases</h2>
      <ErrorNotice error={resource.error} />
      <Action onClick={resource.reload}>Refresh case queue</Action>
      {resource.data?.cases.length === 0 && <p>No open cases.</p>}
      {resource.data?.cases.map((record) => (
        <article key={record.id}>
          <Link
            to={`/admin/orders/${record.order_id}?section=payment`}
            state={{ financeSearch: params.toString() }}
          >
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
        Outgoing transfers:{" "}
        {outgoing.data
          ? outgoing.data.enabled
            ? "enabled"
            : "paused"
          : "status unavailable"}
        . Provider observations cannot create an approval.
      </p>
      <ErrorNotice error={outgoing.error} />
      <Action onClick={outgoing.reload}>Refresh outgoing exceptions</Action>
      {outgoing.data?.records.length === 0 && (
        <p>No outgoing exceptions recorded.</p>
      )}
      {outgoing.data?.records.map((record) => (
        <article key={record.id}>
          <Link
            to={`/admin/finance?${new URLSearchParams({ ...Object.fromEntries(params), view: "reconcile", direction: "outgoing", reference: record.payment_id }).toString()}`}
          >
            Inspect provider transfer {record.payment_id}
          </Link>
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
    </section>
  );
}
