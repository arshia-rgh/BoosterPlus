import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import "./characters.css";
import SceneCharacter from "./scene-character";
import { scenes, sceneByKey, type SceneKey } from "./scene-catalog";
import { useCharacterMotion } from "./character-motion";
import { setMotionPreference, useMotionPreference } from "./motion";
export { viewportProgress } from "./character-motion";

const characters = [
  {
    key: "iori",
    game: "Mobile Legends",
    part: "M 444 497 C 425 583 335 659 306 792 C 346 765 395 722 458 651 L 500 533 Z",
  },
  {
    key: "illidan",
    game: "World of Warcraft",
    part: "M 672 0 L 1024 0 L 1024 812 L 901 850 L 817 724 L 706 612 L 671 357 Z",
  },
  {
    key: "ahri",
    game: "League of Legends",
    part: "M 718 51 L 1024 51 L 1024 539 L 856 488 L 702 462 L 690 291 Z",
  },
] as const;
export type CharacterKey = (typeof characters)[number]["key"];
export function CharacterArt({
  character,
  enabled,
}: {
  character: CharacterKey;
  enabled: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const root = useCharacterMotion(enabled && !failed);
  const uid = useId().replaceAll(":", "");
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
  if (failed) return <div className="character-fallback" aria-hidden="true" />;
  const source = `/characters/${character}-768.jpg`;
  return (
    <div
      ref={root}
      className="character-art"
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
  const [selected, setSelected] = useState<SceneKey>("miya");
  const [displayed, setDisplayed] = useState<SceneKey>("miya");
  const [previous, setPrevious] = useState<SceneKey | null>(null);
  const acceptScene = useCallback(
    (id: string) => {
      if (id !== selected || id === displayed) return;
      setPrevious(displayed);
      setDisplayed(selected);
    },
    [displayed, selected],
  );
  useEffect(() => {
    if (!previous) return;
    const timer = setTimeout(() => {
      setPrevious(null);
    }, 600);
    return () => {
      clearTimeout(timer);
    };
  }, [previous, displayed]);
  const layers = [
    ...new Set([...(previous ? [previous] : []), displayed, selected]),
  ];
  const stage = useRef<HTMLDivElement>(null);
  const anchorFrame = useRef(0);
  useEffect(
    () => () => {
      cancelAnimationFrame(anchorFrame.current);
    },
    [],
  );
  const [nearby, setNearby] = useState(false);
  const preference = useMotionPreference();
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    if (typeof IntersectionObserver !== "function") {
      const frame = requestAnimationFrame(() => {
        setNearby(true);
      });
      return () => {
        cancelAnimationFrame(frame);
      };
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNearby(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);
  return (
    <section
      className="world-showcase home-section"
      aria-labelledby="worlds-title"
      data-motion={enabled ? "full" : "reduced"}
      data-scene={displayed}
    >
      <div className="world-backdrops" aria-hidden="true">
        {nearby &&
          layers.map((id) => (
            <img
              key={id}
              src={`/scenes/${id}.jpg`}
              alt=""
              width="1024"
              height="683"
              className="world-backdrop"
              data-visible={id === displayed}
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
          ))}
      </div>
      <div className="world-copy">
        <h2 id="worlds-title">
          Find your <em>fighting spirit.</em>
        </h2>
        <p className="world-label" id="showcase-label">
          Game showcase
        </p>
        <div
          className="world-selector"
          role="group"
          aria-labelledby="showcase-label"
        >
          {scenes.map((value) => (
            <button
              key={value.id}
              type="button"
              aria-pressed={selected === value.id}
              onClick={() => {
                setSelected(value.id);
              }}
            >
              {value.game}
            </button>
          ))}
        </div>
      </div>
      <div
        className="world-stage"
        data-scene={displayed}
        aria-busy={selected !== displayed}
        ref={stage}
      >
        {nearby &&
          layers.map((id) => (
            <div
              key={id}
              className="scene-layer"
              data-visible={id === displayed}
            >
              <SceneCharacter
                scene={sceneByKey(id)}
                enabled={enabled}
                active={id === displayed}
                onReady={acceptScene}
              />
            </div>
          ))}
      </div>
      <div className="world-action">
        <button
          className="world-motion"
          type="button"
          disabled={preference === "system-reduced"}
          onClick={(event) => {
            const button = event.currentTarget;
            const top = button.getBoundingClientRect().top;
            setMotionPreference(enabled);
            cancelAnimationFrame(anchorFrame.current);
            // The rank scene above changes height with the shared preference.
            // Preserve this explicit control's viewport position after that layout.
            anchorFrame.current = requestAnimationFrame(() => {
              if (button.isConnected)
                window.scrollBy({
                  top: Math.round(button.getBoundingClientRect().top - top),
                  behavior: "instant",
                });
            });
          }}
        >
          {preference === "system-reduced"
            ? "System motion reduced"
            : enabled
              ? "Pause motion"
              : "Resume motion"}
        </button>
        <Link className="home-text-link" to="/games">
          Browse available games <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}
