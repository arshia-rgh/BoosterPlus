import { DownloadImage } from "../media/attachment";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Action, Check, ErrorNotice, Issues, Text } from "../catalog/controls";
import DynamicForm, { minorDisplay } from "../catalog/dynamic-form";
import {
  optionsFor,
  type Answers,
  type Field,
  type Configuration,
} from "../catalog/model";
import { get, post } from "../identity/api";
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
function selectionLabel(
  field: Field | undefined,
  value: unknown,
  config: Configuration,
): string {
  if (Array.isArray(value))
    return value.map((item) => selectionLabel(field, item, config)).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return (
    (field
      ? optionsFor(field, config).find((option) => option.key === String(value))
          ?.label
      : undefined) ?? String(value)
  );
}
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
        Quote acceptance deadline{" "}
        <time dateTime={price.expires_at}>
          {new Date(price.expires_at).toLocaleString()}
        </time>{" "}
        ·{" "}
        <Link to={"/terms?version=" + encodeURIComponent(price.terms_version)}>
          Terms {price.terms_version}
        </Link>
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
export function History({
  base,
  revision,
}: {
  base: string;
  revision: number;
}) {
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
        {timeline.loading && <p role="status">Loading order activity…</p>}
        {!!timeline.error && (
          <Action onClick={timeline.reload}>Retry order activity</Action>
        )}
        {timeline.data?.events.length === 0 && <p>No activity on this page.</p>}
        <ol className="order-history">
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
        {quotes.loading && <p role="status">Loading quote history…</p>}
        {!!quotes.error && (
          <Action onClick={quotes.reload}>Retry quote history</Action>
        )}
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
export function Decisions({
  detail,
  admin,
  done,
  termsValid = true,
}: {
  detail: Detail;
  admin: boolean;
  done: () => void;
  termsValid?: boolean;
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
  const lock = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => {
      clearInterval(timer);
    };
  }, []);
  const expired =
    !!detail.quote && Date.parse(detail.quote.data.expires_at) <= now;
  async function act(action: string) {
    if (
      lock.current ||
      (action === "accept" && (!accepted || !termsValid || expired))
    )
      return;
    lock.current = true;
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
      lock.current = false;
      setBusy(false);
    }
  }
  if (!admin && !cancellable && state !== "needs_information") return null;
  return (
    <section className="catalog-section" aria-label="Order actions">
      <h2>Next steps</h2>
      <fieldset disabled={busy}>
        <legend>{admin ? "Manage request" : "Your decision"}</legend>
        {!admin && state === "quoted" && detail.quote && (
          <>
            <p>
              <Link
                to={
                  "/terms?version=" +
                  encodeURIComponent(detail.quote.data.terms_version)
                }
                target="_blank"
                rel="noopener noreferrer"
              >
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
            <Action
              disabled={!accepted || !termsValid || expired}
              onClick={() => void act("accept")}
            >
              Accept quote
            </Action>
            {expired && (
              <p role="status">
                This quote has expired. Ask support for an updated quote.
              </p>
            )}
            <details>
              <summary>Decline this quote</summary>
              <p>
                This returns the request for review without accepting a
                contract.
              </p>
              <Action onClick={() => void act("decline")}>Decline quote</Action>
            </details>
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
          <details>
            <summary>Cancel this unpaid order</summary>
            <p>
              This closes the unpaid order. A new order uses the current catalog
              and prices.
            </p>
            <Action
              disabled={admin && !message.trim()}
              onClick={() => void act("cancel")}
            >
              Cancel unpaid order
            </Action>
          </details>
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
                : "No payment has been verified for this order. See payment details below."}
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
export function RequestDetails({
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
              <dd>
                {service?.fields.find((field) => field.key === key)?.type ===
                  "attachment" && Array.isArray(value)
                  ? value.map((id) => (
                      <DownloadImage key={id} id={id} admin={admin} />
                    ))
                  : selectionLabel(
                      service?.fields.find((field) => field.key === key),
                      value,
                      detail.offer.configuration,
                    )}
              </dd>
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
              intakeScope={detail.order.id}
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
