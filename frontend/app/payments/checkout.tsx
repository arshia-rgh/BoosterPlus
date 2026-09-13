import { useEffect, useRef, useState } from "react";
import { Action, Check, ErrorNotice, Select } from "../catalog/controls";
import { minorDisplay } from "../catalog/dynamic-form";
import { post } from "../identity/api";
import type { Detail } from "../orders/model";
import { useResource } from "../orders/resource";
import {
  attemptSchema,
  historySchema,
  paymentMessage,
  remedyLabels,
  remedyText,
} from "./model";
import { paymentTitle } from "./presentation";
import "./workspace.css";
export default function Checkout({
  detail,
  admin,
  changed,
}: {
  detail: Detail;
  admin: boolean;
  changed: () => void;
}) {
  const base = (admin ? "/admin/orders/" : "/orders/") + detail.order.id;
  const resource = useResource(base + "/payments", historySchema);
  const reload = resource.reload;
  const [now, setNow] = useState(() => Date.now());
  const [route, setRoute] = useState(""),
    [acceptedPolicy, setAcceptedPolicy] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const data = resource.data,
    policy = data?.policy,
    latest = data?.attempts[0];
  const consentKey = `${policy?.id ?? ""}:${detail.contract?.id ?? ""}:${route}`;
  const accepted = !!policy && acceptedPolicy === consentKey;
  const lock = useRef(false);
  const selectedRoute = policy?.data.routes.find(
    (value) => value.code === route,
  );
  const deadline = latest ? Date.parse(latest.expires_at) : NaN;
  const expired = !!latest && (!Number.isFinite(deadline) || deadline <= now);
  const polling =
    !!latest &&
    ["new", "creating", "uncertain", "awaiting_payment", "confirming"].includes(
      latest.state,
    );
  useEffect(() => {
    if (!polling) return;
    const clock = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    const refresh = () => {
      if (!document.hidden) reload();
    };
    const timer = window.setInterval(refresh, 10000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(clock);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [polling, reload]);
  useEffect(() => {
    if (
      latest?.state === "settled" &&
      detail.contract?.payment_state !== "settled"
    )
      changed();
  }, [latest?.state, detail.contract?.payment_state, changed]);
  async function start() {
    if (
      lock.current ||
      resource.loading ||
      resource.error ||
      !data?.enabled ||
      admin ||
      latest ||
      !policy ||
      !detail.contract ||
      !accepted ||
      !selectedRoute ||
      detail.order.state !== "awaiting_payment"
    )
      return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await post(
        base + "/checkout",
        {
          contract_id: detail.contract.id,
          policy_id: policy.id,
          route,
          accept_policy: accepted,
        },
        attemptSchema,
      );
      resource.reload();
      changed();
    } catch (cause) {
      setError(cause);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      className="catalog-section payment-panel"
      aria-label="Payment and receipts"
    >
      <p className="eyebrow">Direct crypto checkout</p>
      <h2>Payment and receipts</h2>
      <ErrorNotice error={resource.error ?? error} />
      {!data && resource.loading && (
        <p role="status">Loading payment information…</p>
      )}
      {!!resource.error && (
        <Action disabled={resource.loading} onClick={reload}>
          Try payment information again
        </Action>
      )}
      {data && (
        <ol className="payment-steps" aria-label="Payment progress">
          <li aria-current={!latest ? "step" : undefined}>1. Choose payment</li>
          <li
            aria-current={
              latest &&
              !["settled", "exception", "closed"].includes(latest.state)
                ? "step"
                : undefined
            }
          >
            2. Pay with provider
          </li>
          <li aria-current={latest?.state === "settled" ? "step" : undefined}>
            3. Verified receipt
          </li>
        </ol>
      )}
      {data && !data.enabled && (
        <p>
          Checkout is currently unavailable. Your order remains unpaid until
          funds are verified. If you already paid, do not pay again. Existing
          payments continue to be reconciled; contact support for updates.
        </p>
      )}
      {!admin &&
        data?.enabled &&
        !latest &&
        detail.order.state === "awaiting_payment" &&
        policy && (
          <fieldset disabled={busy || resource.loading} key={policy.id}>
            <legend>Choose how to pay</legend>
            {detail.contract?.data && (
              <p className="payment-total">
                Agreed price: {detail.contract.data.currency}{" "}
                {minorDisplay(detail.contract.data.amount_minor)}
              </p>
            )}
            <h3>{policy.data.label}</h3>
            <p className="payment-policy">{policy.data.text}</p>
            {policy.data.remedies && (
              <details>
                <summary>Cancellation, disputes and refunds</summary>
                {remedyLabels.map(([key, label]) => (
                  <div key={key}>
                    <h4>{label}</h4>
                    <p>
                      {policy.data.remedies &&
                        remedyText(policy.data.remedies, key)}
                    </p>
                  </div>
                ))}
                <p>
                  Dispute window: {policy.data.remedies.dispute_hours} hours.
                  Appeal window: {policy.data.remedies.appeal_hours} hours; up
                  to {policy.data.remedies.max_appeals} appeals.
                </p>
              </details>
            )}
            <p>
              Processing fees:{" "}
              {policy.data.fee_mode === "customer"
                ? "paid by you"
                : "paid by PLAYORA"}
              . Exchange rate: {policy.data.rate_mode}. Local checkout window:{" "}
              {policy.data.window_minutes} minutes. The provider may impose a
              shorter deposit window; follow its instructions.
            </p>
            <Select
              label="Payment asset and network"
              value={route}
              change={(value) => {
                setRoute(value);
                setAcceptedPolicy("");
              }}
              options={[
                ["", "Choose an asset and network"],
                ...policy.data.routes.map(
                  (v) => [v.code, `${v.label} · ${v.network}`] as const,
                ),
              ]}
            />
            {selectedRoute && (
              <p className="payment-route-note">
                Use {selectedRoute.label} on {selectedRoute.network} only. The
                provider displays the exact crypto amount and destination before
                you send.
              </p>
            )}
            <Check
              label="I accept this payment policy and the agreed order price"
              value={accepted}
              change={(value) => {
                setAcceptedPolicy(value ? consentKey : "");
              }}
            />
            <Action
              disabled={!accepted || !selectedRoute}
              onClick={() => void start()}
            >
              {busy ? "Preparing checkout…" : "Create secure checkout"}
            </Action>
          </fieldset>
        )}
      {data?.enabled && !latest && !policy && (
        <p>
          A payment policy must be published before checkout becomes available.
        </p>
      )}
      {latest && (
        <div className="payment-current">
          <p className="eyebrow">Current payment</p>
          <h3>{paymentTitle(latest.state, latest.issue, expired)}</h3>
          <p role="status">
            {expired && latest.state === "awaiting_payment" && !latest.issue
              ? "Waiting for the provider to reconcile this checkout. Expiry alone does not confirm whether funds were received."
              : paymentMessage(latest.state, latest.issue)}
          </p>
          <dl className="payment-facts">
            <div>
              <dt>Order amount</dt>
              <dd>
                {latest.currency} {minorDisplay(latest.amount_minor)}
              </dd>
            </div>
            <div>
              <dt>Payment asset</dt>
              <dd>{latest.route.label}</dd>
            </div>
            <div>
              <dt>Network</dt>
              <dd>{latest.route.network}</dd>
            </div>
            <div>
              <dt>Checkout deadline</dt>
              <dd>
                <time dateTime={latest.expires_at}>
                  {new Date(latest.expires_at).toLocaleString()}
                </time>
              </dd>
            </div>
          </dl>
          {latest.state === "awaiting_payment" && expired && (
            <p className="payment-route-note">
              This local checkout window has ended. Do not use the old payment
              link. If you already sent funds, wait for reconciliation or
              contact support.
            </p>
          )}
          {latest.checkout_url &&
            latest.state === "awaiting_payment" &&
            !expired &&
            !admin && (
              <a
                className="button"
                href={latest.checkout_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Continue to NOWPayments ↗
              </a>
            )}
          <p>
            Returning from the provider does not confirm payment. This page
            updates from verified provider evidence.
          </p>
          <Action disabled={resource.loading} onClick={resource.reload}>
            {resource.loading ? "Checking payment…" : "Refresh payment"}
          </Action>
        </div>
      )}
      {data && data.attempts.length > 0 && (
        <details className="payment-history">
          <summary>
            Checkout history & accepted policies ({data.attempts.length})
          </summary>
          {data.attempts.map((a) => (
            <details key={a.id}>
              <summary>
                Checkout {new Date(a.created_at).toLocaleString()} ·{" "}
                {a.state.replaceAll("_", " ")}
              </summary>
              <p>{paymentMessage(a.state, a.issue)}</p>
              <p className="payment-policy">{a.policy.data.text}</p>
              <p>
                Local window ends{" "}
                <time dateTime={a.expires_at}>
                  {new Date(a.expires_at).toLocaleString()}
                </time>
              </p>
            </details>
          ))}
        </details>
      )}
      {data && (
        <section className="payment-receipts" aria-label="Received funds">
          <h3>Received funds</h3>
          {data.receipts.length === 0 && (
            <p>
              No received funds recorded. A payment link or provider redirect is
              not a receipt.
            </p>
          )}
          {data.receipts.map((receipt) => (
            <article key={receipt.id} className="payment-receipt">
              <strong>
                {receipt.amount} {receipt.currency.toUpperCase()}
              </strong>
              <p>
                {receipt.network} · {receipt.state}
              </p>
              <p>
                {receipt.allocated_minor
                  ? `${receipt.allocated_currency} ${minorDisplay(receipt.allocated_minor)} allocated to this agreement.`
                  : "No amount allocated to this agreement."}
              </p>
              <details>
                <summary>Receipt reference</summary>
                <small>{receipt.id}</small>
                <p>
                  <time dateTime={receipt.created_at}>
                    {new Date(receipt.created_at).toLocaleString()}
                  </time>
                </p>
              </details>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}
