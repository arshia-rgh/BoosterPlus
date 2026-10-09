import { useCallback } from "react";
import { Link } from "../portal-router";
import { defaultHome } from "../site/content";
import type { HomeContent } from "../site/model";
import type { Listing } from "../catalog/model";
import GameCards from "../catalog/game-cards";
import PublicMetrics from "../catalog/public-metrics";
import { metricsSchema } from "../catalog/public-discovery";
import { useResource } from "../orders/resource";
import { useMotionPreference, useSectionReveals } from "./motion";
import { introductionKinds, reviewedIntroduction } from "./introductions";
import { ServiceSymbol } from "./service-symbol";
import ReviewCarousel from "./review-carousel";
import "./home.css";

export type HomeData = HomeContent & { catalog?: Listing | null };
export function HomePage({
  loaderData = defaultHome,
}: { loaderData?: HomeData } = {}) {
  const content = loaderData;
  const preference = useMotionPreference();
  const enabled = preference === "system-full";
  const root = useSectionReveals(enabled);
  const statistics = useResource("/site/metrics", metricsSchema);
  const catalog = content.catalog;
  const chooseGame = useCallback(() => {
    const target = document.getElementById("game-selection-title");
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({
      behavior: enabled ? "smooth" : "instant",
      block: "start",
    });
  }, [enabled]);
  return (
    <main
      ref={root}
      id="main"
      className="plus-home discovery-home"
      data-motion={enabled ? "full" : "reduced"}
    >
      <section className="ascend-hero" aria-labelledby="hero-title">
        {content.artwork === "ascension" && (
          <picture className="hero-art">
            <source
              media="(max-width: 700px)"
              srcSet="/artwork/ascension-768.jpg"
            />
            <img
              src="/artwork/ascension-1536.jpg"
              width="1536"
              height="1024"
              alt=""
              fetchPriority="high"
            />
          </picture>
        )}
        <div className="hero-veil" aria-hidden="true" />
        <div className="hero-content">
          <p className="home-kicker">MANY WORLDS. ONE PLAYORA.</p>
          <h1 id="hero-title">
            {content.headline}
            <br />
            <em>{content.accent}</em>
          </h1>
          <p className="hero-description">{content.description}</p>
          <p className="hero-scroll">
            Scroll to explore <span aria-hidden="true">↓</span>
          </p>
        </div>
      </section>
      <div className="home-content-width home-activity">
        <PublicMetrics
          metrics={statistics.data?.metrics ?? []}
          loading={statistics.loading}
          failed={!!statistics.error}
          retry={statistics.reload}
        />
      </div>
      {introductionKinds.map((kind, index) => {
        const section = reviewedIntroduction(content, kind);
        return (
          <section
            className={`home-content-width service-introduction introduction-${kind}`}
            key={kind}
            aria-labelledby={`introduction-${kind}`}
          >
            <div className="service-introduction-copy">
              <p className="home-kicker">
                0{index + 1} / {section.label}
              </p>
              <h2 id={`introduction-${kind}`}>{section.title}</h2>
              <p>{section.description}</p>
              {(kind === "shop" || kind === "news") && (
                <p className="service-availability-note">
                  Being prepared. Availability will be shown on each game page.
                </p>
              )}
              <a
                className="home-button"
                href="#game-selection"
                onClick={(event) => {
                  event.preventDefault();
                  chooseGame();
                }}
              >
                Choose your game <span aria-hidden="true">↘</span>
              </a>
            </div>
            <div className="service-visual">
              <ServiceSymbol kind={kind} />
              <p className="service-caption">{section.caption}</p>
              {section.features.map(([title, body], i) => (
                <article className="service-feature" key={title}>
                  <span aria-hidden="true">0{i + 1}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
      <ReviewCarousel />
      <section
        className="home-content-width home-faq"
        aria-labelledby="faq-title"
      >
        <div>
          <p className="home-kicker">A LITTLE CLARITY</p>
          <h2 id="faq-title">Before you jump in.</h2>
          <p>Have a different question?</p>
          <Link className="home-text-link" to="/support">
            Talk to our team ↗
          </Link>
          {content.support_hours && <p>{content.support_hours}</p>}
        </div>
        <div>
          {content.faqs.map((faq, index) => (
            <details key={index}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section
        id="game-selection"
        className="home-content-width game-destination"
        aria-labelledby="game-selection-title"
      >
        <div className="home-section-heading">
          <div>
            <p className="home-kicker">CHOOSE YOUR WORLD</p>
            <h2 id="game-selection-title" tabIndex={-1}>
              Every game.
              <br />
              <em>A new possibility.</em>
            </h2>
          </div>
          <p>
            Pick your game to see what’s available.
            <br />
            Services vary by game.
          </p>
        </div>
        {catalog ? (
          catalog.games.length ? (
            <GameCards games={catalog.games} />
          ) : (
            <div className="discovery-empty">
              <h3>No published games yet</h3>
              <p>
                Games will appear here when their services are ready. Our team
                can help with questions.
              </p>
              <Link to="/support">Contact support</Link>
            </div>
          )
        ) : (
          <div className="discovery-empty">
            <h3>We couldn’t load the games</h3>
            <p>
              Try the game directory again. No order or payment has been
              created.
            </p>
            <Link className="button" to="/games">
              Try the game directory
            </Link>
          </div>
        )}
        {catalog?.next && (
          <Link
            className="home-text-link"
            to={`/games?after=${encodeURIComponent(catalog.next)}`}
          >
            More published games ↗
          </Link>
        )}
        {content.notice && (
          <p className="home-catalog-notice">{content.notice}</p>
        )}
      </section>
    </main>
  );
}
