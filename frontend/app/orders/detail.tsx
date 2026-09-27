import AccountDelivery from "../resale/delivery";
import Cases from "../payments/cases";
import Checkout from "../payments/checkout";
import OrderProgress from "../experience/order-progress";
import PurchaseReview from "../reviews/form";
import FulfillmentPanel from "../fulfillment/panel";
import { useCallback, useEffect, useState } from "react";
import { z } from "../validation";
import { Link, useLocation, useParams } from "react-router";
import { Action, ErrorNotice } from "../catalog/controls";
import { minorDisplay } from "../catalog/dynamic-form";
import { sessionEventMatches, activePortal } from "../identity/portal";
import { denied } from "../support/chat-state";
import { sessionSchema, type Session } from "../identity/api";
import { detailSchema, stateLabel, type Detail } from "./model";
import { useResource } from "./resource";
import { OrderSupport } from "../support/new";
import QuoteEditor from "./quote-editor";
import { Agreement, History, Decisions, RequestDetails } from "./parts";
import CustomerWorkspace from "./customer-workspace";
import "./order-workspace.css";
function OrderSession({ admin = false }: { admin?: boolean }) {
  const { id = "" } = useParams(),
    base = (admin ? "/admin/orders/" : "/orders/") + encodeURIComponent(id),
    resource = useResource(base, detailSchema),
    session = useResource("/auth/session", sessionSchema);
  const location = useLocation();
  const source = z
    .object({ orderListSearch: z.string().max(2048) })
    .safeParse(location.state);
  const back =
    (admin ? "/admin/orders" : "/orders") +
    (source.success
      ? "?" + new URLSearchParams(source.data.orderListSearch).toString()
      : "");
  const [interrupted, setInterrupted] = useState(false);
  useEffect(() => {
    const changed = (event: Event) => {
      if (sessionEventMatches(event, activePortal())) setInterrupted(true);
    };
    window.addEventListener("boosterplus:session-changed", changed);
    return () => {
      window.removeEventListener("boosterplus:session-changed", changed);
    };
  }, []);
  const reloadOrder = resource.reload,
    reloadSession = session.reload;
  const reload = useCallback(() => {
    setInterrupted(false);
    reloadOrder();
    reloadSession();
  }, [reloadOrder, reloadSession]);
  const [saved, setSaved] = useState<{
    detail: Detail;
    session: Session;
  } | null>(null);
  const detail =
    resource.error ||
    session.error ||
    (!admin &&
      (!session.data || (!saved && (resource.loading || session.loading))))
      ? null
      : resource.data;
  const lost =
    interrupted ||
    denied(resource.error) ||
    denied(session.error) ||
    (session.data &&
      (!session.data.user ||
        session.data.mfa_required ||
        session.data.portal !== "customer" ||
        !session.data.capabilities.includes("account")));
  if (!admin && lost && saved) setSaved(null);
  else if (
    !admin &&
    !lost &&
    detail &&
    session.data &&
    (saved?.detail !== detail || saved.session !== session.data)
  )
    setSaved({ detail, session: session.data });
  if (!admin && lost)
    return (
      <section aria-label="Order access unavailable">
        <p role="alert">
          Order access is no longer available. Sign in to your customer account
          to continue.
        </p>
        <Link to="/login">Customer sign-in</Link>
        <Action disabled={resource.loading || session.loading} onClick={reload}>
          Check order access again
        </Action>
        <Link to={back}>Return to order list</Link>
      </section>
    );
  const current =
    !admin && !lost
      ? detail && session.data
        ? { detail, session: session.data }
        : saved
      : null;
  if (current) {
    const suspended =
      !!resource.error || !!session.error || !detail || !session.data;
    return (
      <>
        {suspended && (
          <section aria-label="Order connection recovery">
            <ErrorNotice error={resource.error ?? session.error} />
            <p role="status">
              Order details are hidden while access is checked. Your unsent
              drafts stay in memory.
            </p>
            <Action
              disabled={resource.loading || session.loading}
              onClick={reload}
            >
              Retry order access
            </Action>
            <Link to={back}>Return to order list</Link>
          </section>
        )}
        <div hidden={suspended}>
          <CustomerWorkspace
            detail={current.detail}
            session={current.session}
            refreshing={resource.loading || session.loading || suspended}
            suspended={suspended}
            reload={reload}
          />
        </div>
      </>
    );
  }
  return (
    <section className={admin ? "order-detail" : undefined}>
      <Link to={back}>← Order list</Link>
      <Action onClick={reload}>Refresh order</Action>
      <ErrorNotice error={resource.error ?? session.error} />
      {!detail ? (
        <p role="status">
          {resource.error || session.error
            ? "Order unavailable. Refresh to check access again."
            : "Loading order…"}
        </p>
      ) : (
        <>
          <h2>
            {detail.order.game_name} · {stateLabel(detail.order.state)}
          </h2>
          <p className="order-id">Order {detail.order.id}</p>
          {!admin && <OrderProgress detail={detail} />}
          {detail.order.kind !== "account" &&
            detail.contract?.payment_state === "settled" && (
              <FulfillmentPanel detail={detail} admin={admin} reload={reload} />
            )}
          {detail.contract && (
            <Cases
              detail={detail}
              admin={admin}
              owner={session.data?.user?.role === "owner"}
              changed={reload}
            />
          )}
          <OrderSupport
            id={detail.order.id}
            name={detail.order.game_name}
            admin={admin}
          />
          {detail.contract ? (
            <section aria-label="Accepted agreement">
              <h2>Accepted agreement</h2>
              <Agreement data={detail.contract.data} />
            </section>
          ) : detail.quote ? (
            <section aria-label="Current quote">
              <h2>Current quote · revision {detail.quote.data.revision}</h2>
              <Agreement data={detail.quote.data} />
              {session.data &&
                session.data.terms_version !==
                  detail.quote.data.terms_version && (
                  <p role="alert">
                    Terms changed. Request an updated quote before accepting.
                  </p>
                )}
            </section>
          ) : (
            <p>
              {detail.estimate.outcome === "estimated"
                ? `Original estimate: ${detail.estimate.currency} ${minorDisplay(detail.estimate.amount_minor)}. `
                : ""}
              Administrator review is required before this request becomes
              payable.
            </p>
          )}
          {detail.contract && (
            <Checkout detail={detail} admin={admin} changed={reload} />
          )}
          <Decisions
            key={`decisions-${String(detail.order.version)}`}
            detail={detail}
            admin={admin}
            done={reload}
          />
          {detail.order.kind === "account" ? (
            <AccountDelivery
              paid={
                detail.contract?.payment_state === "settled" &&
                ["queued", "in_progress", "completed"].includes(
                  detail.order.state,
                )
              }
              owner={session.data?.user?.role === "owner"}
              id={detail.order.id}
              admin={admin}
              changed={reload}
            />
          ) : (
            <RequestDetails
              key={`request-${String(detail.order.version)}`}
              detail={detail}
              admin={admin}
              done={reload}
            />
          )}
          {admin &&
            detail.order.kind === "custom" &&
            !detail.contract &&
            ["submitted", "quoted"].includes(detail.order.state) && (
              <QuoteEditor
                key={`editor-${String(detail.order.version)}`}
                detail={detail}
                done={reload}
              />
            )}
          {!admin && (
            <PurchaseReview
              orderID={detail.order.id}
              completed={detail.order.state === "completed"}
            />
          )}
          <History base={base} revision={detail.order.version} />
        </>
      )}
    </section>
  );
}

export default function OrderDetail({ admin = false }: { admin?: boolean }) {
  const { id = "" } = useParams();
  return (
    <OrderSession key={(admin ? "admin:" : "customer:") + id} admin={admin} />
  );
}
