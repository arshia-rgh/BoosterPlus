import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link } from "../portal-router";
import { Action, ErrorNotice } from "../catalog/controls";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import { Feedback } from "../ui/feedback";
import { StatusBadge } from "../ui/primitives";
import {
  priceReviewSchema,
  priceSyncSchema,
  type PriceReview,
  type PriceSync,
} from "./model";
import {
  alertBody,
  belowCost,
  bySeverity,
  clockTime,
  costLabel,
  intervalLabel,
  priceBadge,
  shortDate,
  shortTime,
  showAmounts,
  supplierLink,
  usdCents,
  usdDecimal,
} from "./price-format";

const recentWindow = 7 * 24 * 60 * 60 * 1000;
const refreshHint =
  "To change a fixed price or refresh a product: open it in the supplier catalog, save any change, choose Refresh draft from supplier settings, then publish the new draft.";

function Hidden({ children }: { children: ReactNode }) {
  return <span className="ui-visually-hidden">{children}</span>;
}
function When({ iso, date = false }: { iso: string; date?: boolean }) {
  return <time dateTime={iso}>{date ? shortDate(iso) : shortTime(iso)}</time>;
}
function Arrow() {
  return (
    <>
      <span aria-hidden="true"> → </span>
      <Hidden> to </Hidden>
    </>
  );
}

// Acknowledgement keeps the current selling price; it never changes a release.
async function acknowledge(review: PriceReview) {
  return post(
    `/admin/shop/price-sync/${encodeURIComponent(review.product_id)}/acknowledge`,
    { version: review.version },
    priceReviewSchema,
  );
}
function conflict(error: unknown) {
  return (
    error instanceof APIError &&
    (error.status === 409 || error.code === "shop_conflict")
  );
}

function Amounts({ review }: { review: PriceReview }) {
  if (!showAmounts(review)) return null;
  return (
    <>
      <dl className="price-amounts">
        <div>
          <dt>{costLabel(review.quantity)}</dt>
          <dd>
            {usdDecimal(review.baseline_total)}
            <Arrow />
            {usdDecimal(review.supplier_total)}
          </dd>
        </div>
        <div>
          <dt>Your price</dt>
          <dd>{usdCents(review.selling_minor)}</dd>
        </div>
      </dl>
      {belowCost(review.selling_minor, review.supplier_total) && (
        <p className="price-below-cost">
          Your price is below the new supplier cost.
        </p>
      )}
    </>
  );
}

function Actions({
  review,
  busy,
  locked = false,
  act,
  search,
  product = true,
}: {
  review: PriceReview;
  busy: boolean;
  locked?: boolean;
  act: (kind: "keep" | "dismiss") => void;
  search: string;
  product?: boolean;
}) {
  const title = review.title || "untitled product";
  const suffix = <Hidden> for {title}</Hidden>;
  const supplier = (label: string, primary: boolean) => (
    <Link
      key="supplier"
      className="ui-button"
      data-variant={primary ? undefined : "secondary"}
      to={supplierLink(review)}
    >
      {label}
      {suffix}
    </Link>
  );
  const button = (kind: "keep" | "dismiss", primary: boolean) => (
    <button
      key={kind}
      type="button"
      className="ui-button"
      data-variant={primary ? undefined : "secondary"}
      disabled={busy || locked}
      onClick={() => {
        act(kind);
      }}
    >
      {kind === "keep"
        ? busy
          ? "Keeping…"
          : "Keep my price"
        : busy
          ? "Dismissing…"
          : "Dismiss"}
      {suffix}
    </button>
  );
  let items: ReactNode[];
  switch (review.status) {
    case "override_changed":
      items = belowCost(review.selling_minor, review.supplier_total)
        ? [supplier("Change fixed price", true), button("keep", false)]
        : [button("keep", true), supplier("Change fixed price", false)];
      break;
    case "requirements_changed":
    case "needs_refresh":
      items = [supplier("Refresh in supplier catalog", true)];
      break;
    case "unavailable":
      items = [
        supplier("Open in supplier catalog", true),
        button("dismiss", false),
      ];
      break;
    default:
      items = [button("dismiss", true)];
  }
  return (
    <div className="price-actions">
      {items}
      {product && (
        <Link
          className="ui-button"
          data-variant="secondary"
          to={`/admin/shop/${review.product_id}`}
          state={{ shopSearch: search }}
        >
          Open product
          {suffix}
        </Link>
      )}
    </div>
  );
}

