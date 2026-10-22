import { ActionFields } from "../ui/action-fields";
import { useEffect, useRef, useState } from "react";
import { Anchor } from "../portal-router";
import { Action, Check, ErrorNotice } from "../catalog/controls";
import { minorDisplay } from "../catalog/dynamic-form";
import { APIError, post } from "../identity/api";
import { focusValidationTarget } from "../ui/form-validation";
import type { Detail } from "../orders/model";
import { useResource } from "../orders/resource";
import {
  attemptSchema,
  historySchema,
  paymentMessage,
  remedyLabels,
  remedyText,
} from "./model";
import { continueToProvider } from "./provider-navigation";
import { paymentTitle } from "./presentation";
import { usePaymentOptions } from "./options";
import PaymentChoices from "./payment-choices";
import DepositInstructions from "./deposit-instructions";
import {
  effectiveInstructionStatus,
  instructionMessage,
  instructionTitle,
} from "./presentation";
import "./workspace.css";
export default function Checkout({
  detail,
  admin,
  changed,
  redirectIntent,
}: {
  detail: Detail;
  admin: boolean;
  changed: () => void;
  redirectIntent?: { id: string | null; set: (id: string | null) => void };
}) {
  const base = (admin ? "/admin/orders/" : "/orders/") + detail.order.id;
  const resource = useResource(base + "/payments", historySchema);
  const reload = resource.reload;
  const [tick, setNow] = useState(() => ({
    local: Date.now(),
    monotonic: performance.now(),
  }));
  const [connection, setConnection] = useState({
    blocked: false,
    after: -Infinity,
  });
  const [route, setRoute] = useState(""),
    [acceptedPolicy, setAcceptedPolicy] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const data = resource.data,
    policy = data?.policy,
    latest = data?.attempts[0];
  const serverTime = Date.parse(data?.server_time ?? "");
  const requestTime = resource.requestedAt ?? NaN;
  // Start at request dispatch, conservatively including network latency.
  const currentTime = () =>
    serverTime + Math.max(0, performance.now() - requestTime);
  const nativeNow = serverTime + Math.max(0, tick.monotonic - requestTime);
  const now = Number.isFinite(nativeNow) ? nativeNow : tick.local;
  const unavailable =
    connection.blocked ||
    (connection.after !== -Infinity &&
      (!Number.isFinite(requestTime) || requestTime < connection.after));
  const effectiveInstructions = latest
    ? effectiveInstructionStatus(latest, nativeNow, unavailable)
    : "not_applicable";
  const nativeWaiting =
    latest?.native_checkout && latest.state === "awaiting_payment";
  const consentKey = `${policy?.id ?? ""}:${detail.contract?.id ?? ""}:${route}`;
  const accepted = !!policy && acceptedPolicy === consentKey;
  const lock = useRef(false);
  const [localRedirect, setLocalRedirect] = useState<string | null>(null);
  const pendingRedirect = redirectIntent ? redirectIntent.id : localRedirect;
  const setPendingRedirect = redirectIntent?.set ?? setLocalRedirect;
  const lastRedirect = useRef<string | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const paymentHeading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error && !(error instanceof APIError && error.issues.length))
      focusValidationTarget(feedback.current);
  }, [error]);
  useEffect(() => {
    // Only the customer's own newly-created attempt moves focus. Polling and
    // payment reconciliation updates must not interrupt reading or typing.
    if (pendingFocus.current && pendingFocus.current === latest?.id) {
      pendingFocus.current = null;
      focusValidationTarget(paymentHeading.current);
    }
  }, [latest]);
  const optionsBinding =
    !admin &&
    data?.enabled &&
    !latest &&
    policy &&
    detail.contract &&
    detail.order.state === "awaiting_payment"
      ? `${policy.id}:${detail.contract.id}`
      : null;
  const options = usePaymentOptions(base, optionsBinding);
  const optionsMatch =
    !!options.data &&
    options.data.policy_id === policy?.id &&
    options.data.contract_id === detail.contract?.id &&
    options.data.currency === detail.contract.data.currency &&
    options.data.amount_minor === detail.contract.data.amount_minor;
  const optionsReady =
    optionsMatch && !options.loading && !options.error && !options.expired;
  const selectedRoute =
    optionsReady &&
    options.data?.routes.some(
      (v) => v.code === route && v.status === "available",
    )
      ? policy.data.routes.find((v) => v.code === route)
      : undefined;
  const [selectionNotice, setSelectionNotice] = useState("");
  // Adjust this component's selection before rendering stale consent/choices.
  if (route && !options.loading && !selectedRoute) {
    setRoute("");
    setAcceptedPolicy("");
    setSelectionNotice("Your previous payment option is no longer available.");
  }
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
      setNow({ local: Date.now(), monotonic: performance.now() });
    }, 1000);
    const refresh = () => {
      if (!document.hidden && navigator.onLine) reload();
    };
    const reconnect = () => {
      setConnection({
        blocked: document.hidden || !navigator.onLine,
        after: performance.now(),
      });
      refresh();
    };
    const timer = window.setInterval(refresh, 10000);
    document.addEventListener("visibilitychange", reconnect);
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", reconnect);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(clock);
      document.removeEventListener("visibilitychange", reconnect);
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", reconnect);
    };
  }, [polling, reload]);
  useEffect(() => {
    if (
      latest?.state === "settled" &&
      detail.contract?.payment_state !== "settled"
    )
      changed();
  }, [latest?.state, detail.contract?.payment_state, changed]);
  useEffect(() => {
    if (
      latest &&
      pendingRedirect &&
      pendingRedirect === latest.id &&
      lastRedirect.current !== latest.id &&
      latest.checkout_url &&
      !latest.native_checkout &&
      latest.state === "awaiting_payment" &&
      !latest.issue &&
      !expired &&
      !unavailable &&
      !resource.error &&
      !admin
    ) {
      lastRedirect.current = latest.id;
      setPendingRedirect(null);
      continueToProvider(latest.checkout_url);
    }
  }, [
    latest,
    expired,
    unavailable,
    resource.error,
    admin,
    pendingRedirect,
    setPendingRedirect,
  ]);
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
      const attempt = await post(
        base + "/checkout",
        {
          contract_id: detail.contract.id,
          policy_id: policy.id,
          route,
          accept_policy: accepted,
        },
        attemptSchema,
      );
      setPendingRedirect(attempt.id);
      pendingFocus.current = attempt.id;
      resource.reload();
      changed();
    } catch (cause) {
      setError(cause);
      if (
        cause instanceof APIError &&
        [
          "payment_below_minimum",
          "payments_unavailable",
          "payment_conflict",
        ].includes(cause.code)
      ) {
        setRoute("");
        setAcceptedPolicy("");
        options.reload();
        if (cause.code === "payment_conflict") {
          resource.reload();
          changed();
        }
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <ActionFields error={error} busy={busy}>
      <section
        className="catalog-section payment-panel"
        aria-label="Payment and receipts"
      >
        <p className="eyebrow">Direct crypto checkout</p>
        <h2 ref={paymentHeading} tabIndex={-1}>
          Payment and receipts
        </h2>
        <div ref={feedback} tabIndex={-1}>
          <ErrorNotice error={resource.error ?? error} />
          {error instanceof APIError &&
            error.code === "payment_below_minimum" && (
              <p>
                <Anchor href={base + "?section=messages"}>
                  Ask support about this order
                </Anchor>
              </p>
            )}
        </div>
        {!data && resource.loading && (
          <p role="status">Loading payment information…</p>
        )}
        {!!resource.error && (
          <div className="payment-status-unavailable">
            <p role="status">
              Payment status cannot be verified right now. This order remains
              available. If you already sent funds, do not send again; retry the
              status check or contact support from this order.
            </p>
            <Action disabled={resource.loading} onClick={reload}>
              Try payment information again
            </Action>
          </div>
        )}
        {data && (
          <ol className="payment-steps" aria-label="Payment progress">
            <li aria-current={!latest ? "step" : undefined}>
              1. Choose payment
            </li>
            <li
              aria-current={
                latest &&
                !["settled", "exception", "closed"].includes(latest.state)
                  ? "step"
                  : undefined
              }
            >
              2. Complete payment
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
              <PaymentChoices
                routes={policy.data.routes}
                data={optionsMatch ? options.data : null}
                loading={options.loading}
                error={
                  options.error ||
                  (!options.loading && !optionsMatch) ||
                  options.expired
                }
                route={route}
                change={(value) => {
                  setRoute(value);
                  setAcceptedPolicy("");
                  setSelectionNotice("");
                }}
                retry={() => {
                  resource.reload();
                  options.reload();
                }}
                support={`/orders/${detail.order.id}?section=help`}
              />
              {selectionNotice && <p role="status">{selectionNotice}</p>}
              {selectedRoute && (
                <p className="payment-route-note">
                  Use {selectedRoute.label} on {selectedRoute.network} only. The
                  provider displays the exact crypto amount and destination
                  before you send.
                </p>
              )}
              <dl className="payment-facts">
                <div>
                  <dt>Processing fees</dt>
                  <dd>
                    {policy.data.fee_mode === "customer"
                      ? "Paid by you"
                      : "Paid by PLAYORA"}
                  </dd>
                </div>
                <div>
                  <dt>Exchange rate</dt>
                  <dd>{policy.data.rate_mode}</dd>
                </div>
                <div>
                  <dt>Checkout window</dt>
                  <dd>
                    {policy.data.window_minutes} minutes (the provider’s may be
                    shorter)
                  </dd>
                </div>
              </dl>
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
              <Check
                name="accept_policy"
                disabled={!selectedRoute || busy}
                label="I accept this payment policy and the agreed order price"
                value={accepted}
                change={(value) => {
                  setAcceptedPolicy(value ? consentKey : "");
                }}
              />
              <div className="form-actions">
                <Action
                  disabled={!accepted || !selectedRoute}
                  onClick={() => void start()}
                >
                  {busy ? "Preparing checkout…" : "Go to payment"}
                </Action>
              </div>
              <p className="quiet">
                You’ll pay on NOWPayments, then return here for your receipt.
              </p>
            </fieldset>
          )}
        {data?.enabled && !latest && !policy && (
          <p>
            A payment policy must be published before checkout becomes
            available.
          </p>
        )}
        {latest && (
          <div className="payment-current">
            <p className="eyebrow">Current payment</p>
            <h3>
              {nativeWaiting
                ? instructionTitle(effectiveInstructions, expired)
                : paymentTitle(latest.state, latest.issue, expired)}
            </h3>
            <p role="status">
              {nativeWaiting
                ? instructionMessage(effectiveInstructions, expired)
                : expired &&
                    latest.state === "awaiting_payment" &&
                    !latest.issue
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
              {!latest.native_checkout && (
                <div>
                  <dt>Checkout deadline</dt>
                  <dd>
                    <time dateTime={latest.expires_at}>
                      {new Date(latest.expires_at).toLocaleString()}
                    </time>
                  </dd>
                </div>
              )}
            </dl>
            {latest.state === "awaiting_payment" && expired && (
              <p className="payment-route-note">
                This local checkout window has ended. Do not use the old payment
                instructions or link. If you already sent funds, wait for
                reconciliation or contact support.
              </p>
            )}
            {latest.native_checkout && latest.deposit && !admin && (
              <DepositInstructions
                deposit={latest.deposit}
                route={latest.route}
                now={nativeNow}
                currentTime={currentTime}
                unavailable={
                  unavailable ||
                  !!resource.error ||
                  effectiveInstructions !== "ready"
                }
              />
            )}
            {latest.checkout_url &&
              !latest.native_checkout &&
              !latest.issue &&
              !unavailable &&
              !resource.error &&
              latest.state === "awaiting_payment" &&
              !expired &&
              !admin && (
                <a
                  className="button"
                  href={latest.checkout_url}
                  rel="noreferrer"
                >
                  Go to payment
                </a>
              )}
            {!latest.native_checkout &&
              !latest.checkout_url &&
              latest.state === "awaiting_payment" &&
              !latest.issue &&
              !expired && (
                <div>
                  <p role="status">
                    Your checkout exists, but its payment link is still being
                    recovered.{" "}
                    {unavailable || resource.error
                      ? "Reconnect, then refresh payment information."
                      : "We’re checking it automatically."}{" "}
                    Do not create another payment.
                  </p>
                  <Anchor
                    className="text-link"
                    href={base + "?section=messages"}
                  >
                    Ask support about this checkout
                  </Anchor>
                </div>
              )}
            {latest.issue && (
              <Anchor className="text-link" href={base + "?section=messages"}>
                Ask support about this payment
              </Anchor>
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
                No received funds recorded. A payment link or provider redirect
                is not a receipt.
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
    </ActionFields>
  );
}
