import { PublishedPrice } from "./published-price";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link, useBlocker, useNavigate } from "../portal-router";
import { Action, Check, ErrorNotice, Select, Text } from "../catalog/controls";
import { minorDisplay } from "../catalog/dynamic-form";
import { APIError, post, sessionSchema } from "../identity/api";
import { sessionEventMatches } from "../identity/portal";
import { useResource } from "../orders/resource";
import { ActionFields, rejectInvalidFields } from "../ui/action-fields";
import { Loading } from "../ui/loading";
import { Button } from "../ui/primitives";
import { SupplierErrorNotice } from "../suppliers/feedback";
import {
  supplierQuoteSchema,
  type SupplierField,
  type SupplierQuote,
} from "../suppliers/contracts";
import { deliverySchema, type PublicProduct } from "./model";
import ShopArtwork from "./artwork";
import { productDeliveryLabel } from "./delivery-method";

type Acceptance = {
  request_key: string;
  quote_id: string;
  expected_amount: string;
  terms_version: string;
  accept_terms: boolean;
  recipient: Record<string, string>;
};

export function SupplierPurchase({
  product: currentProduct,
  unavailable,
}: {
  product: PublicProduct;
  unavailable: boolean;
}) {
  const [product, setProduct] = useState(currentProduct);
  const source = product.definition.supplier;
  const session = useResource("/auth/session", sessionSchema);
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(
    source?.quantity.kind === "one" ? "1" : (source?.quantity.min ?? "1"),
  );
  const [recipient, setRecipient] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState<SupplierQuote | null>(null);
  const [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null),
    [pending, setPending] = useState<Acceptance | null>(null);
  const [now, setNow] = useState(Date.now),
    [lost, setLost] = useState(false);
  const lock = useRef(false),
    epoch = useRef(0),
    heading = useRef<HTMLHeadingElement>(null),
    recovery = useRef<HTMLElement>(null),
    leave = useRef<HTMLElement>(null),
    committed = useRef("");
  const [notice, setNotice] = useState("");
  if (product.release_id !== currentProduct.release_id && !pending) {
    setProduct(currentProduct);
    setRecipient({});
    setQuote(null);
    setAccepted(false);
    setBusy(false);
    setError(null);
    setQuantity(
      currentProduct.definition.supplier?.quantity.kind === "one"
        ? "1"
        : (currentProduct.definition.supplier?.quantity.min ?? "1"),
    );
    setNotice(
      "The product changed. Review its current details and price before continuing. Private delivery details have been cleared.",
    );
  }
  const invalidate = useCallback(() => {
    epoch.current++;
    lock.current = false;
  }, []);
  useLayoutEffect(() => {
    invalidate();
  }, [product.release_id, invalidate]);
  const hasDraft = Object.values(recipient).some(Boolean) || !!pending || busy;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasDraft &&
      currentLocation.pathname !== nextLocation.pathname &&
      nextLocation.pathname !== committed.current,
  );
  useEffect(() => {
    if (blocker.state === "blocked") leave.current?.focus();
  }, [blocker.state]);
  useEffect(() => {
    if (!hasDraft) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", prevent);
    return () => {
      window.removeEventListener("beforeunload", prevent);
    };
  }, [hasDraft]);
  const identity = session.data?.user?.id ?? "";
  const activeIdentity = useRef(identity);
  const reloadSession = session.reload;
  useEffect(() => {
    const clear = () => {
      invalidate();
      setRecipient({});
      setQuote(null);
      setAccepted(false);
      setPending(null);
      setBusy(false);
    };
    if (
      activeIdentity.current !== identity ||
      session.error ||
      session.data?.mfa_required
    ) {
      activeIdentity.current = identity;
      clear();
    }
    const changed = (event: Event) => {
      if (sessionEventMatches(event, "customer")) {
        clear();
        setLost(true);
        reloadSession();
      }
    };
    window.addEventListener("boosterplus:session-changed", changed);
    return () => {
      invalidate();
      window.removeEventListener("boosterplus:session-changed", changed);
    };
  }, [
    identity,
    reloadSession,
    session.error,
    session.data?.mfa_required,
    invalidate,
  ]);
  const [checkedSession, setCheckedSession] = useState(session.data);
  if (checkedSession !== session.data && !session.loading) {
    setCheckedSession(session.data);
    if (!session.error) setLost(false);
  }
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (quote) heading.current?.focus();
  }, [quote]);
  useEffect(() => {
    if (pending && !busy) recovery.current?.focus();
  }, [pending, busy]);
  const signed =
    !!identity &&
    session.data?.user?.role === "customer" &&
    !session.data.mfa_required &&
    !lost &&
    !session.error;
  const expired =
    !!quote &&
    (!Number.isFinite(Date.parse(quote.expires_at)) ||
      Date.parse(quote.expires_at) <= now);
  const disabled =
    unavailable ||
    !currentProduct.supplier_available ||
    busy ||
    session.loading ||
    !signed;
  if (!source) return null;

  function checkFields() {
    rejectInvalidFields(
      source?.fields.flatMap((field) => {
        const value = recipient[field.id] ?? "";
        return field.required && !value.trim()
          ? [
              {
                path: `recipient.${field.id}`,
                message: `Enter ${field.label}.`,
              },
            ]
          : value.length > 4096
            ? [
                {
                  path: `recipient.${field.id}`,
                  message: "Use a shorter value.",
                },
              ]
            : [];
      }) ?? [],
    );
  }
  async function refreshQuote() {
    if (disabled || lock.current || pending) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setQuote(null);
    setAccepted(false);
    const generation = epoch.current;
    try {
      checkFields();
      const quantityParts = quantity.split(".");
      rejectInvalidFields(
        quantity.length > 24 ||
          quantityParts.length > 2 ||
          quantityParts.some((part) => !/^[0-9]+$/.test(part))
          ? [
              {
                path: "quantity",
                message: "Enter the supported quantity shown below.",
              },
            ]
          : [],
      );
      const result = await post(
        `/games/${product.game_slug}/shop/${product.id}/quote`,
        { release_id: product.release_id, quantity },
        supplierQuoteSchema,
      );
      if (epoch.current === generation) {
        if (
          result.product_id !== product.id ||
          result.release_id !== product.release_id ||
          result.quantity !== quantity ||
          !Number.isFinite(Date.parse(result.expires_at))
        ) {
          throw new Error(
            "The price response could not be confirmed. Check the current price again.",
          );
        }
        setNow(Date.now());
        setQuote(result);
      }
    } catch (cause) {
      if (epoch.current === generation) setError(cause);
    } finally {
      if (epoch.current === generation) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  async function reserve() {
    if (
      lock.current ||
      !signed ||
      session.loading ||
      (!pending && (disabled || !quote || expired || !accepted))
    )
      return;
    const request = pending ?? {
      request_key: crypto.randomUUID(),
      quote_id: quote?.id ?? "",
      expected_amount: quote?.amount_minor ?? "",
      terms_version: session.data?.terms_version ?? "",
      accept_terms: accepted,
      recipient: { ...recipient },
    };
    const generation = epoch.current;
    lock.current = true;
    setPending(request);
    setBusy(true);
    setError(null);
    try {
      const result = await post(
        `/games/${product.game_slug}/shop/${product.id}/supplier-reserve`,
        request,
        deliverySchema,
      );
      if (epoch.current !== generation) return;
      setRecipient({});
      setPending(null);
      committed.current = `/orders/${result.order_id}`;
      await navigate(`${committed.current}?section=payment`);
    } catch (cause) {
      if (epoch.current !== generation) return;
      setError(cause);
      if (
        cause instanceof APIError &&
        cause.status >= 400 &&
        cause.status < 500
      ) {
        setPending(null);
        if (cause.status === 409 || cause.status === 422) {
          setQuote(null);
          setAccepted(false);
        }
      }
    } finally {
      if (epoch.current === generation) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <article className="shop-purchase supplier-checkout">
      <div className="shop-product-intro">
        <ShopArtwork
          source={product.definition.asset}
          regions={product.definition.variants
            .filter((v) => v.enabled)
            .map((v) => v.region)}
          alt={product.definition.asset_alt}
        />
        <div>
          <p className="eyebrow">{productDeliveryLabel(product.definition)}</p>
          <h2>{product.definition.title}</h2>
          <PublishedPrice product={product} detail />
          <p>{product.definition.description}</p>
          <p>{product.definition.variants[0]?.region}</p>
          {source.testing && (
            <p className="supplier-badge">
              Sandbox product · simulated delivery
            </p>
          )}
        </div>
      </div>
      <details>
        <summary>Compatibility and delivery terms</summary>
        <p>{product.definition.policy.delivery_terms}</p>
        {source.eligibility.countries?.length ? (
          <p>Supported countries: {source.eligibility.countries.join(", ")}</p>
        ) : null}
        {source.eligibility.excluded_countries?.length ? (
          <p>
            Not supported: {source.eligibility.excluded_countries.join(", ")}
          </p>
        ) : null}
        {source.eligibility.policy_countries?.length ? (
          <p>
            {source.eligibility.policy_kind}:{" "}
            {source.eligibility.policy_countries.join(", ")}
          </p>
        ) : null}
        <h3>Cancellation</h3>
        <p>{product.definition.policy.cancellation_terms}</p>
        <h3>Refunds</h3>
        <p>{product.definition.policy.refund_terms}</p>
        <h3>Fees</h3>
        <p>{product.definition.policy.fees}</p>
      </details>
      {notice && <p role="status">{notice}</p>}
      {blocker.state === "blocked" && (
        <section role="alert" ref={leave} tabIndex={-1}>
          <h3>Keep this purchase draft?</h3>
          <p>
            {pending
              ? "The saved-order result is still being checked. Check this order before starting a new purchase."
              : "Leaving clears private delivery details."}
          </p>
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
            Leave this purchase
          </Action>
        </section>
      )}
      {!currentProduct.supplier_available && (
        <p role="status">
          Ordering is temporarily unavailable. Existing orders remain in My
          account.
        </p>
      )}
      {session.loading && <Loading compact label="Loading checkout…" />}
      <ErrorNotice error={session.error} />
      {!!session.error && (
        <Action onClick={session.reload}>Retry sign-in check</Action>
      )}
      {!signed && !session.loading && (
        <Link
          className="button"
          to={`/login?returnTo=${encodeURIComponent(`/games/${product.game_slug}/shop/${product.id}`)}`}
        >
          Sign in to order
        </Link>
      )}
      {signed && (
        <ActionFields error={pending ? null : error} busy={busy}>
          {!pending && <SupplierErrorNotice error={error} />}
          {pending && !busy && (
            <section role="alert" ref={recovery} tabIndex={-1}>
              <h3>Check your saved order</h3>
              <p>
                We haven’t confirmed whether your order was saved. Check this
                order using the same request before starting another purchase.
              </p>
              <Action disabled={session.loading} onClick={() => void reserve()}>
                Check this order
              </Action>
            </section>
          )}
          <fieldset disabled={disabled || !!pending || !!quote}>
            <legend>Delivery details</legend>
            {source.quantity.kind !== "one" && (
              <Text
                name="quantity"
                label="Quantity"
                value={quantity}
                change={setQuantity}
                inputMode="decimal"
                help={`${source.quantity.min}${source.quantity.max !== "0" ? `–${source.quantity.max}` : " or more"}${source.quantity.step !== "0" ? `, in steps of ${source.quantity.step}` : ""}`}
              />
            )}
            {!source.fields.length && (
              <p>
                {source.method === "code"
                  ? "No details needed. Your code appears in your order after delivery."
                  : "No delivery details are required for this product."}
              </p>
            )}
            {source.fields.map((field) => (
              <SupplierInput
                key={field.id}
                field={field}
                value={recipient[field.id] ?? ""}
                change={(value) => {
                  setRecipient((old) => ({ ...old, [field.id]: value }));
                }}
              />
            ))}
          </fieldset>
          {!quote && !pending && (
            <Action disabled={disabled} onClick={() => void refreshQuote()}>
              Review current price
            </Action>
          )}
          {quote && (
            <section className="shop-summary" aria-label="Review price">
              <h3 ref={heading} tabIndex={-1}>
                Review your order
              </h3>
              <p>
                {quantity} × {product.definition.title}
              </p>
              <p>
                {productDeliveryLabel(product.definition)} ·{" "}
                {product.definition.variants[0]?.region}
              </p>
              <p className="shop-review-total">
                Total: <strong>USD {minorDisplay(quote.amount_minor)}</strong>
              </p>
              {!pending && (
                <p>
                  {expired
                    ? "This quote expired. Refresh the price before continuing."
                    : `Price valid for ${String(Math.max(0, Math.ceil((Date.parse(quote.expires_at) - now) / 1000)))} seconds.`}
                </p>
              )}
              <p>
                Delivery starts after payment is verified. If availability
                changes, support will review your order; you will not be charged
                extra.
              </p>
              <p>
                <Link to="/terms">Terms</Link> ·{" "}
                <Link to="/privacy">Privacy</Link>
              </p>
              {!pending && (
                <Check
                  label="I confirm the delivery details, region, price and product terms"
                  value={accepted}
                  change={setAccepted}
                />
              )}
              <div className="form-actions">
                {expired ? (
                  <Action
                    disabled={disabled || !!pending}
                    onClick={() => void refreshQuote()}
                  >
                    Refresh price
                  </Action>
                ) : (
                  <Action
                    disabled={disabled || !accepted || !!pending}
                    onClick={() => void reserve()}
                  >
                    Go to payment
                  </Action>
                )}
                <Button
                  variant="secondary"
                  disabled={disabled || !!pending}
                  onClick={() => {
                    setQuote(null);
                    setAccepted(false);
                  }}
                >
                  Edit details
                </Button>
              </div>
            </section>
          )}
        </ActionFields>
      )}
    </article>
  );
}

function SupplierInput({
  field,
  value,
  change,
}: {
  field: SupplierField;
  value: string;
  change: (value: string) => void;
}) {
  const name = `recipient.${field.id}`,
    label = field.label + (field.required ? "" : " (optional)");
  if (field.kind === "select")
    return (
      <Select
        name={name}
        label={label}
        value={value}
        change={change}
        options={[
          ["", "Choose…"],
          ...(field.options ?? []).map((option): [string, string] => [
            option.id,
            option.label,
          ]),
        ]}
      />
    );
  return (
    <Text
      name={name}
      label={label}
      value={value}
      change={change}
      type={field.secret ? "password" : "text"}
      autoComplete="off"
      inputMode={field.kind === "number" ? "decimal" : undefined}
      maxLength={4096}
      help={[
        field.secret
          ? "Encrypted for this delivery. Never enter a PLAYORA sign-in code."
          : "",
        field.kind === "number" && field.min ? `Minimum ${field.min}` : "",
        field.kind === "number" && field.max ? `Maximum ${field.max}` : "",
        field.kind === "number" && field.step ? `Steps of ${field.step}` : "",
      ]
        .filter(Boolean)
        .join(" · ")}
    />
  );
}