function statusLine(data: PriceSync, alerts: number): ReactNode {
  const next = data.next_check_at ? (
    <>
      {" "}
      Next: <When iso={data.next_check_at} />.
    </>
  ) : null;
  const none = alerts === 0 ? "No alerts. " : "";
  if (!data.configured)
    return <p className="quiet">{none}Automatic price checks are off.</p>;
  const run = data.last_run;
  if (!run)
    return (
      <p className="quiet">
        {none}No price check has run yet.{next}
      </p>
    );
  if (run.state === "running")
    return (
      <p className="quiet">
        {none}Checking supplier prices now (started{" "}
        <time dateTime={run.started_at}>{clockTime(run.started_at)}</time>).
      </p>
    );
  if (run.state === "failed")
    return (
      <p className="quiet">
        {none}
        <span className="price-run-failed">
          The last check (<When iso={run.started_at} />){" "}
          {run.issue === "supplier_unavailable"
            ? "couldn't reach the supplier"
            : "didn't finish"}
          . Prices were not changed.
        </span>
        {next}
      </p>
    );
  return (
    <p className="quiet">
      {none}Checks every {intervalLabel(data.interval_minutes)}. Last check:{" "}
      <When iso={run.finished_at ?? run.started_at} /> (
      {run.checked === 1 ? "1 product" : `${String(run.checked)} products`}).
      {next}
    </p>
  );
}

