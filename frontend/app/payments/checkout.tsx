import { useEffect, useState } from "react";
import { Action, Check, ErrorNotice, Select } from "../catalog/controls";
import { minorDisplay } from "../catalog/dynamic-form";
import { post } from "../identity/api";
import type { Detail } from "../orders/model";
import { useResource } from "../orders/resource";
import { attemptSchema, historySchema, paymentMessage } from "./model";
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
  const accepted = !!policy && acceptedPolicy === policy.id;
  const polling =
    !!latest &&
    ["new", "creating", "uncertain", "awaiting_payment", "confirming"].includes(
      latest.state,
    );
  useEffect(() => {
    if (!polling) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (document.visibilityState === "visible") reload();
    }, 10000);
    return () => {
      window.clearInterval(timer);
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
    if (!policy || !detail.contract) return;
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
      {!data && <p role="status">Loading payment information…</p>}
      {data && !data.enabled && (
        <p>
          Checkout is currently unavailable. Your order and agreed price remain
          visible here. Contact support for updates.
        </p>
      )}
      {!admin &&
        data?.enabled &&
        !latest &&
        detail.order.state === "awaiting_payment" &&
        policy && (
          <fieldset disabled={busy} key={policy.id}>
            <legend>{policy.data.label}</legend>
            <p className="payment-policy">{policy.data.text}</p>
            <p>
              Processing fees:{" "}
              {policy.data.fee_mode === "customer"
                ? "paid by you"
                : "paid by Booster Plus"}
              . Exchange rate: {policy.data.rate_mode}. Local checkout window:{" "}
              {policy.data.window_minutes} minutes. The provider may impose a
              shorter deposit window; follow its instructions.
            </p>
            <Select
              label="Payment asset and network"
              value={route}
              change={setRoute}
              options={[
                ["", "Choose an asset and network"],
                ...policy.data.routes.map(
                  (v) => [v.code, `${v.label} · ${v.network}`] as const,
                ),
              ]}
            />
            <Check
              label="I accept this payment policy and the agreed order price"
              value={accepted}
              change={(value) => {
                setAcceptedPolicy(value ? policy.id : "");
              }}
            />
            <Action disabled={!accepted || !route} onClick={() => void start()}>
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
          <h3>Current payment</h3>
          <p role="status">{paymentMessage(latest.state, latest.issue)}</p>
          <p>
            {latest.currency} {minorDisplay(latest.amount_minor)} ·{" "}
            {latest.route.label} · {latest.route.network}
          </p>
          {latest.checkout_url &&
            latest.state === "awaiting_payment" &&
            new Date(latest.expires_at).getTime() > now &&
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
          <Action onClick={resource.reload}>Refresh payment</Action>
        </div>
      )}
      {data?.attempts.map((a) => (
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
      <h3>Received funds</h3>
      {data?.receipts.length === 0 && <p>No received funds recorded.</p>}
      {data?.receipts.map((receipt) => (
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
          <small>Receipt {receipt.id}</small>
        </article>
      ))}
    </section>
  );
}
