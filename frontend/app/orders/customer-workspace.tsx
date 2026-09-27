import type { Location } from "react-router";
import RequestConfirmation from "./request-confirmation";
import { Link, useLocation } from "react-router";
import { useState } from "react";
import { z } from "../validation";
import type { Session } from "../identity/api";
import { Action, ErrorNotice } from "../catalog/controls";
import { minorDisplay } from "../catalog/dynamic-form";
import { detailSchema, quotesSchema, stateLabel, type Detail } from "./model";
import { useResource } from "./resource";
import { Agreement, Decisions, History, RequestDetails } from "./parts";
import { orderKind } from "./presentation";
import { RecordShell } from "../ui/record-shell";
import OrderMessages from "../support/order-messages";
import OrderProgress from "../experience/order-progress";
import FulfillmentPanel from "../fulfillment/panel";
import Checkout from "../payments/checkout";
import Cases from "../payments/cases";
import AccountDelivery from "../resale/delivery";
import PurchaseReview from "../reviews/form";

function QuoteComparison({ detail }: { detail: Detail }) {
  const resource = useResource(
    `/orders/${detail.order.id}/quotes?before=0&revision=${String(detail.order.version)}`,
    quotesSchema,
  );
  const previous = resource.data?.quotes.find(
    (quote) => quote.id !== detail.quote?.id,
  );
  const current = detail.quote?.data;
  if (!current) return null;
  return (
    <details className="quote-comparison">
      <summary>What changed from the previous price?</summary>
      <ErrorNotice error={resource.error} />
      {resource.loading ? (
        <p role="status">Loading quote comparison…</p>
      ) : resource.error ? (
        <Action onClick={resource.reload}>Retry quote comparison</Action>
      ) : (
        <div className="comparison-scroll">
          <table>
            <caption>
              {previous
                ? "Previous quote compared with the current offer"
                : "Original estimate compared with the reviewed quote"}
            </caption>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">
                  {previous ? "Previous quote" : "Original request"}
                </th>
                <th scope="col">Current quote</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Price</th>
                <td>
                  {previous
                    ? `${previous.data.currency} ${minorDisplay(previous.data.amount_minor)}`
                    : detail.estimate.outcome === "estimated"
                      ? `${detail.estimate.currency} ${minorDisplay(detail.estimate.amount_minor)}`
                      : "Manual review required"}
                </td>
                <td>
                  {current.currency} {minorDisplay(current.amount_minor)}
                </td>
              </tr>
              <tr>
                <th scope="row">Scope</th>
                <td>{previous?.data.scope ?? "Your original selections"}</td>
                <td>{current.scope}</td>
              </tr>
              <tr>
                <th scope="row">Estimated delivery</th>
                <td>
                  {previous
                    ? `${String(previous.data.delivery_min_hours)}–${String(previous.data.delivery_max_hours)} hours`
                    : "Set after review"}
                </td>
                <td>
                  {current.delivery_min_hours}–{current.delivery_max_hours}{" "}
                  hours
                </td>
              </tr>
              <tr>
                <th scope="row">Terms version</th>
                <td>
                  {previous?.data.terms_version ?? "See original request"}
                </td>
                <td>{current.terms_version}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}
export default function CustomerWorkspace({
  detail: input,
  session,
  refreshing,
  reload,
  suspended = false,
}: {
  detail: Detail;
  session: Session;
  refreshing: boolean;
  reload: () => void;
  suspended?: boolean;
}) {
  const detail = detailSchema.parse(input);
  const location: Location<unknown> = useLocation();
  const source = z
    .object({ orderListSearch: z.string().max(2048) })
    .safeParse(location.state);
  const back =
    "/orders" +
    (source.success
      ? "?" + new URLSearchParams(source.data.orderListSearch).toString()
      : "");
  const [copied, setCopied] = useState("");
  const state = detail.order.state,
    contract = detail.contract,
    paid = contract?.payment_state === "settled",
    account = detail.order.kind === "account";
  const termsValid =
    !detail.quote || session.terms_version === detail.quote.data.terms_version;
  const sections = [
    { id: "overview", label: "Overview" },
    { id: "messages", label: "Messages" },
    {
      id: account ? "delivery" : "progress",
      label: account ? "Delivery" : "Progress & sessions",
    },
    { id: "payment", label: "Payment" },
    { id: "help", label: "Help" },
  ];
  const destination = (section: string) => ({
    pathname: location.pathname,
    search:
      "?" +
      new URLSearchParams({
        ...Object.fromEntries(new URLSearchParams(location.search)),
        section,
      }).toString(),
  });
  const localLink = (section: string, label: string) => (
    <Link
      className="button"
      preventScrollReset
      state={location.state}
      to={destination(section)}
    >
      {label}
    </Link>
  );
  async function copyReference() {
    try {
      await navigator.clipboard.writeText(detail.order.id);
      setCopied("Reference copied.");
    } catch {
      setCopied("Copy unavailable. Select the reference above.");
    }
  }
  return (
    <div className="customer-order-workspace">
      <RecordShell
        id={detail.order.id}
        title="Order"
        headingLevel={2}
        compactReference
        workspace="My account"
        status={
          <>
            <h3 className="order-game-title">
              {detail.order.game_name} · {stateLabel(state)}
            </h3>
            <span>{orderKind(detail.order.kind)}</span>
            <details className="order-full-reference">
              <summary>Full order reference</summary>
              <code>{detail.order.id}</code>
            </details>
          </>
        }
        back={{ to: back, label: "Order list" }}
        sections={sections}
        keepMounted={["overview", "messages", "progress", "help"]}
      >
        {(section, visible) => (
          <>
            <fieldset className="order-current-data" disabled={refreshing}>
              <legend className="sr-only">
                Order workspace ·{" "}
                {sections.find((item) => item.id === section)?.label}
              </legend>
              {section === "overview" && (
                <>
                  <div className="order-toolbar">
                    <p>
                      Updated{" "}
                      <time dateTime={detail.order.updated_at}>
                        {new Date(detail.order.updated_at).toLocaleString()}
                      </time>
                    </p>
                    <Action disabled={refreshing} onClick={reload}>
                      {refreshing ? "Refreshing order…" : "Refresh order"}
                    </Action>
                    <Action onClick={() => void copyReference()}>
                      Copy order reference
                    </Action>
                    <span role="status">{copied}</span>
                  </div>
                  <RequestConfirmation detail={detail} />
                  <OrderProgress detail={detail} />
                  {detail.quote && !contract && (
                    <section
                      aria-label="Current quote"
                      className="catalog-section order-quote"
                    >
                      <h2>
                        Current quote · revision {detail.quote.data.revision}
                      </h2>
                      <Agreement data={detail.quote.data} />
                      <QuoteComparison detail={detail} />
                      {!termsValid && (
                        <p role="alert">
                          Terms changed. Request an updated quote before
                          accepting.
                        </p>
                      )}
                    </section>
                  )}
                  {!contract && !detail.quote && (
                    <p className="order-estimate">
                      {detail.estimate.outcome === "estimated"
                        ? `Original estimate: ${detail.estimate.currency} ${minorDisplay(detail.estimate.amount_minor)}. `
                        : ""}
                      Administrator review is required before this request
                      becomes payable.
                    </p>
                  )}
                  {contract && (
                    <section
                      className="catalog-section"
                      aria-label="Accepted price"
                    >
                      <h2>Accepted total</h2>
                      <strong>
                        {contract.data.currency}{" "}
                        {minorDisplay(contract.data.amount_minor)}
                      </strong>
                      <p>
                        {paid
                          ? "Payment verified and allocated to your order."
                          : contract.payment_state === "retired"
                            ? "This contract was retired."
                            : "Payment has not been verified. Work cannot start yet."}
                      </p>
                      <div className="order-primary-actions">
                        {" "}
                        {localLink(
                          "payment",
                          state === "awaiting_payment"
                            ? "Continue to payment"
                            : "View payment & receipts",
                        )}
                        {paid &&
                          localLink(
                            account ? "delivery" : "progress",
                            account
                              ? "Review account delivery"
                              : "View progress & sessions",
                          )}
                      </div>{" "}
                      <details data-order-section="Accepted agreement">
                        <summary>Accepted agreement</summary>
                        <section aria-label="Accepted agreement">
                          <h2>Accepted agreement</h2>
                          <Agreement data={contract.data} />
                        </section>
                      </details>
                    </section>
                  )}
                  <Decisions
                    key={`decisions-${String(detail.order.version)}`}
                    detail={detail}
                    admin={false}
                    termsValid={termsValid}
                    done={reload}
                  />
                  {!account && (
                    <details
                      className="order-section"
                      data-order-section="Selections & reorder"
                      open={state === "needs_information"}
                    >
                      <summary>Selections & reorder</summary>
                      <RequestDetails
                        key={`request-${String(detail.order.version)}`}
                        detail={detail}
                        admin={false}
                        done={reload}
                      />
                    </details>
                  )}
                  <details
                    className="order-section"
                    data-order-section="Order activity"
                    open={state === "needs_information" || state === "rejected"}
                  >
                    <summary>Order activity</summary>
                    <History
                      base={`/orders/${detail.order.id}`}
                      revision={detail.order.version}
                    />
                  </details>
                </>
              )}
              {section === "messages" && (
                <OrderMessages
                  detail={detail}
                  visible={visible && !suspended}
                />
              )}
              {section === "progress" && (
                <>
                  <h2>Progress & sessions</h2>
                  <p>
                    Staff-reported updates for this order. Progress is not live
                    game telemetry.
                  </p>
                  {paid ? (
                    <FulfillmentPanel
                      detail={detail}
                      admin={false}
                      reload={reload}
                      visible={visible && !suspended}
                      localCoordination
                    />
                  ) : (
                    <p>
                      Progress and scheduling become available after your
                      payment is verified.{" "}
                      {localLink("payment", "View payment status")}
                    </p>
                  )}
                  {state === "completed" && (
                    <PurchaseReview orderID={detail.order.id} completed />
                  )}
                </>
              )}
              {section === "delivery" && !suspended && (
                <>
                  <h2>Account delivery</h2>
                  <AccountDelivery
                    id={detail.order.id}
                    admin={false}
                    owner={false}
                    paid={
                      paid &&
                      ["queued", "in_progress", "completed"].includes(state)
                    }
                    changed={reload}
                  />
                  {state === "completed" && (
                    <PurchaseReview orderID={detail.order.id} completed />
                  )}
                </>
              )}
              {section === "payment" &&
                !suspended &&
                (contract ? (
                  <Checkout detail={detail} admin={false} changed={reload} />
                ) : (
                  <section className="catalog-section">
                    <h2>No payment due</h2>
                    <p>
                      This request needs an accepted final quote before
                      checkout. Submitting it does not charge you.
                    </p>
                    {localLink("overview", "Review your request")}
                  </section>
                ))}
              {section === "help" && (
                <>
                  <h2>Help with this order</h2>
                  <p>
                    Contact PLAYORA support privately about this order. Use a
                    formal case for a payment or service issue.
                  </p>
                  {localLink("messages", "Chat with support for this order")}
                  {contract && (
                    <Cases
                      detail={detail}
                      admin={false}
                      owner={false}
                      changed={reload}
                    />
                  )}
                  {contract && state !== "completed" && (
                    <PurchaseReview
                      orderID={detail.order.id}
                      completed={false}
                    />
                  )}
                </>
              )}
            </fieldset>
          </>
        )}
      </RecordShell>
    </div>
  );
}
