import {
  useCallback,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import {
  isRouteErrorResponse,
  Link,
  useLocation,
  useParams,
  useRouteError,
  useSearchParams,
  useRevalidator,
} from "react-router";
import { GameDiscovery } from "./game-discovery";
import { selectedService } from "./public-discovery";
import { FavoriteButton } from "../orders/favorites";
import { useMotionPreference } from "../ui/motion";
import { defaultHeroLayout, type Release } from "./model";
import "./game-shell.css";
import "./artwork-framing.css";

export function GameShell({
  release,
  children,
}: {
  release: Release;
  children: ReactNode;
}) {
  const [failedSource, setFailedSource] = useState("");
  const source = release.configuration.asset;
  const hero = release.configuration.hero_layout ?? defaultHeroLayout;
  const hasArt = !!source && source !== failedSource;
  const artworkRef = useCallback(
    (image: HTMLImageElement | null) => {
      // A failed SSR image can finish before React attaches its error handler.
      if (image?.complete && image.naturalWidth === 0) setFailedSource(source);
    },
    [source],
  );
  const motion = useMotionPreference();
  const [query] = useSearchParams();
  const { pathname } = useLocation();
  const requested = query.get("path");
  const localContent = useRef<HTMLDivElement>(null);
  const focusPath =
    pathname +
    ":" +
    (query.get("service") ?? "") +
    ":" +
    (query.get("path") ?? "");
  const previousPath = useRef(focusPath);
  useEffect(() => {
    if (previousPath.current === focusPath) return;
    previousPath.current = focusPath;
    const heading = localContent.current?.querySelector<HTMLElement>("h2");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({
        block: "nearest",
        behavior: motion === "system-full" ? "smooth" : "instant",
      });
    }
  }, [focusPath, motion]);
  const path = pathname.includes("/services/")
    ? "custom"
    : pathname.includes("/packages/")
      ? "packages"
      : requested === "custom" || requested === "packages"
        ? requested
        : "all";
  return (
    <main
      id="main"
      className="page catalog-page game-shell"
      data-copy-side={hero.copy_side}
      data-art-desktop-x={hero.desktop_x}
      data-art-desktop-y={hero.desktop_y}
      data-art-mobile-x={hero.mobile_x}
      data-art-mobile-y={hero.mobile_y}
      data-motion={motion === "system-full" ? "full" : "reduced"}
    >
      {hasArt && (
        <div className="game-backdrop" aria-hidden="true">
          <img src={source} alt="" />
          <div />
        </div>
      )}
      <header className={`game-stage ${hasArt ? "" : "game-stage-compact"}`}>
        {hasArt && (
          <img
            ref={artworkRef}
            className="game-stage-art"
            src={source}
            alt={release.configuration.asset_alt}
            width="1440"
            height="720"
            onError={() => {
              setFailedSource(source);
            }}
          />
        )}
        <div className="game-stage-copy">
          <Link
            className="context-back"
            to={`/games${path === "all" ? "" : `?path=${path}`}`}
          >
            ← All games
          </Link>

          <p className="eyebrow">YOUR GAME. YOUR NEXT CHAPTER.</p>
          <h1>{release.configuration.name}</h1>
          <p>{release.configuration.description}</p>
          {release.paused && (
            <p className="status">Ordering is paused for this game.</p>
          )}
          <FavoriteButton
            key={release.slug}
            kind="game"
            slug={release.slug}
            gameLabel
          />
        </div>
      </header>
      <GameDiscovery
        release={release}
        selected={selectedService(pathname, query)}
      />
      <div ref={localContent} className="game-local-content">
        {children}
      </div>
      {release.configuration.faqs.length > 0 && (
        <section className="game-faq" aria-labelledby="game-faq-title">
          <h2 id="game-faq-title">
            Questions about {release.configuration.name}
          </h2>
          {release.configuration.faqs.map((faq, i) => (
            <details key={i}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </section>
      )}
    </main>
  );
}

export function GameContentError() {
  const error = useRouteError();
  const { slug } = useParams();
  const retry = useRevalidator();
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return (
    <section
      className="game-content-error"
      aria-labelledby="game-content-error-title"
    >
      <h2 id="game-content-error-title">
        {missing ? "This option is unavailable" : "This section could not load"}
      </h2>
      <p>
        {missing
          ? "It may have been changed or removed. Your game's other published services are still available."
          : "Please try again. No order or payment has been created by opening this page."}
      </p>
      {!missing && (
        <button
          className="button"
          type="button"
          disabled={retry.state === "loading"}
          onClick={(event) => {
            const section = event.currentTarget.closest(".game-local-content");
            void retry.revalidate().then(() => {
              requestAnimationFrame(() => {
                if (!section?.isConnected) return;
                const heading = section.querySelector<HTMLElement>("h2");
                if (heading) {
                  heading.tabIndex = -1;
                  heading.focus({ preventScroll: true });
                }
              });
            });
          }}
        >
          {retry.state === "loading"
            ? "Loading section…"
            : "Retry this section"}
        </button>
      )}
      <Link
        preventScrollReset
        className="button"
        to={`/games/${encodeURIComponent(slug ?? "")}`}
      >
        Back to game services
      </Link>
    </section>
  );
}

export function GameUnavailable() {
  const error = useRouteError();
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main id="main" className="page catalog-page">
      <title>
        {missing
          ? "Game unavailable | PLAYORA"
          : "Game temporarily unavailable | PLAYORA"}
      </title>
      <p className="eyebrow">PLAYORA games</p>
      <h1>{missing ? "Game unavailable" : "We couldn't load this game"}</h1>
      <p>
        {missing
          ? "This game may have been removed or is not published yet."
          : "Please try again shortly. Your existing orders remain available in My account."}
      </p>
      <Link className="button" to="/games">
        Choose another game
      </Link>
    </main>
  );
}
