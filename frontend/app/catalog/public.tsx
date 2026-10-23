import { isPlaceholderGame } from "./placeholder";
import { ListFilters } from "../ui/list-filters";
import { PackageContents } from "./package-scope";
import ShopArtwork from "../shop/artwork";
import { ArtworkImage } from "../artwork/image";
import { ServiceIcon } from "../ui/service-icon";
import { GameShop } from "../shop/public";
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
} from "../portal-router";
import { FavoriteButton } from "../orders/favorites";
import DynamicForm from "./dynamic-form";
import RequestJourney from "../orders/request-recovery";
import "./discovery.css";
import { Select } from "./controls";
import {
  price,
  type Listing,
  type Release,
  type Package,
  type Service,
} from "./model";

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
    <ListFilters
      title="Boosting filters"
      values={{ path: current }}
      defaults={{ path: "all" }}
      fields={[
        {
          key: "path",
          label: "Boosting type",
          options: [
            ["all", "All boosting"],
            ["custom", "Custom boosting"],
            ["packages", "Fixed packages"],
          ],
        },
      ]}
      apply={(values) => {
        const next = filterQuery(params, {
          path: values.path === "all" ? null : (values.path ?? null),
        });
        next.set("service", "boost");
        setParams(next, { preventScrollReset: true });
      }}
    />
  );
}

