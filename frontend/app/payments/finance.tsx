import SellerPayoutQueue from "../resale/payout-queue";
import CaseQueue from "./case-queue";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "../portal-router";
import { Action, ErrorNotice, Select } from "../catalog/controls";
import { minorDisplay } from "../catalog/dynamic-form";
import { useResource } from "../orders/resource";
import { financeSchema, paymentMessage } from "./model";
import IncomingPaymentEvidence from "./incoming-evidence";
import Reconciliation from "./reconciliation";
import PaymentPolicyWorkspace from "./policy-workspace";
export default function Finance() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("view");
  const view = ["payments", "cases", "payouts", "policy", "reconcile"].includes(
    requested ?? "",
  )
    ? requested
    : "payments";
  const after = params.get("after") ?? "";
  const filter = params.get("filter") === "all" ? "" : "exceptions";
  const setAfter = (after: string) => {
    setParams({ ...Object.fromEntries(params), after });
  };
  const setFilter = (filter: string) => {
    setParams({
      ...Object.fromEntries(params),
      filter: filter ? "exceptions" : "all",
      after: "",
    });
  };
  const queryReference = params.get("reference") ?? "";
  const boundedReference = /^[1-9][0-9]{0,31}$/.test(queryReference)
    ? queryReference
    : "";
  const queryDirection =
    params.get("direction") === "outgoing" ? "outgoing" : "incoming";
  const requestedReference = `${queryDirection}:${boundedReference}`;
  const [seenReference, setSeenReference] = useState(requestedReference);
  const [paymentID, setPaymentID] = useState(boundedReference);
  const [direction, setDirection] = useState(queryDirection);
  const queue = useResource(
    `/admin/finance?after=${encodeURIComponent(after)}&filter=${filter}`,
    financeSchema,
  );
  const reconciliationPanel = useRef<HTMLElement>(null);
  const [focusReconciliation, setFocusReconciliation] = useState(0);
  const consumedFocus = useRef(0);
  useEffect(() => {
    if (view === "reconcile" && focusReconciliation > consumedFocus.current) {
      reconciliationPanel.current?.focus();
      consumedFocus.current = focusReconciliation;
    }
  }, [focusReconciliation, view]);
  if (seenReference !== requestedReference) {
    setSeenReference(requestedReference);
    setPaymentID(boundedReference);
    setDirection(queryDirection);
    setFocusReconciliation((value) => value + 1);
  }
  function selectEvidence(reference: string) {
    setPaymentID(reference);
    setDirection("incoming");
    setParams({
      ...Object.fromEntries(params),
      view: "reconcile",
      direction: "incoming",
      reference,
    });
    setFocusReconciliation((value) => value + 1);
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
              setParams({
                ...Object.fromEntries(params),
                view: key ?? "payments",
              });
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
                  <Link
                    to={`/admin/orders/${a.order_id}?section=payment`}
                    state={{ financeSearch: params.toString() }}
                  >
                    Order {a.order_id.slice(0, 8)}
                  </Link>
                </h3>
                <p>
                  {a.currency} {minorDisplay(a.amount_minor)} · {a.route.label}
                </p>
                <p>{paymentMessage(a.state, a.issue)}</p>
                <small>Attempt {a.id}</small>
                <IncomingPaymentEvidence
                  evidence={a.evidence}
                  more={a.more_evidence}
                  reconcile={selectEvidence}
                />
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
      <section
        hidden={view !== "reconcile"}
        className="catalog-section"
        ref={reconciliationPanel}
        tabIndex={-1}
        aria-label="Provider reconciliation"
      >
        <Reconciliation
          paymentID={paymentID}
          change={setPaymentID}
          direction={direction}
          setDirection={setDirection}
          request={focusReconciliation}
          done={queue.reload}
        />
      </section>
      <PaymentPolicyWorkspace active={view === "policy"} />
    </>
  );
}
