import MarketFilterPanel from "./filter-panel";
import AccountAlerts from "../availability/accounts";
import { FavoriteButton } from "../orders/favorites";
import { useContext, useEffect, useRef, useState } from "react";
import { z } from "../validation";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
  type Location,
} from "react-router";
import { Action, Check, ErrorNotice, Text } from "../catalog/controls";
import { minorDisplay } from "../catalog/dynamic-form";
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

import AccountGallery, { AccountImage } from "./gallery";
import "./marketplace.css";
export function ProductTerms({ listing }: { listing: PublicListing }) {
  const p = listing.product;
  return (
    <section className="catalog-section">
      <h2>{p.title}</h2>
      <p>
        {listing.game} · {p.region} · {p.rank}
      </p>
      <p className="package-price">
        {/^[1-9][0-9]{0,11}$/.test(p.amount_minor)
          ? `${p.currency} ${minorDisplay(p.amount_minor)}`
          : "Price awaiting review"}
      </p>
      <p className="payment-policy">{p.description}</p>
      <AccountGallery images={listing.images} title={p.title} />
      <dl className="account-attributes">
        {p.attributes.map((a) => (
          <div key={a.label}>
            <dt>{a.label}</dt>
            <dd>{a.value}</dd>
          </div>
        ))}
      </dl>
      <section className="account-sale-terms" aria-label="Sale terms">
        <h3>Sale agreement</h3>
        <p className="payment-policy">{p.sale_terms}</p>
        <h3>Ownership transfer</h3>
        <p className="payment-policy">{p.transfer_requirements}</p>
        <p>
          Delivery estimate: {p.delivery_min_hours}–{p.delivery_max_hours} hours
          after verified payment.
        </p>
        <h3>Disputes and acknowledgement</h3>
        <p className="payment-policy">{p.dispute_terms}</p>
        <p>Dispute window: {p.dispute_hours} hours from delivery.</p>
        <p className="payment-policy">{p.acknowledgement_terms}</p>
      </section>
    </section>
  );
}
export function AccountMarket({ gameSlug }: { gameSlug?: string | undefined }) {
  const [params] = useSearchParams();
  return (
    <MarketResults
      key={(gameSlug ?? "") + params.toString()}
      gameSlug={gameSlug}
    />
  );
}
function MarketResults({ gameSlug }: { gameSlug?: string | undefined }) {
  const Container = gameSlug ? "section" : "main";
  const Heading = gameSlug ? "h2" : "h1";
  const CardHeading = gameSlug ? "h3" : "h2";
  const base = gameSlug
    ? `/games/${encodeURIComponent(gameSlug)}/accounts`
    : "/accounts";
  const [params, setParams] = useSearchParams();
  const navigation = useLocation();
  const focusResults = z
    .object({ filtersApplied: z.literal(true) })
    .safeParse(navigation.state).success;
  const resultSummary = useRef<HTMLParagraphElement>(null);
  const [search, setSearch] = useState(
      params.get("search")?.slice(0, 200) ?? "",
    ),
    [region, setRegion] = useState(params.get("region")?.slice(0, 80) ?? ""),
    [rank, setRank] = useState(params.get("rank")?.slice(0, 80) ?? "");
  const after = params.get("after")?.slice(0, 500) ?? "";
  const query = new URLSearchParams({
    search: params.get("search")?.slice(0, 200) ?? "",
    region: params.get("region")?.slice(0, 80) ?? "",
    rank: params.get("rank")?.slice(0, 80) ?? "",
    slug: gameSlug ?? params.get("slug")?.slice(0, 64) ?? "",
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
    setParams(next);
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
        Reviewed listings with clear ownership terms, direct crypto checkout and
        protected delivery.
      </p>
      <Link
        to={
          gameSlug ? `/sell/new?slug=${encodeURIComponent(gameSlug)}` : "/sell"
        }
      >
        Sell an account{" "}
        <span className="quiet">· Opens your seller workspace</span>
      </Link>
      <details className="market-alerts">
        <summary>Get notified about accounts</summary>
        <AccountAlerts {...(gameSlug ? { slug: gameSlug } : {})} />
      </details>
      <MarketFilterPanel>
        <form
          className="market-filters"
          onSubmit={(event) => {
            event.preventDefault();
            event.currentTarget.closest("dialog")?.close();
            resultSummary.current?.focus();
            setParams(
              new URLSearchParams({
                ...serviceContext,
                search,
                region,
                rank,
                slug: gameSlug ?? params.get("slug") ?? "",
              }),
              { state: { filtersApplied: true } },
            );
          }}
        >
          <fieldset>
            <legend>Find an account</legend>
            <Text label="Search accounts" value={search} change={setSearch} />
            <Text label="Account region" value={region} change={setRegion} />
            <Text label="Account rank" value={rank} change={setRank} />
            <button className="button compact" type="submit">
              Apply account filters
            </button>
            {(params.get("search") ||
              params.get("region") ||
              params.get("rank") ||
              after) && (
              <Action
                onClick={() => {
                  setParams(
                    (gameSlug ?? params.get("slug"))
                      ? {
                          ...serviceContext,
                          slug: gameSlug ?? params.get("slug") ?? "",
                        }
                      : {},
                  );
                }}
              >
                Clear account filters
              </Action>
            )}
          </fieldset>
        </form>
      </MarketFilterPanel>
      {(params.get("search") || params.get("rank") || params.get("region")) && (
        <section
          className="market-applied-filters"
          aria-label="Applied account filters"
        >
          <ul>
            {(["search", "rank", "region"] as const)
              .filter((key) => params.get(key))
              .map((key) => (
                <li key={key}>
                  {key === "search"
                    ? "Search"
                    : key === "rank"
                      ? "Rank"
                      : "Region"}
                  : {params.get(key)?.slice(0, 200)}
                </li>
              ))}
          </ul>
          <Link
            to={
              gameSlug
                ? base
                : params.get("slug")
                  ? "/accounts?slug=" +
                    encodeURIComponent(params.get("slug") ?? "")
                  : "/accounts"
            }
          >
            Clear all filters
          </Link>
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
          <div className="package-grid market-cards">
            {resource.data.items.map((row) => (
              <article className="catalog-section market-card" key={row.id}>
                {row.images[0] ? (
                  <AccountImage
                    key={row.images[0]}
                    src={row.images[0]}
                    title={`${row.product.title} — listing preview`}
                  />
                ) : (
                  <div className="account-image-placeholder">{row.game}</div>
                )}
                <p>
                  {row.game} · {row.product.region}
                </p>
                <CardHeading>
                  <Link
                    preventScrollReset
                    to={`${base}/${row.id}`}
                    state={{ market: query }}
                  >
                    {row.product.title}
                  </Link>
                </CardHeading>
                <p>{row.product.rank}</p>
                <p className="package-price">
                  {row.product.currency}{" "}
                  {minorDisplay(row.product.amount_minor)}
                </p>
                <Link
                  className="button compact"
                  preventScrollReset
                  to={`${base}/${row.id}`}
                  state={{ market: query }}
                >
                  Review account
                </Link>
              </article>
            ))}
          </div>
          {!resource.data.items.length && (
            <p>
              {["search", "region", "rank", "slug"].some((key) =>
                params.get(key)?.trim(),
              )
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
    if (review) reviewPanel.current?.focus();
    else if (previousReview.current)
      inspectionPanel.current
        ?.querySelector<HTMLButtonElement>("button")
        ?.focus();
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
      <p role="status">
        This account is {listing.state}.{" "}
        <Link preventScrollReset to={base}>
          Browse available accounts
        </Link>
        .
      </p>
    );
  if (!review)
    return (
      <section
        ref={inspectionPanel}
        className="catalog-section account-purchase"
      >
        <p>
          Review the exact account and transfer terms before reserving it.
          Viewing this listing does not reserve stock or create a payment.
        </p>
        <Action
          onClick={() => {
            step("review");
          }}
        >
          Review this account purchase
        </Action>
      </section>
    );
  return (
    <section
      ref={reviewPanel}
      tabIndex={-1}
      aria-label="Account purchase review"
      className="catalog-section account-purchase"
    >
      <Action
        disabled={busy}
        onClick={() => {
          step("");
        }}
      >
        Back to account listing
      </Action>
      <h3>{listing.product.title}</h3>
      <p>
        {listing.game} · {listing.product.region} · {listing.product.rank}
      </p>
      <p className="package-price">
        {listing.product.currency} {minorDisplay(listing.product.amount_minor)}
      </p>
      <p>
        One unique account. A reservation is confirmed only after the server
        accepts this request.
      </p>
      <details>
        <summary>Review the exact account and transfer terms</summary>
        <ProductTerms listing={listing} />
      </details>
      <ErrorNotice error={error ?? session.error} />
      {!!session.error && (
        <Action onClick={session.reload}>Check sign-in again</Action>
      )}
      {session.loading && <p role="status">Checking sign-in…</p>}
      {!session.data?.user || session.data.mfa_required ? (
        <Link
          to={`/login?returnTo=${encodeURIComponent(`${base}/${listing.id}?step=review`)}`}
        >
          Sign in to reserve this account
        </Link>
      ) : (
        <fieldset disabled={busy || session.loading}>
          <legend>Reserve this exact account</legend>
          <p>
            The next step opens this purchase in My account. Payment is required
            before delivery. Your reservation has a limited checkout window; the
            order page shows its expiry.
          </p>
          <a href="/terms" target="_blank" rel="noopener noreferrer">
            Read site terms in a new tab
          </a>
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
    navigation.market.length <= 2000
      ? navigation.market
      : "";
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
        to={base + (market ? "?" + new URLSearchParams(market).toString() : "")}
      >
        ← Account marketplace
      </Link>
      <Heading>
        {review ? "Review your account purchase" : "Account details"}
      </Heading>
      <Action disabled={resource.loading} onClick={resource.reload}>
        Refresh listing availability and terms
      </Action>
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
              <ProductTerms listing={resource.data} />
              <FavoriteButton
                kind="account"
                slug={resource.data.slug}
                pack={resource.data.id}
              />
              <details className="market-alerts">
                <summary>Availability notifications</summary>
                <AccountAlerts
                  slug={resource.data.slug}
                  listingID={resource.data.id}
                />
              </details>
              <div className="catalog-actions">
                <Link
                  to={`/games/${resource.data.slug}/reviews?service=account_sale`}
                >
                  Account purchase reviews
                </Link>
                <Link
                  to={`/support?listing=${encodeURIComponent(resource.data.id)}`}
                >
                  Ask about this account
                </Link>
              </div>
            </div>
            <RequestJourney>
              <Purchase
                key={resource.data.release_id}
                listing={resource.data}
                base={base}
              />
            </RequestJourney>
          </>
        )}
    </Container>
  );
}