/** Supplier price alerts lead the admin Shop products page (decisions D1–D17). */
export function PriceChecks({
  search,
  onChanged,
}: {
  search: string;
  onChanged?: () => void;
}) {
  const resource = useResource("/admin/shop/price-sync", priceSyncSchema);
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null),
    titles = useRef(new Map<string, HTMLHeadingElement>()),
    errors = useRef(new Map<string, HTMLElement>()),
    reloadButton = useRef<HTMLButtonElement>(null);
  const [focusRequest, setFocusRequest] = useState<{
    target: string;
    n: number;
  } | null>(null);
  const focusOn = (target: string) => {
    setFocusRequest((current) => ({ target, n: (current?.n ?? 0) + 1 }));
  };
  const [removed, setRemoved] = useState<string[]>([]),
    [busy, setBusy] = useState(""),
    [failure, setFailure] = useState<{
      id: string;
      error: unknown;
      conflict: boolean;
    } | null>(null),
    [message, setMessage] = useState(""),
    [reloading, setReloading] = useState(false);
  const data = resource.data;
  const shown = data
    ? bySeverity(
        data.attention.filter(
          (item) =>
            item.attention === "open" && !removed.includes(item.product_id),
        ),
      )
    : [];
  const hiddenLocally = data
    ? data.attention.filter((item) => removed.includes(item.product_id)).length
    : 0;
  const count = Math.max(0, (data?.attention_count ?? 0) - hiddenLocally);
  useEffect(() => {
    const target = focusRequest?.target;
    if (!target) return;
    if (target === "heading") heading.current?.focus();
    else if (target === "reload") reloadButton.current?.focus();
    else if (target.startsWith("error:"))
      errors.current.get(target.slice(6))?.focus();
    else titles.current.get(target)?.focus();
  }, [focusRequest]);
  if (reloading && !resource.loading) {
    setReloading(false);
    setFailure(null);
    setRemoved([]);
    setMessage("Alerts reloaded.");
    focusOn("heading");
  }
  async function act(review: PriceReview, kind: "keep" | "dismiss") {
    if (busy) return;
    setBusy(review.product_id);
    setFailure(null);
    try {
      await acknowledge(review);
      const index = shown.indexOf(review);
      const next = shown[index + 1] ?? shown[index - 1];
      setRemoved((values) => [...values, review.product_id]);
      const title = review.title || "untitled product";
      setMessage(
        kind === "keep"
          ? `Kept your price for ${title}.`
          : `Alert dismissed for ${title}.`,
      );
      focusOn(next ? next.product_id : "heading");
      resource.reload();
      onChanged?.();
    } catch (error) {
      const stale = conflict(error);
      setFailure({ id: review.product_id, error, conflict: stale });
      focusOn(stale ? "reload" : "error:" + review.product_id);
    } finally {
      setBusy("");
    }
  }
  const prominent = count > 0;
  const recent = data?.repriced ?? [];
  const hint = shown.some((item) =>
    ["override_changed", "requirements_changed", "needs_refresh"].includes(
      item.status,
    ),
  );
  return (
    <section
      className="price-checks"
      data-prominent={prominent ? "true" : undefined}
      aria-labelledby={headingId}
    >
      <h2 id={headingId} ref={heading} tabIndex={-1}>
        {prominent
          ? count === 1
            ? "1 price alert"
            : `${String(count)} price alerts`
          : "Supplier price checks"}
      </h2>
      {data && statusLine(data, count)}
      {!data && resource.loading && (
        <p role="status" className="quiet">
          Loading price alerts…
        </p>
      )}
      {!data && !!resource.error && (
        <>
          <ErrorNotice
            error={resource.error}
            message="Price alerts couldn't be loaded."
          />
          <Action variant="secondary" onClick={resource.reload}>
            Retry price alerts
          </Action>
        </>
      )}
      <p role="status" className="ui-feedback price-feedback">
        {message}
      </p>
      {shown.length > 0 && (
        <ul className="price-alerts">
          {shown.map((review) => {
            const badge = priceBadge(review.status);
            const title = review.title || "Untitled product";
            const own = failure?.id === review.product_id ? failure : null;
            return (
              <li key={review.product_id}>
                {badge && (
                  <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                )}
                <h3
                  tabIndex={-1}
                  ref={(node) => {
                    if (node) titles.current.set(review.product_id, node);
                    else titles.current.delete(review.product_id);
                  }}
                >
                  {title}
                </h3>
                <p className="quiet">
                  {review.game} · {review.state} · since{" "}
                  <When iso={review.detected_at ?? review.checked_at} />
                </p>
                <p>{alertBody(review)}</p>
                <Amounts review={review} />
                {own && (
                  <div
                    className="price-error"
                    tabIndex={-1}
                    ref={(node) => {
                      if (node) errors.current.set(review.product_id, node);
                      else errors.current.delete(review.product_id);
                    }}
                  >
                    <ErrorNotice
                      error={own.error}
                      message={
                        own.conflict
                          ? "This alert changed since you loaded it."
                          : undefined
                      }
                    />
                    {own.conflict && (
                      <button
                        type="button"
                        className="ui-button"
                        ref={reloadButton}
                        onClick={() => {
                          setReloading(true);
                          resource.reload();
                        }}
                      >
                        Reload alerts
                      </button>
                    )}
                  </div>
                )}
                <Actions
                  review={review}
                  busy={busy === review.product_id}
                  locked={!!own?.conflict}
                  search={search}
                  act={(kind) => void act(review, kind)}
                />
              </li>
            );
          })}
        </ul>
      )}
      {count > shown.length && shown.length > 0 && (
        <p className="quiet">
          Showing the {String(shown.length)} oldest of {String(count)} alerts.
        </p>
      )}
      {hint && <p className="quiet price-hint">{refreshHint}</p>}
      {recent.length > 0 && (
        <details className="price-recent">
          <summary>
            Automatic price updates in the last 7 days ({String(recent.length)})
          </summary>
          <ul>
            {recent.map((review) => (
              <li key={review.product_id}>
                <Link
                  to={`/admin/shop/${review.product_id}`}
                  state={{ shopSearch: search }}
                >
                  {review.title || "Untitled product"}
                </Link>
                <p className="quiet">
                  {review.game}
                  {review.repriced_at && (
                    <>
                      {" · "}
                      <When iso={review.repriced_at} />
                    </>
                  )}
                </p>
                <p>
                  Customer price {usdCents(review.repriced_from_minor)}
                  <Arrow />
                  {usdCents(review.repriced_to_minor)}
                </p>
                <p className="quiet">
                  {costLabel(review.quantity)}{" "}
                  {usdDecimal(review.repriced_from_total)}
                  <Arrow />
                  {usdDecimal(review.repriced_to_total)}
                </p>
              </li>
            ))}
          </ul>
          {recent.length >= 20 && <p className="quiet">Latest 20 shown.</p>}
        </details>
      )}
    </section>
  );
}

