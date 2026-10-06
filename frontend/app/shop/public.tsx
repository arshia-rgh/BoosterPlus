import ShopArtwork from "./artwork";
import { useEffect, useState, useRef } from "react";
import {
  Link,
  useLoaderData,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
  useBlocker,
  type Location,
} from "react-router";
import type { Release } from "../catalog/model";
import { serviceAvailable } from "../catalog/public-discovery";
import { Action, Check, ErrorNotice, Text } from "../catalog/controls";
import { minorDisplay } from "../catalog/dynamic-form";
import { APIError, post, sessionSchema } from "../identity/api";
import { useResource } from "../orders/resource";
import {
  deliverySchema,
  publicPageSchema,
  publicProductSchema,
  type PublicProduct,
} from "./model";
import { sessionEventMatches } from "../identity/portal";
import { z } from "../validation";
import "./shop.css";

export function GameShop({ detail = false }: { detail?: boolean }) {
  const release = useLoaderData<Release>();
  return (
    <section className="game-panel">
      {serviceAvailable(release, "shop") ? (
        detail ? (
          <ShopProduct slug={release.slug} />
        ) : (
          <ShopBrowse slug={release.slug} />
        )
      ) : (
        <>
          <h2>Shop is currently unavailable</h2>
          <p>Existing purchases remain available in My account.</p>
        </>
      )}
    </section>
  );
}
function ShopBrowse({ slug }: { slug: string }) {
  const [params, setParams] = useSearchParams();
  const resource = useResource(
    `/games/${slug}/shop?${params.toString()}`,
    publicPageSchema,
  );
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [region, setRegion] = useState(params.get("region") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const filters = params.toString();
  const [lastFilters, setLastFilters] = useState(filters);
  if (filters !== lastFilters) {
    setLastFilters(filters);
    const current = new URLSearchParams(filters);
    setQuery(current.get("q") ?? "");
    setRegion(current.get("region") ?? "");
    setCategory(current.get("category") ?? "");
  }
  return (
    <>
      <p className="eyebrow">Game shop</p>
      <h2>Choose your next upgrade.</h2>
      <p>
        Review compatibility, delivery requirements and the exact price before
        ordering.
      </p>
      <form
        className="shop-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setParams({ q: query, region, category });
        }}
      >
        <Text label="Search shop" value={query} change={setQuery} />
        <Text label="Region" value={region} change={setRegion} />
        <Text label="Product type" value={category} change={setCategory} />
        <button type="submit" className="button">
          Apply filters
        </button>
        <Link to={`/games/${slug}/shop`}>Clear filters</Link>
      </form>
      <ErrorNotice error={resource.error} />
      {resource.error && <Action onClick={resource.reload}>Retry shop</Action>}
      {resource.loading ? (
        <p role="status">Loading available products…</p>
      ) : (
        resource.data && (
          <>
            {!resource.data.items.length ? (
              <div className="empty-state">
                <h3>
                  {query || region || category
                    ? "No matching products"
                    : "No products available yet"}
                </h3>
                <p>
                  {query || region || category
                    ? "Try a different filter or clear your search."
                    : "Check back when staff publish products for this game."}
                </p>
              </div>
            ) : (
              <div className="shop-grid">
                {resource.data.items.map((p) => (
                  <article key={p.id} className="shop-card">
                    <ShopArtwork
                      placement="card"
                      source={p.definition.asset}
                      alt={p.definition.asset_alt}
                      lazy
                    />
                    <div>
                      <p className="eyebrow">{p.definition.category}</p>
                      <h3>{p.definition.title}</h3>
                      <p>{p.definition.description}</p>
                      <ProductPrice product={p} />
                      <p>
                        {[
                          ...new Set(
                            p.definition.variants
                              .filter((v) => v.enabled)
                              .map((v) => v.region),
                          ),
                        ].join(" · ")}
                      </p>
                      <p>
                        {Object.values(p.available).some((v) => v > 0)
                          ? "Available variants"
                          : "Currently sold out"}
                      </p>
                      <Link
                        className="button"
                        to={`/games/${slug}/shop/${p.id}`}
                        state={{ shopSearch: params.toString() }}
                      >
                        View {p.definition.title}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {resource.data.next && (
              <Link
                className="button"
                to={{
                  search:
                    "?" +
                    new URLSearchParams({
                      ...Object.fromEntries(params),
                      after: resource.data.next,
                    }).toString(),
                }}
              >
                Next products
              </Link>
            )}
          </>
        )
      )}
    </>
  );
}
function ShopProduct({ slug }: { slug: string }) {
  const { id = "" } = useParams();
  const location: Location<unknown> = useLocation();
  const source = z
    .object({ shopSearch: z.string().max(2048) })
    .safeParse(location.state);
  const resource = useResource(
    `/games/${slug}/shop/${id}`,
    publicProductSchema,
  );
  const [saved, setSaved] = useState<PublicProduct | null>(null);
  if (resource.data && resource.data !== saved) setSaved(resource.data);
  const product = saved?.id === id ? saved : null;
  return (
    <>
      <Link
        to={`/games/${slug}/shop${source.success ? "?" + new URLSearchParams(source.data.shopSearch).toString() : ""}`}
      >
        Back to shop
      </Link>
      <ErrorNotice error={resource.error} />
      {resource.error && (
        <Action onClick={resource.reload}>Retry product</Action>
      )}
      {resource.loading && <p role="status">Loading current product…</p>}
      {product && (
        <ProductFlow
          key={product.id}
          product={product}
          reload={resource.reload}
          unavailable={resource.loading || !!resource.error}
        />
      )}
    </>
  );
}
function ProductPrice({ product }: { product: PublicProduct }) {
  const prices = new Map<string, bigint>();
  for (const v of product.definition.variants.filter((v) => v.enabled)) {
    const amount = BigInt(v.unit_amount_minor) * BigInt(v.min_quantity);
    const prior = prices.get(v.currency);
    if (prior === undefined || amount < prior) prices.set(v.currency, amount);
  }
  return (
    <p>
      {[...prices]
        .map(
          ([currency, amount]) =>
            `From ${currency} ${minorDisplay(amount.toString())}`,
        )
        .join(" · ")}
    </p>
  );
}
function ProductFlow({
  product,
  reload,
  unavailable,
}: {
  unavailable: boolean;
  product: PublicProduct;
  reload: () => void;
}) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const session = useResource("/auth/session", sessionSchema);
  const variants = product.definition.variants.filter((v) => v.enabled);
  const [variantKey, setVariantKey] = useState(
    params.get("variant") ?? variants[0]?.key ?? "",
  );
  const variant = variants.find((v) => v.key === variantKey);
  const [quantity, setQuantity] = useState(
    Number(params.get("quantity") ?? variant?.min_quantity ?? 1),
  );
  const [step, setStep] = useState<"options" | "recipient" | "review">(
    "options",
  );
  const [recipient, setRecipient] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const stepHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    stepHeading.current?.focus({ preventScroll: true });
  }, [step]);
  const lock = useRef(false);
  const committed = useRef("");
  const leave = useRef<HTMLElement>(null);
  const [identity, setIdentity] = useState<string | null>(null);
  const epoch = useRef(0);
  type Reservation = {
    request_key: string;
    release_id: string;
    variant: string;
    quantity: number;
    expected_amount: string;
    currency: string;
    recipient: Record<string, string>;
    accept_terms: boolean;
    terms_version: string;
  };
  const [pending, setPending] = useState<Reservation | null>(null);
  const [release, setRelease] = useState(product.release_id);
  const [changedTerms, setChangedTerms] = useState(false);
  if (release !== product.release_id) {
    setRelease(product.release_id);
    setAccepted(false);
    setStep("options");
    setChangedTerms(true);
    setRecipient(
      Object.fromEntries(
        Object.entries(recipient).filter(([key]) =>
          product.definition.recipient.some((field) => field.key === key),
        ),
      ),
    );
  }
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (Object.values(recipient).some(Boolean) || busy) &&
      currentLocation.pathname !== nextLocation.pathname &&
      nextLocation.pathname !== committed.current,
  );
  useEffect(() => {
    if (blocker.state === "blocked") leave.current?.focus();
  }, [blocker.state]);
  useEffect(() => {
    if (!Object.values(recipient).some(Boolean) && !busy) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", prevent);
    return () => {
      window.removeEventListener("beforeunload", prevent);
    };
  }, [recipient, busy]);
  const refreshSession = session.reload;
  useEffect(() => {
    const changed = (event: Event) => {
      if (sessionEventMatches(event, "customer")) {
        setRecipient({});
        setAccepted(false);
        setStep("options");
        setIdentity(null);
        setPending(null);
        epoch.current++;
        refreshSession();
      }
    };
    window.addEventListener("boosterplus:session-changed", changed);
    return () => {
      window.removeEventListener("boosterplus:session-changed", changed);
    };
  }, [refreshSession]);
  const stock =
    Object.entries(product.available).find(
      ([name]) => name === variantKey,
    )?.[1] ?? 0;
  const valid =
    !!variant &&
    Number.isInteger(quantity) &&
    quantity >= variant.min_quantity &&
    quantity <= variant.max_quantity &&
    quantity <= stock;
  const amount =
    variant && Number.isSafeInteger(quantity) && quantity > 0
      ? (BigInt(variant.unit_amount_minor) * BigInt(quantity)).toString()
      : "0";
  const signedIn =
    !!session.data?.user &&
    session.data.user.role === "customer" &&
    !session.data.mfa_required;
  const currentIdentity = session.data?.user?.id ?? null;
  const denied =
    session.error instanceof APIError &&
    [401, 403].includes(session.error.status);
  if ((session.data || denied) && identity !== currentIdentity) {
    setIdentity(currentIdentity);
    setRecipient({});
    setStep("options");
    setAccepted(false);
    setPending(null);
  }
  const fieldsValid = product.definition.recipient.every((field) => {
    const value =
      Object.entries(recipient).find(([name]) => name === field.key)?.[1] ?? "";
    return (
      (!field.required || !!value.trim()) && value.length <= field.max_length
    );
  });
  function options(nextVariant: string, nextQuantity: number) {
    setVariantKey(nextVariant);
    setQuantity(nextQuantity);
    setAccepted(false);
    setKey(crypto.randomUUID());
    setParams(
      { variant: nextVariant, quantity: String(nextQuantity) },
      { replace: true, preventScrollReset: true },
    );
  }
  async function reserve() {
    if (
      lock.current ||
      (!pending && unavailable) ||
      session.loading ||
      session.error ||
      (!pending && (!variant || !valid || !accepted)) ||
      !signedIn ||
      !session.data
    )
      return;
    if (!pending && !variant) return;
    const request = pending ?? {
      request_key: key,
      release_id: product.release_id,
      variant: variant?.key ?? "",
      quantity,
      expected_amount: amount,
      currency: variant?.currency ?? "",
      recipient,
      accept_terms: accepted,
      terms_version: session.data.terms_version,
    };
    const generation = epoch.current;
    setPending(request);
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const order = await post(
        `/games/${product.game_slug}/shop/${product.id}/reserve`,
        request,
        deliverySchema,
      );
      if (generation !== epoch.current) return;
      setRecipient({});
      setPending(null);
      committed.current = `/orders/${order.order_id}`;
      await navigate(`${committed.current}?section=payment`);
    } catch (cause) {
      if (generation !== epoch.current) return;
      if (
        cause instanceof APIError &&
        cause.status >= 400 &&
        cause.status < 500
      )
        setPending(null);
      setError(cause);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="shop-purchase">
      <div className="shop-product-intro">
        <ShopArtwork
          source={product.definition.asset}
          alt={product.definition.asset_alt}
        />
        <div>
          <p className="eyebrow">{product.definition.category}</p>
          <h2>{product.definition.title}</h2>
          <p>{product.definition.description}</p>
          <p>Manual delivery by PLAYORA staff after verified payment.</p>
        </div>
      </div>
      <ol className="shop-steps" aria-label="Purchase steps">
        {["options", "recipient", "review"].map((value, index) => (
          <li key={value} aria-current={step === value ? "step" : undefined}>
            {index + 1}. {value}
          </li>
        ))}
      </ol>
      <ErrorNotice error={error} />
      <ErrorNotice error={session.error} />
      {!!session.error && (
        <Action onClick={refreshSession}>Retry sign-in check</Action>
      )}
      {!!error && (
        <p>
          Your payment has not been assumed successful. Retry with the same
          selection to recover an interrupted reservation, or{" "}
          <Action onClick={reload}>reload current availability</Action> to
          review changed terms.
        </p>
      )}
      {pending && !!error && (
        <div role="alert">
          <p>
            The reservation result is uncertain. Your exact selection is locked
            until it is recovered; retrying cannot create a second order.
          </p>
          <Action
            disabled={busy || session.loading || !!session.error || !signedIn}
            onClick={() => void reserve()}
          >
            Retry reservation
          </Action>
          <Link to="/orders">Check my orders</Link>
        </div>
      )}
      {changedTerms && (
        <p role="alert">
          The published product changed. Your draft is retained; review the
          current options, recipient fields and terms before accepting again.
        </p>
      )}
      {blocker.state === "blocked" && (
        <section role="alert" ref={leave} tabIndex={-1}>
          <h3>Keep this purchase draft?</h3>
          <p>Leaving clears private recipient details.</p>
          <div className="catalog-actions">
            <Action
              onClick={() => {
                blocker.reset();
              }}
            >
              Stay with purchase
            </Action>
            <Action
              disabled={busy}
              onClick={() => {
                blocker.proceed();
              }}
            >
              Discard draft and leave
            </Action>
          </div>
        </section>
      )}
      <fieldset
        disabled={
          busy || !!pending || unavailable || session.loading || !!session.error
        }
      >
        <legend className="ui-visually-hidden">Shop purchase</legend>
        {step === "options" && (
          <>
            <h3 ref={stepHeading} tabIndex={-1}>
              Choose your options
            </h3>
            <label className="catalog-label">
              Variant
              <select
                value={variantKey}
                onChange={(e) => {
                  const next = variants.find((v) => v.key === e.target.value);
                  options(e.target.value, next?.min_quantity ?? 1);
                }}
              >
                {variants.map((v) => (
                  <option key={v.key} value={v.key}>
                    {v.label} · {v.currency} {minorDisplay(v.unit_amount_minor)}
                  </option>
                ))}
              </select>
            </label>
            {variant && (
              <>
                <p>
                  {variant.region} · {variant.platform} · {variant.server}
                </p>
                <label className="catalog-label">
                  Quantity
                  <input
                    type="number"
                    min={variant.min_quantity}
                    max={Math.min(variant.max_quantity, stock)}
                    step="1"
                    aria-invalid={!valid}
                    aria-describedby="shop-quantity-guidance"
                    value={quantity}
                    onChange={(e) => {
                      options(variantKey, Number(e.target.value));
                    }}
                  />
                </label>
                <p>
                  {stock > 0
                    ? `${String(stock)} available; confirmed again when you reserve.`
                    : "This variant is sold out."}
                </p>
              </>
            )}
            <p id="shop-quantity-guidance">
              {variant
                ? `Choose ${String(variant.min_quantity)}–${String(variant.max_quantity)} whole units, within available stock.`
                : "Choose an available variant."}
            </p>
            {signedIn ? (
              <Action
                disabled={!valid}
                onClick={() => {
                  setStep("recipient");
                }}
              >
                Continue to recipient
              </Action>
            ) : session.loading ? (
              <p role="status">Checking sign-in…</p>
            ) : (
              <>
                <p>
                  Sign in before entering private recipient details. Your
                  selected options stay in this URL.
                </p>
                <Link
                  className="button"
                  to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
                >
                  Sign in to continue
                </Link>
              </>
            )}
          </>
        )}
        {step === "recipient" && !session.error && !session.loading && (
          <>
            <h3 ref={stepHeading} tabIndex={-1}>
              Where should we deliver?
            </h3>
            <p>
              Use only the requested game identifiers. Never enter a password or
              recovery code.
            </p>
            {product.definition.recipient.map((field) => (
              <Text
                key={field.key}
                label={`${field.label}${field.required ? " (required)" : " (optional)"}`}
                help={`${field.help} Maximum ${String(field.max_length)} characters.`}
                value={
                  Object.entries(recipient).find(
                    ([name]) => name === field.key,
                  )?.[1] ?? ""
                }
                change={(value) => {
                  setRecipient((old) => ({ ...old, [field.key]: value }));
                  setAccepted(false);
                  setKey(crypto.randomUUID());
                }}
              />
            ))}
            {!fieldsValid && (
              <p role="status">
                Complete the required identifiers within the stated character
                limits to continue.
              </p>
            )}
            <Action
              onClick={() => {
                setStep("options");
              }}
            >
              Back to options
            </Action>
            <Action
              disabled={!fieldsValid || !valid}
              onClick={() => {
                setStep("review");
              }}
            >
              Review purchase
            </Action>
          </>
        )}
        {step === "review" && (
          <>
            <h3 ref={stepHeading} tabIndex={-1}>
              Review your purchase
            </h3>
            <p>
              {variant?.region} · {variant?.platform} · {variant?.server}
            </p>
            <p>
              {variant?.label} · Quantity {quantity}
            </p>
            <dl>
              {product.definition.recipient.map((field) => (
                <div key={field.key}>
                  <dt>{field.label}</dt>
                  <dd>
                    {recipientValue(recipient, field.key)
                      ? "••••" + recipientValue(recipient, field.key).slice(-2)
                      : "Not provided"}
                  </dd>
                </div>
              ))}
            </dl>
            <h4>Delivery terms</h4>
            <p className="payment-policy">
              {product.definition.policy.delivery_terms}
            </p>
            <h4>Cancellation</h4>
            <p className="payment-policy">
              {product.definition.policy.cancellation_terms}
            </p>
            <h4>Refunds</h4>
            <p className="payment-policy">
              {product.definition.policy.refund_terms}
            </p>
            <p>{product.definition.policy.fees}</p>
            <p>
              Estimated delivery: {product.definition.policy.delivery_min_hours}
              –{product.definition.policy.delivery_max_hours} hours after
              verified payment. Reservation:{" "}
              {product.definition.policy.reservation_minutes} minutes before
              checkout; payment instructions show the final invoice deadline.
            </p>
            <p className="shop-review-total">
              <strong>
                Total: {variant?.currency} {minorDisplay(amount)}
              </strong>
            </p>
            <Check
              label="I confirm the recipient, compatibility, price and delivery terms"
              value={accepted}
              change={setAccepted}
            />
            <Action
              onClick={() => {
                setStep("recipient");
              }}
            >
              Edit recipient
            </Action>
            <Action
              disabled={!valid || !fieldsValid || !accepted || !signedIn}
              onClick={() => void reserve()}
            >
              {busy ? "Reserving…" : "Reserve and continue to payment"}
            </Action>
          </>
        )}
      </fieldset>
      <aside className="shop-summary" aria-label="Purchase total">
        <span>Total</span>
        <strong>
          {variant?.currency} {minorDisplay(amount)}
        </strong>
        <p>Direct crypto payment. No wallet balance.</p>
      </aside>
    </div>
  );
}
function recipientValue(values: Record<string, string>, key: string) {
  return Object.entries(values).find(([name]) => name === key)?.[1] ?? "";
}
