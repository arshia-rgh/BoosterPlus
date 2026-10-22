import { Loading } from "../ui/loading";
import { BuyerBreakdown } from "./commission-fields";
import { Anchor } from "../portal-router";
import MarketFilters from "./market-filters";
import { maximumDisplay } from "./market-price";
import AccountAlerts from "../availability/accounts";
import { FavoriteButton } from "../orders/favorites";
import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { z } from "../validation";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
  type Location,
} from "../portal-router";
import { Action, Check, ErrorNotice } from "../catalog/controls";
import { get, post, sessionSchema } from "../identity/api";
import RequestJourney, {
  requestReference,
  recoverySchema,
  RequestSubmission,
} from "../orders/request-recovery";
import { sessionEventMatches } from "../identity/portal";
import { detailSchema } from "../orders/model";
import { useResource } from "../orders/resource";
import {
  publicListingSchema,
  publicListingsSchema,
  type PublicListing,
} from "./model";

import AccountGallery from "./gallery";
import {
  AccountCard,
  AccountConditions,
  AccountDescription,
  AccountFacts,
  AccountPrice,
  AccountTitle,
} from "./account-presentation";
export { ProductTerms } from "./account-presentation";
import {
  AccountRequest,
  useWantedAccounts,
  useWantedSection,
  WantedAccounts,
  WantedTeaser,
} from "./wanted";
import "./marketplace.css";
export function AccountMarket({ gameSlug }: { gameSlug?: string | undefined }) {
  const [params] = useSearchParams();
  return gameSlug ? (
    <GameMarket gameSlug={gameSlug} />
  ) : (
    <MarketResults key={params.toString()} />
  );
}
// Wanted accounts load once per game, independent of filters and pagination.
function GameMarket({ gameSlug }: { gameSlug: string }) {
  const [params] = useSearchParams();
  const wanted = useWantedAccounts(gameSlug);
  const section = useWantedSection();
  return (
    <MarketResults
      key={gameSlug + params.toString()}
      gameSlug={gameSlug}
      teaser={wanted.items.length > 0 && <WantedTeaser section={section} />}
      footer={
        !wanted.settled ? null : wanted.items.length ? (
          <WantedAccounts
            slug={gameSlug}
            items={wanted.items}
            section={section}
          />
        ) : (
          <AccountRequest slug={gameSlug} />
        )
      }
    />
  );
}
function MarketResults({
  gameSlug,
  teaser,
  footer,
}: {
  gameSlug?: string | undefined;
  teaser?: ReactNode;
  footer?: ReactNode;
}) {
  const Container = gameSlug ? "section" : "main";
  const Heading = gameSlug ? "h2" : "h1";
  const CardHeading = gameSlug ? "h3" : "h2";
  const [params, setParams] = useSearchParams();
  const navigation = useLocation();
  const focusResults = z
    .object({ filtersApplied: z.literal(true) })
    .safeParse(navigation.state).success;
  const resultSummary = useRef<HTMLParagraphElement>(null);
  const after = params.get("after") ?? "";
  const query = new URLSearchParams({
    search: params.get("search") ?? "",
    region: params.get("region") ?? "",
    rank: params.get("rank") ?? "",
    slug: gameSlug ?? params.get("slug") ?? "",
    currency: params.get("currency") ?? "",
    max_minor: params.get("max_minor") ?? "",
    sort: params.get("sort") ?? (after ? "" : "newest"),
    after,
  }).toString();
  const resource = useResource(`/accounts?${query}`, publicListingsSchema);
  const ready = !!resource.data && !resource.error;
  useEffect(() => {
    if (focusResults && ready) resultSummary.current?.focus();
  }, [focusResults, ready]);
  const serviceContext =
    gameSlug && !navigation.pathname.includes("/accounts")
      ? { service: "accounts" }
      : {};
  function pageAfter(value: string) {
    const next = new URLSearchParams(query);
    if (serviceContext.service) next.set("service", serviceContext.service);
    next.set("after", value);
    setParams(next, { state: { filtersApplied: true } });
  }
  return (
    <Container
      id={gameSlug ? undefined : "main"}
      className={
        gameSlug
          ? "marketplace game-account-market"
          : "page catalog-page marketplace"
      }
    >
      <p className="eyebrow">PLAYORA marketplace</p>
      <Heading>Find your next account</Heading>
      <p>
        Compare rank, region and price. Open an account for screenshots and
        delivery terms.
      </p>
      <p className="market-sell-links">
        <Link
          to={
            gameSlug
              ? `/sell/new?slug=${encodeURIComponent(gameSlug)}`
              : "/sell"
          }
        >
          Sell an account →
        </Link>
        {teaser}
      </p>
      <details className="market-alerts">
        <summary>Get notified about accounts</summary>
        <AccountAlerts {...(gameSlug ? { slug: gameSlug } : {})} />
      </details>
      <MarketFilters
        params={params}
        gameSlug={gameSlug}
        apply={(values) => {
          resultSummary.current?.focus();
          setParams(new URLSearchParams({ ...serviceContext, ...values }), {
            state: { filtersApplied: true },
          });
        }}
        clear={() => {
          setParams(serviceContext, { state: { filtersApplied: true } });
        }}
      />
      {[
        "search",
        "rank",
        "region",
        "slug",
        "currency",
        "max_minor",
        "sort",
      ].some((key) => params.get(key)) && (
        <section
          className="market-applied-filters"
          aria-label="Applied account filters"
        >
          <ul>
            {(
              [
                "search",
                "rank",
                "region",
                "slug",
                "currency",
                "max_minor",
                "sort",
              ] as const
            )
              .filter((key) => params.get(key) && !(gameSlug && key === "slug"))
              .map((key) => (
                <li key={key}>
                  {new Map<string, string>([
                    ["search", "Search"],
                    ["rank", "Rank"],
                    ["region", "Region"],
                    ["slug", "Game"],
                    ["currency", "Currency"],
                    ["max_minor", "Maximum price"],
                    ["sort", "Sort"],
                  ]).get(key)}
                  :{" "}
                  {key === "max_minor"
                    ? maximumDisplay(params.get(key) ?? "")
                    : key === "sort"
                      ? ({
                          newest: "Newest first",
                          price_asc: "Price: low to high",
                          price_desc: "Price: high to low",
                        }[params.get(key) ?? ""] ?? params.get(key))
                      : params.get(key)?.slice(0, 120)}
                </li>
              ))}
          </ul>
          <Action
            onClick={() => {
              setParams(serviceContext, { state: { filtersApplied: true } });
            }}
          >
            Clear all filters
          </Action>
        </section>
      )}
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Loading available accounts…</p>}
      {!!resource.error && (
        <Action onClick={resource.reload}>Try accounts again</Action>
      )}
      {resource.data && !resource.error && (
        <>
          <p
            ref={resultSummary}
            tabIndex={-1}
            className="market-result-count"
            role="status"
          >
            {resource.data.items.length} accounts in this view
            {resource.data.next ? " · More available" : ""}
          </p>
          <div className="account-card-grid">
            {resource.data.items.map((row) => (
              <AccountCard
                key={row.id}
                listing={row}
                heading={CardHeading}
                market={query}
                globalMarket={!gameSlug}
              />
            ))}
          </div>
          {!resource.data.items.length && (
            <p>
              {[
                "search",
                "region",
                "rank",
                "slug",
                "currency",
                "max_minor",
              ].some((key) => params.get(key)?.trim())
                ? "No available accounts match these filters."
                : after
                  ? "There are no more accounts in this view."
                  : "No accounts are available right now."}
            </p>
          )}
          {resource.data.next && (
            <Action
              onClick={() => {
                pageAfter(resource.data?.next ?? "");
              }}
            >
              More accounts
            </Action>
          )}
        </>
      )}
      {after && (
        <Action
          onClick={() => {
            pageAfter("");
          }}
        >
          First accounts
        </Action>
      )}
      {footer}
    </Container>
  );
}
function Purchase({
  listing,
  base = "/accounts",
}: {
  listing: PublicListing;
  base?: string;
}) {
  const [params, setParams] = useSearchParams();
  const location: Location<unknown> = useLocation();
  const submitting = useContext(RequestSubmission);
  const review = params.get("step") === "review";
  const reviewPanel = useRef<HTMLElement>(null);
  const inspectionPanel = useRef<HTMLElement>(null);
  const previousReview = useRef(review);
  useEffect(() => {
    const target = review
      ? reviewPanel.current
      : previousReview.current
        ? inspectionPanel.current?.querySelector<HTMLButtonElement>("button")
        : null;
    if (target) {
      target.focus({ preventScroll: true });
      // The native focus scroll centers a tall panel and can hide its title.
      // scrollIntoView honors the storefront's measured sticky-header inset.
      if (typeof target.scrollIntoView === "function")
        target.scrollIntoView({
          block: review ? "start" : "center",
          behavior: "instant",
        });
    }
    previousReview.current = review;
  }, [review]);
  function step(value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set("step", value);
    else next.delete("step");
    setParams(next, { state: location.state, preventScrollReset: true });
  }
  const session = useResource("/auth/session", sessionSchema),
    [accept, setAccept] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [key] = useState(() => requestReference(params) || crypto.randomUUID()),
    navigate = useNavigate();
  const lock = useRef(false);
  const reloadSession = session.reload;
  useEffect(() => {
    const changed = (event: Event) => {
      if (sessionEventMatches(event, "customer")) {
        setAccept(false);
        setError(null);
        reloadSession();
      }
    };
    window.addEventListener("boosterplus:session-changed", changed);
    return () => {
      window.removeEventListener("boosterplus:session-changed", changed);
    };
  }, [reloadSession]);
  async function reserve() {
    if (
      lock.current ||
      busy ||
      session.loading ||
      !session.data?.user ||
      session.data.mfa_required ||
      !accept
    )
      return;
    lock.current = true;
    submitting(true);
    const reference = requestReference(params) || key;
    const next = new URLSearchParams(params);
    next.set("request", reference);
    setParams(next, {
      state: location.state,
      replace: true,
      preventScrollReset: true,
    });
    setBusy(true);
    setError(null);
    try {
      const existing = await get(
        `/me/order-requests/${reference}`,
        recoverySchema,
        "customer",
      );
      if (existing.order_id) {
        await navigate(`/orders/${existing.order_id}`);
        return;
      }
      const result = await post(
        `/accounts/${listing.id}/reserve`,
        {
          request_key: reference,
          release_id: listing.release_id,
          expected_amount: listing.product.amount_minor,
          currency: listing.product.currency,
          accept_terms: accept,
          terms_version: session.data.terms_version,
        },
        detailSchema,
      );
      void navigate(`/orders/${result.order.id}`);
    } catch (cause) {
      setError(cause);
    } finally {
      lock.current = false;
      submitting(false);
      setBusy(false);
    }
  }
  if (listing.state !== "published")
    return (
      <section
        className="account-purchase account-unavailable"
        aria-label="Account availability"
      >
        <AccountPrice listing={listing} />
        <p role="status">
          This account is {listing.state}. It cannot be reserved right now.
        </p>
        <Link preventScrollReset to={base}>
          Browse available accounts
        </Link>
      </section>
    );
  if (!review)
    return (
      <section
        ref={inspectionPanel}
        className="account-purchase"
        aria-label="Purchase this account"
      >
        <AccountPrice listing={listing} />
        {listing.product.commission && (
          <details className="account-price-details">
            <summary>Price breakdown</summary>
            <BuyerBreakdown price={listing.product.commission} />
          </details>
        )}
        <p className="account-delivery-note">
          Delivery: {listing.product.delivery_min_hours}–
          {listing.product.delivery_max_hours} hours after verified payment.
        </p>
        <Action
          onClick={() => {
            step("review");
          }}
        >
          Review this account purchase
        </Action>
        <p className="account-purchase-note">
          Nothing is reserved or charged yet.
        </p>
      </section>
    );
  return (
    <section
      ref={reviewPanel}
      tabIndex={-1}
      aria-label="Account purchase review"
      className="account-purchase account-purchase-review"
    >
      <button
        type="button"
        className="button compact secondary account-secondary-action"
        disabled={busy}
        onClick={() => {
          step("");
        }}
      >
        Back to account listing
      </button>
      <AccountTitle listing={listing} />
      <AccountFacts listing={listing} />
      {listing.product.commission ? (
        <BuyerBreakdown price={listing.product.commission} />
      ) : (
        <AccountPrice listing={listing} />
      )}
      <details className="account-review-description">
        <summary>Account description & features</summary>
        <AccountDescription listing={listing} />
      </details>
      <AccountConditions listing={listing} />
      <ErrorNotice error={error ?? session.error} />
      {!!session.error && (
        <Action onClick={session.reload}>Check sign-in again</Action>
      )}
      {session.loading ? (
        <Loading compact label="Checking sign-in…" />
      ) : session.error ? null : !session.data?.user ||
        session.data.mfa_required ? (
        <Link
          to={`/login?returnTo=${encodeURIComponent(`${base}/${listing.id}?step=review`)}`}
        >
          Sign in to reserve this account
        </Link>
      ) : (
        <fieldset disabled={busy || session.loading}>
          <legend>Reserve this exact account</legend>
          <p>You’ll pay from your order before its checkout deadline.</p>
          <p>
            <Anchor href="/terms" target="_blank" rel="noopener noreferrer">
              Site terms (opens in a new tab)
            </Anchor>
          </p>
          <Check
            label="I accept this account's price, sale, transfer, dispute and acknowledgement terms and the site terms"
            value={accept}
            change={setAccept}
          />
          <Action disabled={!accept} onClick={() => void reserve()}>
            Reserve and continue to payment
          </Action>
        </fieldset>
      )}
    </section>
  );
}
export function AccountProduct({
  gameSlug,
}: {
  gameSlug?: string | undefined;
}) {
  const Container = gameSlug ? "section" : "main";
  const Heading = gameSlug ? "h2" : "h1";
  const base = gameSlug
    ? `/games/${encodeURIComponent(gameSlug)}/accounts`
    : "/accounts";
  const location: Location<unknown> = useLocation();
  const review = new URLSearchParams(location.search).get("step") === "review";
  const navigation: unknown = location.state;
  const market =
    typeof navigation === "object" &&
    navigation !== null &&
    "market" in navigation &&
    typeof navigation.market === "string" &&
    // Bounded filters may contain percent-encoded Unicode plus an opaque cursor.
    navigation.market.length <= 8192
      ? navigation.market
      : "";
  const returnBase =
    typeof navigation === "object" &&
    navigation !== null &&
    "globalMarket" in navigation &&
    navigation.globalMarket === true
      ? "/accounts"
      : base;
  const { id = "" } = useParams(),
    resource = useResource(
      `/accounts/${encodeURIComponent(id)}`,
      publicListingSchema,
    );
  return (
    <Container
      id={gameSlug ? undefined : "main"}
      className={
        gameSlug
          ? "marketplace game-account-market"
          : "page catalog-page marketplace"
      }
    >
      <Link
        to={
          returnBase +
          (market ? "?" + new URLSearchParams(market).toString() : "")
        }
      >
        ← Account marketplace
      </Link>
      <div className="account-page-toolbar">
        <Heading className={review ? undefined : "account-page-heading"}>
          {review ? "Review your account purchase" : "Account details"}
        </Heading>
        <button
          type="button"
          className="button compact account-secondary-action"
          disabled={resource.loading}
          onClick={resource.reload}
        >
          Refresh availability & terms
        </button>
      </div>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Loading account…</p>}
      {!!resource.error && (
        <Action onClick={resource.reload}>Try account again</Action>
      )}
      {resource.data && gameSlug && resource.data.slug !== gameSlug && (
        <p role="status">
          This account is not available for this game. Choose an account from
          this game’s marketplace.
        </p>
      )}
      {resource.data &&
        !resource.error &&
        (!gameSlug || resource.data.slug === gameSlug) && (
          <>
            <div hidden={review}>
              <AccountTitle listing={resource.data} />
            </div>
            <div
              className={`account-detail-layout${review ? " is-review" : ""}`}
            >
              <div className="account-detail-summary">
                <div hidden={review}>
                  <AccountFacts listing={resource.data} />
                </div>
                <RequestJourney>
                  <Purchase
                    key={resource.data.release_id}
                    listing={resource.data}
                    base={base}
                  />
                </RequestJourney>
              </div>
              <div hidden={review} className="account-detail-media">
                <AccountGallery
                  images={resource.data.images}
                  title={resource.data.product.title}
                />
                <AccountDescription listing={resource.data} />
              </div>
              <div hidden={review} className="account-detail-help">
                <div className="catalog-actions">
                  <FavoriteButton
                    kind="account"
                    slug={resource.data.slug}
                    pack={resource.data.id}
                  />
                  <Link
                    to={`/support?listing=${encodeURIComponent(resource.data.id)}`}
                  >
                    Ask about this account
                  </Link>
                </div>
                <details className="market-alerts">
                  <summary>Availability notifications</summary>
                  <AccountAlerts
                    slug={resource.data.slug}
                    listingID={resource.data.id}
                  />
                </details>
                <Link
                  to={`/games/${resource.data.slug}/reviews?service=account_sale`}
                >
                  Account purchase reviews →
                </Link>
              </div>
            </div>
            <div hidden={review}>
              <AccountConditions listing={resource.data} />
            </div>
          </>
        )}
    </Container>
  );
}
