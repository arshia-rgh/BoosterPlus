import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import "./characters.css";

const characters = [
  {
    key: "iori",
    game: "Mobile Legends",
    name: "Iori Yagami · Chou",
    detail: "The fighter. The flame. Your next chapter.",
    part: "M 444 497 C 425 583 335 659 306 792 C 346 765 395 722 458 651 L 500 533 Z",
  },
  {
    key: "illidan",
    game: "World of Warcraft",
    name: "Illidan Stormrage",
    detail: "A world worth venturing into.",
    part: "M 672 0 L 1024 0 L 1024 812 L 901 850 L 817 724 L 706 612 L 671 357 Z",
  },
  {
    key: "ahri",
    game: "League of Legends",
    name: "Ahri",
    detail: "A little magic. A different possibility.",
    part: "M 718 51 L 1024 51 L 1024 539 L 856 488 L 702 462 L 690 291 Z",
  },
] as const;
export type CharacterKey = (typeof characters)[number]["key"];
export function viewportProgress(
  top: number,
  height: number,
  viewport: number,
) {
  return Math.min(
    1,
    Math.max(0, (viewport - top) / Math.max(1, height + viewport)),
  );
}
export function CharacterArt({
  character,
  enabled,
  hero = false,
}: {
  character: CharacterKey;
  enabled: boolean;
  hero?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const uid = useId().replaceAll(":", "");
  const [failed, setFailed] = useState(false);
  const item =
    characters.find((value) => value.key === character) ?? characters[0];
  useEffect(() => {
    // SVG image error events differ across engines; check the same cached source
    // with an HTML image so a failed decorative asset always falls back safely.
    let active = true;
    const image = new Image();
    image.onerror = () => {
      if (active) setFailed(true);
    };
    image.src = `/characters/${character}-768.jpg`;
    return () => {
      active = false;
      image.onerror = null;
    };
  }, [character]);
  useEffect(() => {
    const element = root.current;
    if (
      !element ||
      !enabled ||
      failed ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    let visible = false,
      frame = 0;
    const sync = () => {
      frame = 0;
      const active = visible && !document.hidden;
      element.dataset.active = String(active);
      if (!active) return;
      const rect = element.getBoundingClientRect();
      const progress = viewportProgress(rect.top, rect.height, innerHeight);
      element.style.setProperty(
        "--character-travel",
        `${String((progress - 0.5) * 28)}px`,
      );
      element.style.setProperty(
        "--character-turn",
        `${String((progress - 0.5) * 2)}deg`,
      );
      element.dataset.progress = String(Math.round(progress * 100));
    };
    const schedule = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        sync();
      } else if (!frame) frame = requestAnimationFrame(sync);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      schedule();
    });
    observer.observe(element);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("pageshow", schedule);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pageshow", schedule);
      document.removeEventListener("visibilitychange", schedule);
      delete element.dataset.active;
      delete element.dataset.progress;
      element.style.removeProperty("--character-travel");
      element.style.removeProperty("--character-turn");
    };
  }, [enabled, failed]);
  if (failed)
    return (
      <div
        className={`character-fallback ${hero ? "character-hero" : ""}`}
        aria-hidden="true"
      />
    );
  const source = `/characters/${character}-768.jpg`;
  return (
    <div
      ref={root}
      className={`character-art ${hero ? "character-hero" : ""}`}
      data-motion={enabled ? "full" : "reduced"}
      data-character={character}
      aria-hidden="true"
    >
      <div className="character-aura" />
      <svg viewBox="0 0 1024 1536" focusable="false" className="character-rig">
        <defs>
          <filter id={`${uid}-alpha`} colorInterpolationFilters="sRGB">
            <feColorMatrix
              in="SourceGraphic"
              type="luminanceToAlpha"
              result="luminance"
            />
            <feComponentTransfer in="luminance" result="silhouette">
              <feFuncA type="linear" slope="255" />
            </feComponentTransfer>
            <feComposite in="SourceGraphic" in2="silhouette" operator="in" />
          </filter>
          <clipPath id={`${uid}-upper`}>
            <rect width="1024" height="798" />
          </clipPath>
          <clipPath id={`${uid}-lower`}>
            <rect y="790" width="1024" height="746" />
          </clipPath>
          <clipPath id={`${uid}-part`}>
            <path d={item.part} />
          </clipPath>
          <mask
            id={`${uid}-body`}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="1024"
            height="1536"
          >
            <rect width="1024" height="1536" fill="white" />
            <path d={item.part} fill="black" />
          </mask>
        </defs>
        <g filter={`url(#${uid}-alpha)`}>
          <g mask={`url(#${uid}-body)`}>
            <image
              href={source}
              width="1024"
              height="1536"
              clipPath={`url(#${uid}-lower)`}
              onError={() => {
                setFailed(true);
              }}
            />
            <g className="character-breath">
              <image
                href={source}
                width="1024"
                height="1536"
                clipPath={`url(#${uid}-upper)`}
              />
            </g>
          </g>
          <g className="character-cloth">
            <image
              href={source}
              width="1024"
              height="1536"
              clipPath={`url(#${uid}-part)`}
            />
          </g>
        </g>
      </svg>
      <div className="character-motes">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
export default function CharacterShowcase({ enabled }: { enabled: boolean }) {
  const [selected, setSelected] = useState<CharacterKey>("iori");
  const item =
    characters.find((value) => value.key === selected) ?? characters[0];
  return (
    <section
      className="world-showcase home-section"
      aria-labelledby="worlds-title"
    >
      <div className="world-copy">
        <p className="home-kicker">DIFFERENT WORLDS. YOUR NEXT CHAPTER.</p>
        <h2 id="worlds-title">
          Find your <em>fighting spirit.</em>
        </h2>
        <p>
          From the Land of Dawn to Azeroth and the Rift. A little inspiration
          from the games you love.
        </p>
        <div
          className="world-selector"
          role="group"
          aria-label="Character showcase"
        >
          {characters.map((value) => (
            <button
              key={value.key}
              type="button"
              aria-pressed={selected === value.key}
              onClick={() => {
                setSelected(value.key);
              }}
            >
              {value.game}
            </button>
          ))}
        </div>
        <div className="world-caption" aria-live="polite">
          <h3>{item.name}</h3>
          <p>{item.detail}</p>
        </div>
        <Link className="home-button" to="/games">
          Explore published services ↗
        </Link>
        <p className="scene-disclaimer">
          Character art is illustrative. Services are available only for games
          in our published catalog.
        </p>
      </div>
      <div className="world-stage">
        <CharacterArt key={selected} character={selected} enabled={enabled} />
      </div>
    </section>
  );
}