/** Product row badges (D18). Acknowledged alerts carry no badge. */
export function PriceBadges({
  status,
  attention,
  repricedAt,
}: {
  status?: PriceReview["status"] | undefined;
  attention?: PriceReview["attention"] | undefined;
  repricedAt?: string | undefined;
}) {
  const badge = attention === "open" && status ? priceBadge(status) : null;
  if (!badge && !repricedAt) return null;
  return (
    <p className="price-badges">
      {badge && <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}
      {repricedAt && (
        <StatusBadge tone="info">
          <span>
            Price updated <When iso={repricedAt} date />
          </span>
        </StatusBadge>
      )}
    </p>
  );
}

/** In-editor notice (D19) shown above the toolbar in every section. */
export function EditorPriceNotice({
  review,
  onChanged,
}: {
  review: PriceReview | undefined;
  onChanged: () => void;
}) {
  const headingId = useId();
  const [now] = useState(() => Date.now());
  const [done, setDone] = useState(""),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState<unknown>(null);
  const feedback = useRef<HTMLParagraphElement>(null),
    error = useRef<HTMLDivElement>(null),
    pending = useRef<"feedback" | "error" | null>(null);
  useEffect(() => {
    const target = pending.current;
    pending.current = null;
    if (target === "feedback") feedback.current?.focus();
    if (target === "error") error.current?.focus();
  });
  if (done)
    return (
      <Feedback feedbackRef={feedback}>
        {done === "keep" ? "Your price was kept." : "Alert dismissed."}
      </Feedback>
    );
  if (!review) return null;
  if (review.attention !== "open") {
    if (
      !review.repriced_at ||
      now - new Date(review.repriced_at).getTime() > recentWindow
    )
      return null;
    return (
      <p className="quiet price-editor-recent">
        Price updated automatically on <When iso={review.repriced_at} /> (
        {usdCents(review.repriced_from_minor)}
        <Arrow />
        {usdCents(review.repriced_to_minor)}).
      </p>
    );
  }
  const badge = priceBadge(review.status);
  async function act(kind: "keep" | "dismiss") {
    if (busy || !review) return;
    setBusy(true);
    setFailure(null);
    try {
      await acknowledge(review);
      setDone(kind);
      pending.current = "feedback";
      onChanged();
    } catch (cause) {
      setFailure(cause);
      pending.current = "error";
    } finally {
      setBusy(false);
    }
  }
  const hint = [
    "override_changed",
    "requirements_changed",
    "needs_refresh",
  ].includes(review.status);
  return (
    <section
      className="price-checks price-editor"
      data-prominent="true"
      aria-labelledby={headingId}
    >
      <h3 id={headingId}>{badge?.label ?? "Supplier price"}</h3>
      <p>
        {alertBody(review)}
        {hint && <> {refreshHint}</>}
      </p>
      <Amounts review={review} />
      {!!failure && (
        <div className="price-error" tabIndex={-1} ref={error}>
          <ErrorNotice
            error={failure}
            message={
              conflict(failure)
                ? "This alert changed since you loaded it. Refresh the product."
                : undefined
            }
          />
        </div>
      )}
      <Actions
        review={review}
        busy={busy}
        search=""
        product={false}
        act={(kind) => void act(kind)}
      />
    </section>
  );
}
