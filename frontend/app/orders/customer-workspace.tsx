import { useLocation } from "react-router";
import { Link } from "react-router";
import { useRef, useState, type ReactNode } from "react";
import { z } from "../validation";
import type { Session } from "../identity/api";
import { Action, ErrorNotice } from "../catalog/controls";
import { minorDisplay } from "../catalog/dynamic-form";
import { detailSchema, quotesSchema, stateLabel, type Detail } from "./model";
import { useResource } from "./resource";
import { Agreement, Decisions, History, RequestDetails } from "./parts";
import { orderKind } from "./presentation";
import { OrderSupport } from "../support/new";
import OrderProgress from "../experience/order-progress";
import FulfillmentPanel from "../fulfillment/panel";
import Checkout from "../payments/checkout";
import Cases from "../payments/cases";
import AccountDelivery from "../resale/delivery";
import PurchaseReview from "../reviews/form";

function Section({
  title,
  primary = false,
  children,
}: {
  title: string;
  primary?: boolean;
  children: ReactNode;
}) {
  if (primary)
    return (
      <div data-order-section={title} className="order-primary-section">
        {children}
      </div>
    );
  return (
    <details data-order-section={title} className="order-section">
      <summary>{title}</summary>
      {children}
    </details>
  );
}
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
}: {
  detail: Detail;
  session: Session;
  refreshing: boolean;
  reload: () => void;
}) {
  // Validate this shared display at the boundary; estimates are never substituted for contracts.
  const detail = detailSchema.parse(input);
  const location = useLocation();
  const source = z
    .object({ orderListSearch: z.string().max(2048) })
    .safeParse(location.state);
  const back =
    "/orders" +
    (source.success
      ? "?" + new URLSearchParams(source.data.orderListSearch).toString()
      : "");
  const root = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState("");
  const state = detail.order.state,
    contract = detail.contract,
    paid = contract?.payment_state === "settled",
    closed = ["completed", "cancelled", "rejected", "expired"].includes(state);
  const termsValid =
    !detail.quote || session.terms_version === detail.quote.data.terms_version;
  async function copyReference() {
    try {
      await navigator.clipboard.writeText(detail.order.id);
      setCopied("Reference copied.");
    } catch {
      setCopied("Copy unavailable. Select the reference above.");
    }
  }
  function openSection(title: string) {
    const section = [
      ...(root.current?.querySelectorAll<HTMLElement>("[data-order-section]") ??
        []),
    ].find((item) => item.dataset.orderSection === title);
    if (section) {
      if (section instanceof HTMLDetailsElement) section.open = true;
      section.scrollIntoView({ block: "start", behavior: "instant" });
      const heading = section.querySelector<HTMLElement>("summary, h2");
      if (heading) {
        if (heading.tagName !== "SUMMARY") heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }
  }
  return (
    <div ref={root} className="customer-order-workspace">
      <div className="order-toolbar">
        <Link to={back}>← Order list</Link>
        <Action onClick={reload}>
          {refreshing ? "Refreshing order…" : "Refresh order"}
        </Action>
      </div>
      <header className="order-workspace-heading">
        <div>
          <p className="eyebrow">{orderKind(detail.order.kind)}</p>
          <h2>
            {detail.order.game_name} · {stateLabel(state)}
          </h2>
          <p>
            Updated{" "}
            <time dateTime={detail.order.updated_at}>
              {new Date(detail.order.updated_at).toLocaleString()}
            </time>
          </p>
        </div>
        <div className="order-price-summary">
          {contract ? (
            <>
              <span>Accepted total</span>
              <strong>
                {contract.data.currency}{" "}
                {minorDisplay(contract.data.amount_minor)}
              </strong>
              <span>
                {paid
                  ? "Payment verified and allocated to your order."
                  : contract.payment_state === "retired"
                    ? "Contract retired"
                    : "Payment not verified"}
              </span>
            </>
          ) : (
            <>
              <span>
                {detail.quote ? "Offered quote" : "Final price after review"}
              </span>
              {detail.quote && (
                <strong>
                  {detail.quote.data.currency}{" "}
                  {minorDisplay(detail.quote.data.amount_minor)}
                </strong>
              )}
            </>
          )}
        </div>
      </header>
      <details className="order-reference">
        <summary>Order reference</summary>
        <p>{detail.order.id}</p>
        <Action
          onClick={() => {
            void copyReference();
          }}
        >
          Copy order reference
        </Action>
        <span role="status">{copied}</span>
      </details>
      <OrderProgress detail={detail} />
      <div className="order-contact">
        <OrderSupport id={detail.order.id} name={detail.order.game_name} />
        <span>Private support, tied to this order.</span>
      </div>
      <nav className="order-section-nav" aria-label="Order information">
        {detail.order.kind !== "account" && (
          <button
            onClick={() => {
              openSection("Selections & reorder");
            }}
          >
            Selections
          </button>
        )}
        <button
          onClick={() => {
            openSection("Order activity");
          }}
        >
          Activity
        </button>
        {contract && (
          <>
            <button
              onClick={() => {
                openSection("Payment & receipts");
              }}
            >
              Payments
            </button>
            <button
              onClick={() => {
                openSection("Help, cases & refunds");
              }}
            >
              Get help
            </button>
          </>
        )}
      </nav>

      <fieldset className="order-current-data" disabled={refreshing}>
        <legend className="sr-only">Order workspace</legend>
        {detail.quote && !contract && (
          <section aria-label="Current quote" className="order-quote">
            <h2>Current quote · revision {detail.quote.data.revision}</h2>
            <Agreement data={detail.quote.data} />
            <QuoteComparison detail={detail} />
            {!termsValid && (
              <p role="alert">
                Terms changed. Request an updated quote before accepting.
              </p>
            )}
          </section>
        )}
        {!contract && !detail.quote && (
          <p className="order-estimate">
            {detail.estimate.outcome === "estimated"
              ? `Original estimate: ${detail.estimate.currency} ${minorDisplay(detail.estimate.amount_minor)}. `
              : ""}
            Administrator review is required before this request becomes
            payable.
          </p>
        )}
        {(["submitted", "needs_information", "quoted"].includes(state) ||
          (state === "awaiting_payment" &&
            contract?.payment_state === "unissued")) && (
          <Section
            title="Order options"
            primary={state === "quoted" || state === "needs_information"}
          >
            <Decisions
              key={`decisions-${String(detail.order.version)}`}
              detail={detail}
              admin={false}
              termsValid={termsValid}
              done={reload}
            />
          </Section>
        )}
        {contract && (
          <Section title="Accepted agreement">
            <section aria-label="Accepted agreement">
              <h2>Accepted agreement</h2>
              <Agreement data={contract.data} />
            </section>
          </Section>
        )}
        {paid && detail.order.kind !== "account" && (
          <FulfillmentPanel detail={detail} admin={false} reload={reload} />
        )}
        {detail.order.kind === "account" && (
          <Section title="Account handoff" primary={paid}>
            <AccountDelivery
              id={detail.order.id}
              admin={false}
              owner={false}
              paid={
                paid && ["queued", "in_progress", "completed"].includes(state)
              }
              changed={reload}
            />
          </Section>
        )}
        {state === "completed" && (
          <PurchaseReview orderID={detail.order.id} completed />
        )}
        {contract && (
          <Section
            title="Payment & receipts"
            primary={state === "awaiting_payment"}
          >
            <Checkout detail={detail} admin={false} changed={reload} />
          </Section>
        )}
        {detail.order.kind !== "account" && (
          <Section
            title="Selections & reorder"
            primary={state === "needs_information"}
          >
            <RequestDetails
              key={`request-${String(detail.order.version)}`}
              detail={detail}
              admin={false}
              done={reload}
            />
          </Section>
        )}
        {contract && (
          <Section title="Help, cases & refunds">
            <p>
              For a question, use the order conversation. For a formal service
              or payment issue, review the case options below.
            </p>
            <Cases
              detail={detail}
              admin={false}
              owner={false}
              changed={reload}
            />
            {state !== "completed" && (
              <PurchaseReview orderID={detail.order.id} completed={false} />
            )}
          </Section>
        )}
        <Section
          title="Order activity"
          primary={
            (closed && state !== "completed") || state === "needs_information"
          }
        >
          <History
            base={`/orders/${detail.order.id}`}
            revision={detail.order.version}
          />
        </Section>
      </fieldset>
    </div>
  );
}
