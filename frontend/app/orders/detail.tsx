import PurchaseReview from "../reviews/form";
import FulfillmentPanel from "../fulfillment/panel";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { Action, Check, ErrorNotice, Issues, Text } from "../catalog/controls";
import DynamicForm, { minorDisplay } from "../catalog/dynamic-form";
import type { Answers } from "../catalog/model";
import { get, post, sessionSchema } from "../identity/api";
import {
  commercialSchema,
  detailSchema,
  eventsSchema,
  quotesSchema,
  reorderSchema,
  stateLabel,
  type Commercial,
  type Detail,
  type Reorder,
} from "./model";
import { useResource } from "./resource";
import { OrderSupport } from "../support/new";
import QuoteEditor from "./quote-editor";

export function Agreement({ data }: { data: Commercial }) {
  // Parsing here also protects shared displays when a future caller adds a source.
  const price = commercialSchema.parse(data);
  return (
    <div className="order-agreement">
      <p className="package-price">
        {price.currency} {minorDisplay(price.amount_minor)}
      </p>
      <p>{price.scope}</p>
      <p>{price.reason}</p>
      <ul>
        {price.lines.map((line) => (
          <li key={line.key}>
            {line.label}: {price.currency} {minorDisplay(line.amount_minor)}
          </li>
        ))}
      </ul>
      <p>
        Delivery estimate: {price.delivery_min_hours}–{price.delivery_max_hours}{" "}
        hours after fulfillment can start.
      </p>
      <p>
        Valid until{" "}
        <time dateTime={price.expires_at}>
          {new Date(price.expires_at).toLocaleString()}
        </time>{" "}
        · Terms {price.terms_version}
      </p>
      {price.discount && (
        <p>
          Coupon {price.discount.code} · policy version {price.discount.version}
          .{" "}
          {price.discount.indicative
            ? "Eligibility is rechecked on acceptance."
            : "Reserved for this contract."}
        </p>
      )}
    </div>
  );
}
function History({ base, revision }: { base: string; revision: number }) {
  const [after, setAfter] = useState(0),
    [before, setBefore] = useState(0);
  const timeline = useResource(
      `${base}/events?after=${String(after)}&revision=${String(revision)}`,
      eventsSchema,
    ),
    quotes = useResource(
      `${base}/quotes?before=${String(before)}&revision=${String(revision)}`,
      quotesSchema,
    );
  return (
    <>
      <section className="catalog-section">
        <h2>Order timeline</h2>
        <ErrorNotice error={timeline.error} />
        <ol>
          {timeline.data?.events.map((event) => (
            <li key={event.id}>
              <strong>{stateLabel(event.action)}</strong> · {event.actor_role} ·{" "}
              <time dateTime={event.created_at}>
                {new Date(event.created_at).toLocaleString()}
              </time>
              {event.message && <p>{event.message}</p>}
            </li>
          ))}
        </ol>
        {after > 0 && (
          <Action
            onClick={() => {
              setAfter(0);
            }}
          >
            Start of timeline
          </Action>
        )}
        {timeline.data?.events.length === 50 && (
          <Action
            onClick={() => {
              setAfter(timeline.data?.events.at(-1)?.version ?? 0);
            }}
          >
            Next timeline events
          </Action>
        )}
      </section>
      <section className="catalog-section">
        <h2>Quote history</h2>
        <ErrorNotice error={quotes.error} />
        {quotes.data?.quotes.length === 0 && <p>No quotes issued.</p>}
        {quotes.data?.quotes.map((quote) => (
          <details key={quote.id}>
            <summary>
              Revision {quote.data.revision} · {quote.state} ·{" "}
              {quote.data.currency} {minorDisplay(quote.data.amount_minor)}
            </summary>
            <Agreement data={quote.data} />
          </details>
        ))}
        {before > 0 && (
          <Action
            onClick={() => {
              setBefore(0);
            }}
          >
            Latest quotes
          </Action>
        )}
        {quotes.data?.quotes.length === 20 && (
          <Action
            onClick={() => {
              setBefore(quotes.data?.quotes.at(-1)?.data.revision ?? 0);
            }}
          >
            Older quotes
          </Action>
        )}
      </section>
    </>
  );
}
function Decisions({
  detail,
  admin,
  done,
}: {
  detail: Detail;
  admin: boolean;
  done: () => void;
}) {
  const [accepted, setAccepted] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const base = (admin ? "/admin/orders/" : "/orders/") + detail.order.id;
  const state = detail.order.state,
    unaccepted = ["submitted", "needs_information", "quoted"].includes(state),
    cancellable =
      unaccepted ||
      (state === "awaiting_payment" &&
        detail.contract?.payment_state === "unissued");
  async function act(action: string) {
    setBusy(true);
    setError(null);
    try {
      await post(
        base + "/" + action,
        {
          version: detail.order.version,
          quote_id: detail.quote?.id ?? "",
          accept_terms: accepted,
          terms_version: detail.quote?.data.terms_version ?? "",
          message,
        },
        detailSchema,
      );
      done();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="catalog-section" aria-label="Order actions">
      <h2>Next steps</h2>
      <fieldset disabled={busy}>
        <legend>{admin ? "Manage request" : "Your decision"}</legend>
        {!admin && state === "quoted" && detail.quote && (
          <>
            <p>
              <Link to="/terms" target="_blank" rel="noopener noreferrer">
                Read terms
              </Link>
              . Review the amount, scope, delivery estimate, and expiry above.
              Accepting creates an unpaid contract.
            </p>
            <Check
              label="I accept this quote and its terms"
              value={accepted}
              change={setAccepted}
            />
            <Action disabled={!accepted} onClick={() => void act("accept")}>
              Accept quote
            </Action>
            <Action onClick={() => void act("decline")}>Decline quote</Action>
          </>
        )}
        {admin && (unaccepted || cancellable) && (
          <Text
            label="Customer-visible explanation"
            value={message}
            change={setMessage}
            multiline
          />
        )}
        {admin && unaccepted && (
          <>
            <Action
              disabled={!message.trim()}
              onClick={() => void act("clarify")}
            >
              Request clarification
            </Action>
            <Action
              disabled={!message.trim()}
              onClick={() => void act("reject")}
            >
              Reject request
            </Action>
          </>
        )}
        {cancellable && (
          <Action
            disabled={admin && !message.trim()}
            onClick={() => void act("cancel")}
          >
            Cancel unpaid order
          </Action>
        )}
        {state === "needs_information" && !admin && (
          <p>
            Read the requested clarification in your timeline, then revise your
            selections below.
          </p>
        )}
        {detail.contract && (
          <p>
            {detail.contract.payment_state === "settled"
              ? "Payment is verified. Follow the fulfillment updates above."
              : detail.contract.payment_state === "retired"
                ? "This unpaid contract was retired."
                : "Crypto checkout is being prepared. No payment has been verified for this order."}
          </p>
        )}
      </fieldset>
      <ErrorNotice error={error} />
    </section>
  );
}
function ReorderForm({ draft }: { draft: Reorder }) {
  const service = draft.offer.configuration.services.find(
      (v) => v.key === draft.service,
    ),
    variant = draft.offer.configuration.packages
      .find((v) => v.key === draft.package)
      ?.variants.find((v) => v.key === draft.variant);
  if (!service || (draft.kind === "package" && !variant))
    return <p>This offering is unavailable.</p>;
  return (
    <section className="catalog-section">
      <h2>New order from current catalog</h2>
      <p>
        Review all choices and the current price. Previous text, credentials,
        coupons, and payment details are excluded.
      </p>
      <Issues issues={draft.issues} />
      <DynamicForm
        key={draft.offer.id}
        config={draft.offer.configuration}
        service={service}
        releaseID={draft.offer.id}
        slug={draft.offer.slug}
        stage="order"
        pack={draft.package}
        variant={variant}
        initialAnswers={draft.answers}
      />
    </section>
  );
}
function RequestDetails({
  detail,
  admin,
  done,
}: {
  detail: Detail;
  admin: boolean;
  done: () => void;
}) {
  const [editing, setEditing] = useState(false),
    [reorder, setReorder] = useState<Reorder | null>(null),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const service = detail.offer.configuration.services.find(
    (v) => v.key === detail.order.service,
  );
  async function revise(answers: Answers, coupon: string) {
    await post(
      `/orders/${detail.order.id}/revise`,
      { version: detail.order.version, answers, coupon_code: coupon },
      detailSchema,
    );
    done();
    setEditing(false);
  }
  async function prepare() {
    setBusy(true);
    setError(null);
    try {
      setReorder(
        await get(`/orders/${detail.order.id}/reorder`, reorderSchema),
      );
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="catalog-section">
        <h2>Requested selections</h2>
        <p>
          Catalog release {detail.offer.version} ·{" "}
          {detail.order.kind === "package"
            ? detail.order.package
            : detail.order.service}
        </p>
        <dl>
          {Object.entries(detail.answers).map(([key, value]) => (
            <div key={key}>
              <dt>
                {service?.fields.find((field) => field.key === key)?.label ??
                  key}
              </dt>
              <dd>{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
            </div>
          ))}
        </dl>
        {detail.coupon_code && <p>Requested coupon: {detail.coupon_code}</p>}
        {!admin && (
          <>
            <Action disabled={busy} onClick={() => void prepare()}>
              Reorder with current catalog
            </Action>
            {detail.order.kind === "custom" &&
              !detail.contract &&
              ["submitted", "needs_information", "quoted"].includes(
                detail.order.state,
              ) && (
                <Action
                  onClick={() => {
                    setEditing((v) => !v);
                  }}
                >
                  {editing ? "Close revision form" : "Revise request"}
                </Action>
              )}
          </>
        )}
        <ErrorNotice error={error} />
        {editing && service && (
          <>
            <p>
              Saving revised choices withdraws the existing quote and returns
              this request for review.
            </p>
            <DynamicForm
              key={detail.order.version}
              config={detail.offer.configuration}
              service={service}
              releaseID={detail.offer.id}
              slug={detail.offer.slug}
              stage="order"
              initialAnswers={detail.answers}
              initialCoupon={detail.coupon_code}
              validationPath={`/orders/${detail.order.id}/validate`}
              onCommit={revise}
            />
          </>
        )}
      </section>
      {reorder && <ReorderForm draft={reorder} />}
    </>
  );
}
export default function OrderDetail({ admin = false }: { admin?: boolean }) {
  const { id = "" } = useParams(),
    base = (admin ? "/admin/orders/" : "/orders/") + encodeURIComponent(id),
    resource = useResource(base, detailSchema),
    session = useResource("/auth/session", sessionSchema);
  const detail = resource.data;
  return (
    <section>
      <Link to={admin ? "/admin/orders" : "/orders"}>← Order list</Link>
      <Action onClick={resource.reload}>Refresh order</Action>
      <ErrorNotice error={resource.error ?? session.error} />
      {!detail ? (
        <p role="status">Loading order…</p>
      ) : (
        <>
          <h2>
            {detail.order.game_name} · {stateLabel(detail.order.state)}
          </h2>
          <p className="order-id">Order {detail.order.id}</p>
          {detail.contract?.payment_state === "settled" && (
            <FulfillmentPanel
              detail={detail}
              admin={admin}
              reload={resource.reload}
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
          <Decisions
            key={`decisions-${String(detail.order.version)}`}
            detail={detail}
            admin={admin}
            done={resource.reload}
          />
          <RequestDetails
            key={`request-${String(detail.order.version)}`}
            detail={detail}
            admin={admin}
            done={resource.reload}
          />
          {admin &&
            detail.order.kind === "custom" &&
            !detail.contract &&
            ["submitted", "quoted"].includes(detail.order.state) && (
              <QuoteEditor
                key={`editor-${String(detail.order.version)}`}
                detail={detail}
                done={resource.reload}
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
