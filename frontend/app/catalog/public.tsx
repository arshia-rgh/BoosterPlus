import { Subscribe } from "../availability/pages";
import { useState } from "react";
import { Link, useLoaderData, useParams, useSearchParams } from "react-router";
import { FavoriteButton } from "../orders/favorites";
import DynamicForm from "./dynamic-form";
import { Select } from "./controls";
import { price, type Listing, type Release, type Package } from "./model";

export function GameCatalog() {
  const listing = useLoaderData<Listing>();
  return (
    <main id="main" className="page catalog-page">
      <div className="catalog-introduction">
        <div>
          <p className="eyebrow">THE LINEUP</p>
          <h1>
            Choose your game.
            <br />
            Shape your climb.
          </h1>
        </div>
        <p>
          A boost built around your goals. Explore custom requests and fixed
          packages, with a clear scope and a conversation with our team.
        </p>
      </div>
      <ol className="catalog-route-map">
        <li>
          <strong>01 · Find your game</strong>Explore the published lineup.
        </li>
        <li>
          <strong>02 · Choose your path</strong>A custom request or a fixed
          package.
        </li>
        <li>
          <strong>03 · Stay in the loop</strong>Private updates, chat and proof.
        </li>
      </ol>
      {listing.games.length === 0 ? (
        <section className="game-card">
          <span className="status">Coming soon</span>
          <h2>Mobile Legends</h2>
          <p>
            We’re verifying our first catalog. Prices and availability will
            appear when services are published.
          </p>
        </section>
      ) : (
        <div className="catalog-cards">
          {listing.games.map((game) => (
            <article className="game-card" key={game.id}>
              {!game.asset && (
                <span className="game-letter" aria-hidden="true">
                  {game.name.slice(0, 1)}
                </span>
              )}
              {game.asset && (
                <img
                  src={game.asset}
                  alt={game.asset_alt}
                  width="640"
                  height="360"
                  loading="lazy"
                  decoding="async"
                />
              )}
              <span className="status">
                {game.paused ? "Ordering paused" : "Published catalog"}
              </span>
              <h2>
                <Link to={`/games/${game.slug}`}>{game.name}</Link>
              </h2>
              <p>{game.description}</p>
              <Link className="button" to={`/games/${game.slug}`}>
                Explore services
              </Link>
            </article>
          ))}
        </div>
      )}
      {listing.next && (
        <Link
          className="button"
          to={`/games?after=${encodeURIComponent(listing.next)}`}
        >
          Next games
        </Link>
      )}
      <p className="quiet">
        Submit a custom request or choose a fixed package. Crypto checkout is
        being prepared.
      </p>
    </main>
  );
}
function Intro({ release }: { release: Release }) {
  return (
    <>
      <p className="eyebrow">GAME BOOSTING</p>
      <h1>{release.configuration.name}</h1>
      <p className="intro">{release.configuration.description}</p>
      {release.paused && (
        <p className="status">Ordering is paused for this game.</p>
      )}
    </>
  );
}
export function GamePage() {
  const release = useLoaderData<Release>();
  return (
    <main id="main" className="page catalog-page">
      <Link to="/games">← All games</Link>
      <div className="game-hero">
        <div>
          <Intro release={release} />
        </div>
        {release.configuration.asset ? (
          <img
            src={release.configuration.asset}
            alt={release.configuration.asset_alt}
            width="640"
            height="400"
          />
        ) : (
          <div className="game-hero-art" aria-hidden="true">
            <span>{release.configuration.name.slice(0, 1)}</span>
          </div>
        )}
      </div>
      <FavoriteButton kind="game" slug={release.slug} />
      <Offerings release={release} />
      <Link to={`/games/${release.slug}/reviews`}>
        Read verified customer reviews
      </Link>
    </main>
  );
}
export function Offerings({ release }: { release: Release }) {
  const config = release.configuration;
  return (
    <>
      <section>
        <h2>Custom boosting</h2>
        <div className="catalog-cards">
          {config.services.map((service) => (
            <article className="game-card" key={service.key}>
              <span className="status">Built around you</span>
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <p className="quiet">Final price follows administrator review.</p>
              <Link
                className="button"
                to={`/games/${release.slug}/services/${service.key}`}
              >
                Configure {service.name}
              </Link>
            </article>
          ))}
        </div>
      </section>
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
                className="button"
                to={`/games/${release.slug}/packages/${pack.key}`}
              >
                View {pack.name}
              </Link>
            </article>
          ))}
        </div>
      </section>
      {config.faqs.length > 0 && (
        <section>
          <h2>Frequently asked questions</h2>
          {config.faqs.map((faq, i) => (
            <details className="catalog-section" key={i}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
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
  if (!service) throw new Error("Catalog offering is unavailable");
  return (
    <main id="main" className="page catalog-page">
      <Link to={`/games/${release.slug}`}>← {release.configuration.name}</Link>
      <p className="eyebrow">CUSTOM BOOSTING</p>
      <h1>{service.name}</h1>
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
      <Select
        label="Information to preview"
        value={stage}
        change={setStage}
        options={[
          ["estimate", "Estimate selections"],
          ["order", "Order information"],
        ]}
      />
      <DynamicForm
        key={release.id + service.key}
        config={release.configuration}
        service={service}
        slug={release.slug}
        releaseID={release.id}
        stage={stage}
        paused={release.paused}
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
    </main>
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
      <h1>{pack.name}</h1>
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
                ? "No configured capacity limit."
                : `Configured capacity: ${String(variant.capacity)} places. Held reservations may reduce availability.`}{" "}
              Availability is not a reservation.
            </p>
            <p>
              Fixed packages do not require an individual quote approval. Direct
              crypto checkout is being prepared.
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
              pack={pack.key}
              variant={variant}
              paused={release.paused}
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
    <main id="main" className="page catalog-page">
      <Link to={`/games/${release.slug}`}>← {release.configuration.name}</Link>
      <PackageDetails
        key={release.id + pack.key}
        release={release}
        pack={pack}
      />
    </main>
  );
}
