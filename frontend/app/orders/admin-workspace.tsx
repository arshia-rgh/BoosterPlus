import { mediaReturn } from "../admin/directory-filters";
import { useCallback, useContext, useEffect, useState } from "react";
import { Link, useLocation, useParams, type Location } from "react-router";
import { z } from "../validation";
import { Action, ErrorNotice } from "../catalog/controls";
import { minorDisplay } from "../catalog/dynamic-form";
import { AuthorizedIdentity } from "../identity/frame";
import { sessionEventMatches } from "../identity/portal";
import { denied } from "../support/chat-state";
import { RecordDraftBoundary } from "../ui/record-drafts";
import { RecordShell } from "../ui/record-shell";
import OrderMessages from "../support/order-messages";
import FulfillmentPanel from "../fulfillment/panel";
import { financeReturn } from "../payments/finance-context";
import Checkout from "../payments/checkout";
import Cases from "../payments/cases";
import ShopDeliveryPanel from "../shop/delivery";
import AccountDelivery from "../resale/delivery";
import { detailSchema, stateLabel, type Detail } from "./model";
import { useResource } from "./resource";
import { Agreement, Decisions, History, RequestDetails } from "./parts";
import QuoteEditor from "./quote-editor";
import "./order-workspace.css";
import "./admin-workspace.css";
const sections = [
  { id: "overview", label: "Overview" },
  { id: "request", label: "Request & decisions" },
  { id: "quote", label: "Quote & agreement" },
  { id: "fulfillment", label: "Fulfillment" },
  { id: "messages", label: "Messages & proof" },
  { id: "payment", label: "Payment & cases" },
  { id: "history", label: "Activity" },
];
function Workspace({
  detail,
  back,
  owner,
  loading,
  suspended,
  reload,
}: {
  detail: Detail;
  back: string;
  owner: boolean;
  loading: boolean;
  suspended: boolean;
  reload: () => void;
}) {
  const base = `/admin/orders/${detail.order.id}`;
  const location: Location<unknown> = useLocation();
  const agreement = detail.contract?.data ?? detail.quote?.data;
  const paid = detail.contract?.payment_state === "settled";
  const canQuote =
    detail.order.kind === "custom" &&
    !detail.contract &&
    ["submitted", "quoted"].includes(detail.order.state);
  const local = (section: string, label: string) => (
    <Link to={`?section=${section}`} state={location.state} preventScrollReset>
      {label}
    </Link>
  );
  return (
    <div className="admin-order-workspace">
      <RecordDraftBoundary>
        <RecordShell
          id={detail.order.id}
          title="Order"
          workspace="Admin workspace"
          headingLevel={2}
          stickyStatus={stateLabel(detail.order.state)}
          compactReference
          back={{
            to: back,
            label: back.startsWith("/admin/media")
              ? "Back to media directory"
              : back.startsWith("/admin/shop")
                ? "Shop fulfillment queue"
                : back.startsWith("/admin/finance?")
                  ? "Finance workspace"
                  : "Order queue",
          }}
          sections={sections}
          keepMounted={[
            "request",
            "quote",
            "fulfillment",
            "messages",
            "payment",
          ]}
          status={
            <>
              <strong>{detail.order.game_name}</strong>
              <span className="status">{stateLabel(detail.order.state)}</span>
              <span>Revision {detail.order.version}</span>
              <Action disabled={loading} onClick={reload}>
                Refresh order
              </Action>
            </>
          }
        >
          {(section, visible) => (
            <fieldset
              className="admin-record-content"
              disabled={loading || suspended}
            >
              <legend className="sr-only">
                {sections.find((item) => item.id === section)?.label}
              </legend>
              {section === "overview" && (
                <>
                  <h3>Review this order</h3>
                  <p>
                    Keep customer decisions, work assignment and payment
                    evidence attached to this record.
                  </p>
                  <dl>
                    <dt>Reference</dt>
                    <dd>{detail.order.id}</dd>
                    <dt>Service</dt>
                    <dd>
                      {detail.order.service} · {detail.order.kind}
                    </dd>
                    <dt>Payment</dt>
                    <dd>
                      {detail.contract?.payment_state.replaceAll("_", " ") ??
                        "No accepted agreement"}
                    </dd>
                  </dl>
                  <div className="catalog-actions">
                    {canQuote
                      ? local("quote", "Prepare customer quote")
                      : paid
                        ? local("fulfillment", "Review fulfillment")
                        : local("request", "Review request")}
                    {local("messages", "Contact customer")}
                  </div>
                  {!paid && (
                    <p>
                      Fulfillment remains unavailable until payment is verified
                      for the current agreement.
                    </p>
                  )}
                </>
              )}
              {section === "request" && (
                <>
                  <h3>Customer request & decisions</h3>
                  {detail.order.kind === "shop" ? (
                    <p>
                      The accepted item, compatibility, quantity and delivery
                      terms are retained in this order.{" "}
                      {local(
                        "fulfillment",
                        "Review shop purchase and delivery",
                      )}
                      . Recipient identifiers stay protected there.
                    </p>
                  ) : (
                    <RequestDetails detail={detail} admin done={reload} />
                  )}
                  <Decisions detail={detail} admin done={reload} />
                </>
              )}
              {section === "quote" && (
                <>
                  <h3>Quote & agreement</h3>
                  {agreement ? (
                    <section
                      aria-label={
                        detail.contract ? "Accepted agreement" : "Current quote"
                      }
                    >
                      <h4>
                        {detail.contract
                          ? "Accepted agreement"
                          : `Current quote · revision ${String(agreement.revision)}`}
                      </h4>
                      <Agreement data={agreement} />
                    </section>
                  ) : (
                    <p>
                      {detail.estimate.outcome === "estimated"
                        ? `Original estimate: ${detail.estimate.currency} ${minorDisplay(detail.estimate.amount_minor)}. `
                        : ""}
                      No final quote has been issued.
                    </p>
                  )}
                  {canQuote && <QuoteEditor detail={detail} done={reload} />}
                </>
              )}
              {section === "fulfillment" && (
                <>
                  <h3>Assignment, progress & delivery</h3>
                  {!paid ? (
                    <p>
                      Verified payment is required before assignment or
                      delivery.
                    </p>
                  ) : detail.order.kind === "shop" ? (
                    <ShopDeliveryPanel
                      id={detail.order.id}
                      admin
                      visible={visible && !suspended && !loading}
                      changed={reload}
                    />
                  ) : detail.order.kind === "account" ? (
                    <AccountDelivery
                      visible={visible && !suspended && !loading}
                      id={detail.order.id}
                      admin
                      owner={owner}
                      paid={["queued", "in_progress", "completed"].includes(
                        detail.order.state,
                      )}
                      changed={reload}
                    />
                  ) : (
                    <FulfillmentPanel
                      detail={detail}
                      admin
                      reload={reload}
                      visible={visible && !suspended && !loading}
                      localCoordination
                    />
                  )}
                </>
              )}
              {section === "messages" && (
                <OrderMessages
                  detail={detail}
                  admin
                  visible={visible && !suspended && !loading}
                />
              )}
              {section === "payment" && (
                <>
                  <h3>Payment evidence & service cases</h3>
                  {detail.contract ? (
                    <>
                      <Checkout detail={detail} admin changed={reload} />
                      <Cases
                        detail={detail}
                        admin
                        owner={owner}
                        changed={reload}
                      />
                    </>
                  ) : (
                    <p>
                      No accepted agreement yet.{" "}
                      {local("quote", "Review the quote")}
                    </p>
                  )}
                </>
              )}
              {section === "history" && (
                <History base={base} revision={detail.order.version} />
              )}
            </fieldset>
          )}
        </RecordShell>
      </RecordDraftBoundary>
    </div>
  );
}
function AdminOrderSession() {
  const { id = "" } = useParams();
  const location: Location<unknown> = useLocation();
  const identity = useContext(AuthorizedIdentity);
  const source = z
    .object({ orderListSearch: z.string().max(2048) })
    .safeParse(location.state);
  const shopSource = z
    .object({ shopQueueSearch: z.string().max(2048) })
    .safeParse(location.state);
  const back = shopSource.success
    ? "/admin/shop/orders?" +
      new URLSearchParams(shopSource.data.shopQueueSearch).toString()
    : (mediaReturn(location.state) ??
      financeReturn(location.state) ??
      "/admin/orders" +
        (source.success
          ? "?" + new URLSearchParams(source.data.orderListSearch).toString()
          : ""));
  const resource = useResource(
    `/admin/orders/${encodeURIComponent(id)}`,
    detailSchema,
  );
  const [saved, setSaved] = useState<Detail | null>(null);
  const [interrupted, setInterrupted] = useState(false);
  const [checking, setChecking] = useState(false);
  const wrongPortal =
    !!identity &&
    (identity.session.portal !== "admin" ||
      !identity.session.user ||
      identity.session.mfa_required ||
      !identity.session.capabilities.includes("admin"));
  const lost = interrupted || wrongPortal || denied(resource.error);
  if (lost && saved) setSaved(null);
  else if (!lost && !checking && resource.data && saved !== resource.data)
    setSaved(resource.data);
  const reloadOrder = resource.reload;
  const reload = useCallback(() => {
    if (lost) setChecking(true);
    setInterrupted(false);
    reloadOrder();
  }, [lost, reloadOrder]);
  useEffect(() => {
    const changed = (event: Event) => {
      if (sessionEventMatches(event, "admin")) setInterrupted(true);
    };
    window.addEventListener("boosterplus:session-changed", changed);
    return () => {
      window.removeEventListener("boosterplus:session-changed", changed);
    };
  }, []);
  useEffect(() => {
    if (lost) return;
    const refresh = () => {
      if (!document.hidden) reloadOrder();
    };
    const timer = setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [lost, reloadOrder]);
  if (checking && resource.loading)
    return <p role="status">Checking current admin order access…</p>;
  if (checking && !resource.loading) setChecking(false);
  if (lost)
    return (
      <section aria-label="Admin order access removed">
        <p role="alert">
          Access changed. Private details and unsent drafts have been cleared.
        </p>
        <Link to="/admin/login">Admin sign-in</Link>
        <Action disabled={resource.loading} onClick={reload}>
          Check admin order access
        </Action>
        <Link to={back}>
          {back.startsWith("/admin/media")
            ? "Back to media directory"
            : "Return to source list"}
        </Link>
      </section>
    );
  const detail = resource.data ?? saved;
  const suspended = !!resource.error;
  return (
    <>
      <ErrorNotice error={resource.error} />
      {suspended && (
        <section aria-label="Admin order connection recovery">
          <p>
            Order details are hidden while the connection is unavailable.
            Ordinary unsent drafts stay in memory.
          </p>
          <Action disabled={resource.loading} onClick={reload}>
            Retry admin order
          </Action>
        </section>
      )}
      {!detail && !resource.error && <p role="status">Loading admin order…</p>}
      {detail && (
        <div hidden={suspended}>
          <Workspace
            detail={detail}
            back={back}
            owner={identity?.session.user?.role === "owner"}
            loading={resource.loading}
            suspended={suspended}
            reload={reload}
          />
        </div>
      )}
    </>
  );
}
export default function AdminOrderWorkspace() {
  const { id } = useParams();
  return <AdminOrderSession key={id} />;
}
