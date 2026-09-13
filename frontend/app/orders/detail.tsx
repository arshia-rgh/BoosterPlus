import AccountDelivery from "../resale/delivery";
import Cases from "../payments/cases";
import Checkout from "../payments/checkout";
import OrderProgress from "../experience/order-progress";
import PurchaseReview from "../reviews/form";
import FulfillmentPanel from "../fulfillment/panel";
import { useCallback } from "react";
import { z } from "../validation";
import { Link, useLocation, useParams } from "react-router";
import { Action, ErrorNotice } from "../catalog/controls";
import { minorDisplay } from "../catalog/dynamic-form";
import { sessionSchema } from "../identity/api";
import { detailSchema, stateLabel } from "./model";
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
  const reloadOrder = resource.reload,
    reloadSession = session.reload;
  const reload = useCallback(() => {
    reloadOrder();
    reloadSession();
  }, [reloadOrder, reloadSession]);
  const detail =
    resource.error || session.error || (!admin && !session.data)
      ? null
      : resource.data;
  if (!admin && detail && session.data)
    return (
      <CustomerWorkspace
        detail={detail}
        session={session.data}
        refreshing={resource.loading || session.loading}
        reload={reload}
      />
    );
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
