import { useId, useRef, useState } from "react";
import type { HomeContent } from "../site/model";
import { introductionKinds, reviewedIntroduction } from "./introductions";
import { ServiceArtwork } from "./service-artwork";
import "./service-explorer.css";

export function ServiceExplorer({
  content,
  chooseGame,
}: {
  content: HomeContent;
  chooseGame: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const [direction, setDirection] = useState("next");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const kind = introductionKinds.at(selected) ?? "boost";
  const section = reviewedIntroduction(content, kind);
  const adjacent = (offset: number) =>
    (selected + offset + introductionKinds.length) % introductionKinds.length;
  function select(index: number, keyboard = false) {
    setDirection(index < selected ? "previous" : "next");
    setSelected(index);
    if (keyboard) tabs.current.at(index)?.focus();
  }
  return (
    <section
      className="home-content-width service-explorer"
      aria-labelledby={`${id}-title`}
    >
      <div className="explorer-heading">
        <div>
          <p className="home-kicker">FIND YOUR NEXT MOVE</p>
          <h2 id={`${id}-title`}>Your game. More possibilities.</h2>
        </div>
        <p>Five ways to make it yours.</p>
      </div>
      <div
        className="explorer-tabs"
        role="tablist"
        aria-label="Explore PLAYORA services"
      >
        {introductionKinds.map((item, index) => (
          <button
            key={item}
            ref={(node) => {
              tabs.current.splice(index, 1, node);
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${item}`}
            aria-selected={selected === index}
            aria-controls={`${id}-panel`}
            tabIndex={selected === index ? 0 : -1}
            onClick={() => {
              select(index);
            }}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? adjacent(1)
                  : event.key === "ArrowLeft"
                    ? adjacent(-1)
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? introductionKinds.length - 1
                        : null;
              if (next !== null) {
                event.preventDefault();
                select(next, true);
              }
            }}
          >
            <span aria-hidden="true">0{index + 1}</span>
            {reviewedIntroduction(content, item).label}
          </button>
        ))}
      </div>
      <div className="explorer-controls">
        <span aria-live="polite" aria-atomic="true">
          {selected + 1} / 5 · {section.label}
        </span>
        <div>
          <button
            type="button"
            aria-label="Previous service"
            onClick={() => {
              select(adjacent(-1));
            }}
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Next service"
            onClick={() => {
              select(adjacent(1));
            }}
          >
            →
          </button>
        </div>
      </div>
      <div className="explorer-stage">
        <button
          type="button"
          className="explorer-peek peek-previous"
          aria-label={`Explore ${reviewedIntroduction(content, introductionKinds.at(adjacent(-1)) ?? "boost").label}`}
          onClick={() => {
            select(adjacent(-1));
          }}
        >
          <ServiceArtwork
            kind={introductionKinds.at(adjacent(-1)) ?? "boost"}
            className="peek-scene"
            peek
          />
          <span>
            {
              reviewedIntroduction(
                content,
                introductionKinds.at(adjacent(-1)) ?? "boost",
              ).label
            }
          </span>
        </button>
        <div
          role="tabpanel"
          id={`${id}-panel`}
          aria-labelledby={`${id}-tab-${kind}`}
          tabIndex={0}
          className="explorer-panel"
        >
          <div
            className={`service-introduction introduction-${kind} explorer-content`}
            key={kind}
            data-direction={direction}
          >
            <ServiceArtwork kind={kind} className="scene-backdrop" />
            <ServiceArtwork kind={kind} />
            <span className="scene-counter" aria-hidden="true">
              0{selected + 1} / 05
            </span>
            <div className="service-introduction-copy">
              <p className="home-kicker">
                0{selected + 1} / {section.label}
              </p>
              <h3>{section.title}</h3>
              <p>{section.description}</p>
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
          </div>
        </div>
        <button
          type="button"
          className="explorer-peek peek-next"
          aria-label={`Explore ${reviewedIntroduction(content, introductionKinds.at(adjacent(1)) ?? "boost").label}`}
          onClick={() => {
            select(adjacent(1));
          }}
        >
          <ServiceArtwork
            kind={introductionKinds.at(adjacent(1)) ?? "boost"}
            className="peek-scene"
            peek
          />
          <span>
            {
              reviewedIntroduction(
                content,
                introductionKinds.at(adjacent(1)) ?? "boost",
              ).label
            }
          </span>
        </button>
      </div>
    </section>
  );
}
