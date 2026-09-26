import { CursorPagination, filterQuery } from "../ui/list-navigation";
import GameCards from "./game-cards";
import {
  capabilitiesFor,
  selectedService,
  serviceAvailable,
  serviceNames,
  serviceLabel,
} from "./public-discovery";
import { AccountMarket } from "../resale/market";
import { Subscribe } from "../availability/pages";
import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLoaderData,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router";
import { FavoriteButton } from "../orders/favorites";
import DynamicForm from "./dynamic-form";
import "./discovery.css";
import { Select } from "./controls";
import { price, type Listing, type Release, type Package } from "./model";

export function offeringPath(params: URLSearchParams) {
  const value = params.get("path");
  return value === "custom" || value === "packages" ? value : "all";
}
function pathQuery(path: string) {
  return path === "all" ? "" : `?path=${path}`;
}
function PathPicker() {
  const [params, setParams] = useSearchParams();
  const current = offeringPath(params);
  return (
    <nav className="offering-paths" aria-label="Boosting type">
      {[
        ["all", "All boosting"],
        ["custom", "Custom boosting"],
        ["packages", "Fixed packages"],
      ].map(([key, label]) => (
        <button
          type="button"
          key={key}
          aria-pressed={key === current}
          onClick={() => {
            const next = filterQuery(params, {
              path: key === "all" ? null : (key ?? null),
            });
            next.set("service", "boost");
            setParams(next, { preventScrollReset: true });
          }}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
export function GameCatalog() {
  const listing = useLoaderData<Listing>();
  const [params] = useSearchParams();
  const path = offeringPath(params);
  const [search, setSearch] = useState("");
  const games = listing.games.filter((game) =>
    game.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <main id="main" className="page catalog-page">
      <div className="catalog-introduction">
        <div>
          <p className="eyebrow">THE LINEUP</p>
          <h1>Find your game.</h1>
        </div>
        <p>
          Choose a game to see its available services, current offers and latest
          information.
        </p>
      </div>
      <label className="game-search">
        Search this game list
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
          maxLength={100}
        />
      </label>
      <p role="status" className="quiet">
        {games.length} games in this view
        {listing.next ? " · More games on the next page" : ""}
      </p>
      {games.length ? (
        <GameCards games={games} intent={pathQuery(path)} headingLevel={2} />
      ) : (
        <section className="game-card">
          <h2>
            {listing.games.length
              ? "No games match your search"
              : "The lineup is being prepared"}
          </h2>
          <p>
            {listing.games.length
              ? "Try a different game name or clear your search."
              : "Published games and their available services will appear here."}
          </p>
          {search && (
            <button
              className="button"
              type="button"
              onClick={() => {
                setSearch("");
              }}
            >
              Clear search
            </button>
          )}
        </section>
      )}
      <CursorPagination
        next={listing.next}
        label="Game pages"
        nextLabel="Next games"
      />
    </main>
  );
}
export function GamePage() {
  const release = useLoaderData<Release>();
  const [params] = useSearchParams();
  const location = useLocation();
  const selected = selectedService(location.pathname, params);
  const capabilities = capabilitiesFor(release);
  const policy = capabilities.find((item) => item.service === selected);
  if (selected)
    return (
      <section className="game-panel">
        {policy?.state !== "active" ? (
          <section className="game-service-unavailable">
            <h2>{serviceLabel(selected)} is currently unavailable</h2>
            <p>
              {policy?.reason ||
                "This service is not accepting new requests. Your existing orders remain available in My account."}
            </p>
          </section>
        ) : selected === "accounts" ? (
          <AccountMarket gameSlug={release.slug} />
        ) : selected === "boost" ? (
          <>
            <h2>Boosting for {release.configuration.name}</h2>
            <p>
              A fixed package or a custom request. Choose the option that fits
              your goal.
            </p>
            <PathPicker />
            <Offerings release={release} path={offeringPath(params)} />
          </>
        ) : null}
      </section>
    );
  const offered = capabilities.filter((item) => item.state !== "off");
  return (
    <section
      className="game-panel game-services"
      aria-labelledby="choose-game-service"
    >
      <p className="eyebrow">YOUR NEXT MOVE</p>
      <h2 id="choose-game-service">Choose a service</h2>
      <p>
        Everything available for {release.configuration.name}, in one place.
      </p>
      <div className="game-service-grid">
        {offered.map((item) => {
          const body = (
            <>
              <span className="game-service-symbol" aria-hidden="true">
                {item.service === "boost" ? "↗" : "◇"}
              </span>
              <h3>{serviceNames[item.service]}</h3>
              <p>
                {item.description ||
                  (item.service === "boost"
                    ? "Explore fixed packages and custom goals with clear scope and private updates."
                    : "Browse reviewed accounts or submit your own for review.")}
              </p>
              {item.state === "paused" ? (
                <p className="status">
                  {item.reason || "Temporarily unavailable"}
                </p>
              ) : (
                <span className="service-card-action">
                  Explore {serviceNames[item.service].toLowerCase()} →
                </span>
              )}
            </>
          );
          return item.state === "active" ? (
            <Link
              preventScrollReset
              className="game-service-card"
              key={item.service}
              to={
                item.service === "accounts"
                  ? `/games/${release.slug}/accounts`
                  : `/games/${release.slug}?service=${item.service}`
              }
            >
              {body}
            </Link>
          ) : (
            <article className="game-service-card is-paused" key={item.service}>
              {body}
            </article>
          );
        })}
      </div>
      {!offered.length && <p>No services are published for this game yet.</p>}
      <Link preventScrollReset to={`/games/${release.slug}/reviews`}>
        Read customer reviews
      </Link>
    </section>
  );
}
export function Offerings({
  release,
  path = "all",
}: {
  release: Release;
  path?: string;
}) {
  const config = release.configuration;
  return (
    <>
      {path !== "packages" && (
        <section>
          <h2>Custom boosting</h2>
          {config.services.length === 0 && (
            <p>No custom boosting services are published yet.</p>
          )}
          <div className="catalog-cards">
            {config.services.map((service) => (
              <article className="game-card" key={service.key}>
                <span className="status">Built around you</span>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <p className="quiet">
                  Final price follows administrator review.
                </p>
                <Link
                  preventScrollReset
                  className="button"
                  to={`/games/${release.slug}/services/${service.key}`}
                >
                  Configure {service.name}
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
      {path !== "custom" && (
        <section>
          <h2>Fixed packages</h2>
          {config.packages.length === 0 && (
            <p>No fixed packages are published yet.</p>
          )}
          <div className="catalog-cards">
            {config.packages.map((pack) => (
              <article className="game-card" key={pack.key}>
                <span className="status">Fixed scope · fixed price</span>
                <h3>{pack.name}</h3>
                <p>{pack.description}</p>
                <ul>
                  {pack.variants.map((variant) => (
                    <li key={variant.key}>
                      {variant.name} · {price(variant)}
                      {variant.capacity === 0 ? " · Unavailable" : ""}
                    </li>
                  ))}
                </ul>
                <Link
                  preventScrollReset
                  className="button"
                  to={`/games/${release.slug}/packages/${pack.key}`}
                >
                  View {pack.name}
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
export function ServicePage() {
  const release = useLoaderData<Release>(),
    params = useParams();
  const service = release.configuration.services.find(
    (s) => s.key === params.service,
  );
  const [stage, setStage] = useState("estimate");
  const stepTitle = useRef<HTMLHeadingElement>(null);
  const previousStage = useRef(stage);
  useEffect(() => {
    if (previousStage.current !== stage) {
      previousStage.current = stage;
      stepTitle.current?.focus();
    }
  }, [stage]);
  if (!service) throw new Error("Catalog offering is unavailable");
  return (
    <section className="game-panel">
      <Link preventScrollReset to={`/games/${release.slug}?path=custom`}>
        ← {release.configuration.name}
      </Link>
      <p className="eyebrow">CUSTOM BOOSTING</p>
      <h2>{service.name}</h2>
      <FavoriteButton
        kind="service"
        slug={release.slug}
        service={service.key}
      />
      <p>{service.description}</p>
      <p>
        Custom pricing requires an administrator’s final quote. Select your
        options to check availability and request a provisional estimate.
      </p>
      <nav className="configuration-steps" aria-label="Configure your boost">
        <button
          type="button"
          aria-current={stage === "estimate" ? "step" : undefined}
          onClick={() => {
            setStage("estimate");
          }}
        >
          1. Your goal & estimate
        </button>
        <button
          type="button"
          aria-current={stage === "order" ? "step" : undefined}
          onClick={() => {
            setStage("order");
          }}
        >
          2. Review & request
        </button>
      </nav>
      <h2 ref={stepTitle} tabIndex={-1} className="configuration-step-title">
        {stage === "estimate"
          ? "1. Your goal & estimate"
          : "2. Review & request"}
      </h2>
      {stage === "order" && (
        <p>
          Review your choices and any order details below, then check selections
          to continue to your quote request. No order is created until you
          submit it.
        </p>
      )}
      <DynamicForm
        key={release.id + service.key}
        config={release.configuration}
        service={service}
        slug={release.slug}
        releaseID={release.id}
        stage={stage}
        paused={!serviceAvailable(release, "boost")}
      />
      {stage === "estimate" && (
        <button
          className="button"
          type="button"
          onClick={() => {
            setStage("order");
          }}
        >
          Continue to order information →
        </button>
      )}
    </section>
  );
}
function PackageDetails({
  release,
  pack,
}: {
  release: Release;
  pack: Package;
}) {
  const [params] = useSearchParams();
  const selected = params.get("variant");
  const [key, setKey] = useState(
    pack.variants.find((v) => v.key === selected)?.key ??
      pack.variants[0]?.key ??
      "",
  );
  const variant = pack.variants.find((v) => v.key === key),
    service = release.configuration.services.find(
      (s) => s.key === pack.service,
    );
  return (
    <>
      <p className="eyebrow">FIXED PACKAGE</p>
      <h2>{pack.name}</h2>
      <FavoriteButton kind="package" slug={release.slug} pack={pack.key} />
      <p>{pack.description}</p>
      <Select
        label="Package variant"
        value={key}
        change={setKey}
        options={pack.variants.map((v) => [v.key, `${v.name} · ${price(v)}`])}
      />
      {variant && (
        <section className="package-summary">
          <div className="package-overview">
            <span className="status">{variant.name}</span>
            <p className="package-price">{price(variant)}</p>
            <p>
              Delivery estimate: {variant.delivery_min_hours}–
              {variant.delivery_max_hours} hours after fulfillment can start.
            </p>
            <p>
              {variant.capacity === undefined
                ? "Available to order."
                : variant.capacity === 0
                  ? "Currently unavailable."
                  : "Availability is checked when you order."}{" "}
              Availability is not a reservation.
            </p>
            <p>
              Fixed packages use the price above and do not require individual
              quote approval. Payment is made directly after your agreement is
              saved.
            </p>
          </div>
          {variant.capacity !== undefined && (
            <Subscribe
              key={variant.key}
              slug={release.slug}
              pack={pack.key}
              variant={variant.key}
            />
          )}
          {service && (
            <DynamicForm
              key={release.id + pack.key + variant.key}
              config={release.configuration}
              service={service}
              slug={release.slug}
              releaseID={release.id}
              stage="order"
              initialCoupon={params.get("coupon")?.slice(0, 80) ?? ""}
              pack={pack.key}
              variant={variant}
              paused={!serviceAvailable(release, "boost")}
            />
          )}
        </section>
      )}
    </>
  );
}
export function PackagePage() {
  const release = useLoaderData<Release>(),
    params = useParams();
  const pack = release.configuration.packages.find(
    (p) => p.key === params.pack,
  );
  if (!pack) throw new Error("Catalog offering is unavailable");
  return (
    <section className="game-panel">
      <Link preventScrollReset to={`/games/${release.slug}?path=packages`}>
        ← {release.configuration.name}
      </Link>
      <PackageDetails
        key={release.id + pack.key}
        release={release}
        pack={pack}
      />
    </section>
  );
}
