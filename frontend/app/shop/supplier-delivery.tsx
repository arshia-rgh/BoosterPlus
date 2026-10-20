import { useCallback, useEffect, useRef, useState } from "react";
import { Action, ErrorNotice } from "../catalog/controls";
import { Link } from "../portal-router";
import { post } from "../identity/api";
import { sessionEventMatches } from "../identity/portal";
import { ActionFields } from "../ui/action-fields";
import { Button } from "../ui/primitives";
import { minorDisplay } from "../catalog/dynamic-form";
import {
  supplierActionSchema,
  supplierCodesSchema,
  supplierMethodNames,
} from "../suppliers/contracts";
import type { ShopDelivery } from "./model";
import type { z } from "../validation";

const statusLabels = new Map(
  Object.entries({
    awaiting_payment: "Awaiting payment",
    checking: "Checking delivery availability",
    sending: "Starting delivery",
    unresolved: "Checking delivery status",
    pending: "Delivery in progress",
    held: "Delivery needs support review",
    partial: "Partially delivered",
    cancelled: "Delivery needs support review",
    completed: "Delivered",
  }),
);
type DeliveryProps = {
  data: ShopDelivery;
  admin: boolean;
  refresh: () => void;
};
export function SupplierDelivery(props: DeliveryProps) {
  const { data, admin } = props;
  const scope = `${data.order_id}:${String(data.order_version)}:${data.order_state}:${String(data.version)}:${data.state}:${String(data.supplier?.codes_available)}:${String(data.supplier?.needs_review)}:${String(admin)}`;
  return <PrivateDelivery key={scope} {...props} />;
}
function PrivateDelivery({ data, admin, refresh }: DeliveryProps) {
  const closedOrder = ["cancelled", "expired", "rejected"].includes(
    data.order_state,
  );
  const blockedOrder = closedOrder || data.order_state === "on_hold";
  const [keys, setKeys] = useState<z.infer<typeof supplierCodesSchema> | null>(
    null,
  );
  const [action, setAction] = useState<z.infer<
    typeof supplierActionSchema
  > | null>(null);
  const [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState("");
  const epoch = useRef(0),
    lock = useRef(false),
    privateHeading = useRef<HTMLHeadingElement>(null),
    revealButton = useRef<HTMLButtonElement>(null);
  const invalidate = useCallback(() => {
    epoch.current++;
  }, []);
  const hide = useCallback(() => {
    epoch.current++;
    setKeys(null);
    setAction(null);
    setCopied("");
    setError(null);
    setBusy(false);
    lock.current = false;
  }, []);
  useEffect(() => {
    const changed = (event: Event) => {
      if (sessionEventMatches(event, admin ? "admin" : "customer")) hide();
    };
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("boosterplus:session-changed", changed);
    return () => {
      invalidate();
      window.removeEventListener("blur", hide);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("boosterplus:session-changed", changed);
    };
  }, [admin, hide, invalidate]);
  useEffect(() => {
    if (!keys && !action) return;
    privateHeading.current?.focus({ preventScroll: true });
    const timer = setTimeout(hide, 60000);
    return () => {
      clearTimeout(timer);
    };
  }, [keys, action, hide]);
  async function reveal(kind: "codes" | "action") {
    if (
      admin ||
      blockedOrder ||
      lock.current ||
      data.supplier?.needs_review ||
      (kind === "codes"
        ? !data.supplier?.codes_available || data.state !== "completed"
        : data.state !== "pending")
    )
      return;
    lock.current = true;
    setBusy(true);
    setError(null);
    const generation = epoch.current;
    try {
      if (kind === "codes") {
        const result = await post(
          `/orders/${data.order_id}/shop/codes`,
          {},
          supplierCodesSchema,
          undefined,
          () => generation === epoch.current,
        );
        if (generation === epoch.current) setKeys(result);
      } else {
        const result = await post(
          `/orders/${data.order_id}/shop/action`,
          {},
          supplierActionSchema,
          undefined,
          () => generation === epoch.current,
        );
        if (generation === epoch.current) setAction(result);
      }
    } catch (cause) {
      if (generation === epoch.current) setError(cause);
    } finally {
      if (generation === epoch.current) {
        setBusy(false);
        lock.current = false;
      }
    }
  }
  const method = data.purchase.product.supplier?.method ?? "id";
  const methodLabel =
    method === "account"
      ? supplierMethodNames.account
      : method === "code"
        ? supplierMethodNames.code
        : supplierMethodNames.id;
  const verifiedAction =
    action &&
    ((action.kind === "verification" &&
      safeVerificationURL(action.url, !!data.supplier?.testing)) ||
      (action.kind === "join_game" && safeRobloxURL(action.profile_url)));
  return (
    <ActionFields error={error} busy={busy}>
      <section className="supplier-delivery shop-purchase">
        <p className="eyebrow">{methodLabel}</p>
        <h3>
          {closedOrder
            ? data.order_state === "expired"
              ? "Order expired"
              : data.order_state === "rejected"
                ? "Order not accepted"
                : "Order cancelled"
            : data.order_state === "on_hold" || data.supplier?.needs_review
              ? "Delivery needs support review"
              : verifiedAction
                ? "Action needed to complete delivery"
                : data.state === "completed" && data.supplier?.codes_available
                  ? "Codes ready"
                  : (statusLabels.get(data.state) ??
                    "Checking delivery status")}
        </h3>
        <p>
          {data.purchase.product.title} · Quantity{" "}
          {data.purchase.supplier_quantity}
        </p>
        <p>
          Accepted total: {data.purchase.variant.currency}{" "}
          {minorDisplay(data.purchase.amount_minor)}
        </p>
        <p>
          {data.purchase.variant.region} · {data.purchase.variant.platform}
        </p>
        {data.state === "partial" &&
          data.supplier?.requested &&
          data.supplier.delivered && (
            <p>
              Delivered {data.supplier.delivered} of {data.supplier.requested}{" "}
              requested. Support will review the remaining amount.
            </p>
          )}
        <p>
          Updated{" "}
          <time dateTime={data.updated_at}>
            {new Date(data.updated_at).toLocaleString()}
          </time>
        </p>
        {data.supplier?.testing && (
          <p className="supplier-badge">Sandbox delivery</p>
        )}
        {closedOrder ? (
          <p>
            This order is closed. Open Messages for help. Any refund is recorded
            separately.
          </p>
        ) : data.order_state === "on_hold" ||
          data.supplier?.needs_review ||
          data.state === "cancelled" ||
          data.state === "held" ? (
          <p>
            Support is reviewing this delivery. Don’t place or pay for a
            replacement. Any refund will be recorded separately.
          </p>
        ) : data.state === "unresolved" ? (
          <p>
            We are checking the supplier’s response. This does not mean your
            order failed. You do not need to order again.
          </p>
        ) : data.state === "awaiting_payment" ? (
          <p>
            Complete payment in this order. Delivery starts after payment is
            verified.
          </p>
        ) : data.state === "pending" ? (
          <p>
            {method === "account"
              ? "Delivery is estimated at 24–72 hours. Some products need you to sign in on a secure verification page."
              : "Delivery is being processed. Some in-game trades need you to join a game."}
          </p>
        ) : null}
        <ErrorNotice error={error} />
        <div className="button-row">
          {!admin &&
            !blockedOrder &&
            data.state === "awaiting_payment" &&
            !data.supplier?.needs_review && (
              <Link
                className="button"
                to={`/orders/${data.order_id}?section=payment`}
              >
                Go to payment
              </Link>
            )}
          <Button
            variant="secondary"
            onClick={() => {
              hide();
              refresh();
            }}
          >
            Refresh delivery
          </Button>
          <Link
            className="ui-button"
            data-variant="secondary"
            to={`${admin ? "/admin" : ""}/orders/${data.order_id}?section=messages`}
          >
            Open messages
          </Link>
          {!admin &&
            !blockedOrder &&
            data.state === "pending" &&
            !action &&
            !data.supplier?.needs_review && (
              <Action disabled={busy} onClick={() => void reveal("action")}>
                Check required action
              </Action>
            )}
          {!admin &&
            !blockedOrder &&
            data.supplier?.codes_available &&
            !data.supplier.needs_review &&
            data.state === "completed" && (
              <button
                type="button"
                ref={revealButton}
                className="button"
                disabled={busy || !!keys}
                onClick={() => void reveal("codes")}
              >
                Reveal my codes
              </button>
            )}
        </div>
        {busy && <p role="status">Checking protected delivery details…</p>}
        {action && (
          <section aria-label="Required delivery action">
            <h4 ref={privateHeading} tabIndex={-1}>
              Delivery action
            </h4>
            {action.kind === "none" ? (
              <p>No additional action is currently required.</p>
            ) : action.kind === "verification" &&
              safeVerificationURL(action.url, !!data.supplier?.testing) ? (
              <>
                <p>
                  Complete the account verification for this order. PLAYORA
                  never needs your PLAYORA or email sign-in code here.
                </p>
                <a
                  className="button"
                  href={action.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Open Nexus verification
                </a>
              </>
            ) : action.kind === "join_game" &&
              safeRobloxURL(action.profile_url) ? (
              <>
                <p>Join {action.employee} for the in-game delivery.</p>
                <a
                  className="button"
                  href={action.profile_url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Open employee’s Roblox profile
                </a>
              </>
            ) : (
              <p>The action could not be verified. Contact support.</p>
            )}
          </section>
        )}
        {keys && (
          <section aria-label="Private delivery codes">
            <h4 ref={privateHeading} tabIndex={-1}>
              Your delivery codes
            </h4>
            <p>
              These codes belong to you. They hide after one minute or when you
              leave this window.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                hide();
                requestAnimationFrame(() => {
                  revealButton.current?.focus();
                });
              }}
            >
              Hide codes
            </Button>
            {keys.keys.map((key, index) => (
              <div key={index} className="supplier-code">
                <h4>Code {String(index + 1)}</h4>
                <code>{key.code}</code>
                {key.cardNo && <p>Card number: {key.cardNo}</p>}
                {key.expireAt && <p>Expires: {key.expireAt}</p>}
                {key.url && safeRedemptionURL(key.url) && (
                  <p>
                    <a href={key.url} target="_blank" rel="noreferrer noopener">
                      Redeem code at {new URL(key.url).hostname}
                    </a>
                  </p>
                )}
                {key.url && !safeRedemptionURL(key.url) && (
                  <p>
                    The redemption link could not be verified. Contact support
                    before using it.
                  </p>
                )}
                <Action
                  onClick={() => {
                    const generation = epoch.current;
                    void Promise.resolve()
                      .then(() => navigator.clipboard.writeText(key.code))
                      .then(() => {
                        if (generation === epoch.current)
                          setCopied(`Code ${String(index + 1)} copied.`);
                      })
                      .catch(() => {
                        if (generation === epoch.current)
                          setCopied(
                            "Could not copy. Select the code and copy it manually.",
                          );
                      });
                  }}
                >
                  Copy code {String(index + 1)}
                </Action>
              </div>
            ))}
            <p role="status">{copied}</p>
          </section>
        )}
        <details>
          <summary>Accepted delivery and refund terms</summary>
          <p>{data.purchase.product.policy.delivery_terms}</p>
          <p>{data.purchase.product.policy.cancellation_terms}</p>
          <p>{data.purchase.product.policy.refund_terms}</p>
          <p>{data.purchase.product.policy.fees}</p>
        </details>
      </section>
    </ActionFields>
  );
}

export function safeRedemptionURL(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function safeVerificationURL(value: string, testing: boolean) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.host ===
        (testing ? "nexus-sandbox.amadeustech.dev" : "nexus.amadeustech.dev") &&
      !url.username &&
      !url.password &&
      !url.hash
    );
  } catch {
    return false;
  }
}
export function safeRobloxURL(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.host === "www.roblox.com" &&
      /^\/users\/[1-9][0-9]*\/profile$/.test(url.pathname) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}