export function GameCatalog() {
  const listing = useLoaderData<Listing>();
  const [params] = useSearchParams();
  const path = offeringPath(params);
  const [search, setSearch] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const clearSearch = () => {
    setSearch("");
    searchInput.current?.focus();
  };
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
          ref={searchInput}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
          maxLength={100}
        />
      </label>
      {search && (
        <div className="list-filter-chips">
          <button
            className="list-filter-chip"
            type="button"
            aria-label={`Remove search filter: ${search}`}
            onClick={clearSearch}
          >
            <span>Search: {search}</span>
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
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
            <button className="button" type="button" onClick={clearSearch}>
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
        ) : selected === "shop" ? (
          <GameShop />
        ) : selected === "news" ? (
          <Link className="button" to={`/games/${release.slug}/news`}>
            Read news & guides
          </Link>
        ) : (
          <>
            <h2>Boosting for {release.configuration.name}</h2>
            <p>
              A fixed package or a custom request. Choose the option that fits
              your goal.
            </p>
            <PathPicker />
            <Offerings release={release} path={offeringPath(params)} />
          </>
        )}
      </section>
    );
  const offered = capabilities.filter((item) => item.state !== "off");
  if (isPlaceholderGame(release)) {
    return (
      <section
        className="game-panel game-services"
        aria-labelledby="game-services-coming"
      >
        <h2 id="game-services-coming">Services are not available yet</h2>

        <Link className="button secondary" to="/games">
          Browse all games
        </Link>
      </section>
    );
  }
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
                <ServiceIcon kind={item.service} />
              </span>
              <h3>{serviceNames[item.service]}</h3>
              <p>
                {item.description ||
                  (item.service === "boost"
                    ? "Explore fixed packages and custom goals with clear scope and private updates."
                    : item.service === "news"
                      ? "Read staff-written updates, patch notes and guides."
                      : item.service === "shop"
                        ? "Browse in-game items with clear terms and staff delivery."
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
                item.service === "accounts" ||
                item.service === "shop" ||
                item.service === "news"
                  ? `/games/${release.slug}/${item.service}`
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
      {path !== "custom" && (
        <section>
          <h2>Fixed packages</h2>
          {config.packages.length === 0 && (
            <p>No fixed packages are published yet.</p>
          )}
          <div className="catalog-cards service-tiles package-tiles">
            {config.packages.map((pack) => (
              <article className="game-card" key={pack.key}>
                <ShopArtwork
                  className="package-card-artwork"
                  source={pack.asset || config.asset}
                  alt={pack.asset ? (pack.asset_alt ?? "") : config.asset_alt}
                  placement="card"
                  lazy
                />
                <span className="status">Fixed scope · fixed price</span>
                <h3>{pack.name}</h3>
                <ul className="package-card-prices">
                  {pack.variants.map((variant) => (
                    <li key={variant.key}>
                      <strong className="package-card-price">
                        {price(variant)}
                      </strong>
                      <span>
                        {variant.name}
                        {variant.preset_answers === undefined
                          ? " · Being reviewed"
                          : variant.capacity === 0
                            ? " · Unavailable"
                            : ""}
                      </span>
                      <small>
                        {variant.delivery_min_hours}–
                        {variant.delivery_max_hours} hours after payment and
                        access are ready
                      </small>
                    </li>
                  ))}
                </ul>
                <p className="package-card-excerpt">{pack.description}</p>
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
    </>
  );
}
export function ServicePage() {
  const release = useLoaderData<Release>(),
    params = useParams();
  const service = release.configuration.services.find(
    (s) => s.key === params.service,
  );
  if (!service) throw new Error("Catalog offering is unavailable");
  return (
    <ServiceDetails
      key={release.id + ":" + service.key}
      release={release}
      service={service}
    />
  );
}
function ServiceDetails({
  release,
  service,
}: {
  release: Release;
  service: Service;
}) {
  const [query, setQuery] = useSearchParams();
  const [reviewed, setReviewed] = useState(false);
  const stage =
    query.get("step") === "review" && reviewed ? "order" : "estimate";
  function setStage(next: "estimate" | "order") {
    const params = new URLSearchParams(query);
    if (next === "order") {
      setReviewed(true);
      params.set("step", "review");
    } else params.delete("step");
    setQuery(params, { preventScrollReset: true });
  }
  const stepTitle = useRef<HTMLHeadingElement>(null);
  const previousStage = useRef(stage);
  useEffect(() => {
    if (previousStage.current !== stage) {
      previousStage.current = stage;
      stepTitle.current?.focus();
    }
  }, [stage]);
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
      <ol className="configuration-steps" aria-label="Configure your boost">
        <li aria-current={stage === "estimate" ? "step" : undefined}>
          1. Your goal & estimate
        </li>
        <li aria-current={stage === "order" ? "step" : undefined}>
          2. Review & request
        </li>
      </ol>
      {query.get("step") === "review" && !reviewed && (
        <p role="status">
          Check your restored choices. Private details and consent need to be
          entered again.
        </p>
      )}
      <h2
        ref={stepTitle}
        tabIndex={-1}
        className="configuration-step-title sr-only"
      >
        {stage === "estimate"
          ? "1. Your goal & estimate"
          : "2. Review & request"}
      </h2>
      {stage === "order" && (
        <p>
          Add the order details below. Nothing is charged yet; we confirm the
          final price before payment.
        </p>
      )}
      <RequestJourney>
        <DynamicForm
          key={release.id + service.key}
          config={release.configuration}
          service={service}
          slug={release.slug}
          releaseID={release.id}
          stage={stage}
          initialCoupon={query.get("coupon")?.slice(0, 40) ?? ""}
          journey={{
            review: () => {
              setStage("order");
            },
            invalidate: () => {
              setReviewed(false);
            },
            edit: () => {
              setStage("estimate");
            },
          }}
          paused={!serviceAvailable(release, "boost")}
        />
      </RequestJourney>
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
  const [params, setParams] = useSearchParams();
  const selected = params.get("variant");
  const key =
    (selected === null
      ? pack.variants[0]?.key
      : pack.variants.find((v) => v.key === selected)?.key) ?? "";
  function setKey(value: string) {
    const next = new URLSearchParams(params);
    next.set("variant", value);
    setParams(next, { preventScrollReset: true });
  }
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
      {pack.asset && (
        <ArtworkImage
          className="package-detail-artwork"
          source={pack.asset}
          alt={pack.asset_alt ?? ""}
          loading="lazy"
        />
      )}
      <Select
        label="Package variant"
        value={key}
        change={setKey}
        options={[
          ["", "Choose a package variant"],
          ...pack.variants.map(
            (v) => [v.key, `${v.name} · ${price(v)}`] as const,
          ),
        ]}
      />
      {!variant && (
        <p role="status">
          This package variant is unavailable. Choose a current variant and
          review its price before continuing.
        </p>
      )}
      {variant && (
        <section className="package-summary">
          <div className="package-overview">
            <span className="status">{variant.name}</span>
            <p className="package-price">{price(variant)}</p>
            <dl className="package-delivery">
              <div>
                <dt>Delivery</dt>
                <dd>
                  {variant.delivery_min_hours}–{variant.delivery_max_hours}{" "}
                  hours
                </dd>
              </div>
            </dl>
            <p className="package-delivery-note">
              Elapsed calendar hours from verified payment and ready delivery
              information and access.
            </p>
            <p>
              {variant.preset_answers === undefined
                ? "This offer is being reviewed. New orders are not yet available."
                : variant.capacity === undefined
                  ? "Available to order."
                  : variant.capacity === 0
                    ? "Currently unavailable."
                    : "Availability is checked when you order."}{" "}
              Availability is not a reservation.
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
          {service && variant.preset_answers !== undefined && (
            <PackageContents
              config={release.configuration}
              service={service}
              variant={variant}
              customHref={
                release.configuration.services.some(
                  (candidate) => candidate.key === service.key,
                )
                  ? `/games/${release.slug}/services/${service.key}`
                  : undefined
              }
            />
          )}
          {service && variant.preset_answers !== undefined && (
            <DynamicForm
              key={release.id + pack.key + variant.key}
              config={release.configuration}
              service={service}
              slug={release.slug}
              releaseID={release.id}
              stage="order"
              initialCoupon={params.get("coupon")?.slice(0, 40) ?? ""}
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
      <RequestJourney>
        <PackageDetails
          key={release.id + pack.key}
          release={release}
          pack={pack}
        />
      </RequestJourney>
    </section>
  );
}
