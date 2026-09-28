import { cardArtwork } from "./artwork";
import { useCallback, useState } from "react";
import { Link } from "react-router";
import { defaultHeroLayout, type Listing } from "./model";
import { serviceNames } from "./public-discovery";
import "./artwork-framing.css";
import "./public-discovery.css";

function GameCard({
  game,
  intent,
  headingLevel,
}: {
  game: Listing["games"][number];
  intent: string;
  headingLevel: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const [failed, setFailed] = useState(false);
  const imageRef = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  }, []);
  const framing = game.hero_layout ?? defaultHeroLayout;
  const capabilities = game.capabilities ?? [
    {
      service: "boost" as const,
      state: "active" as const,
      description: "",
      reason: "",
    },
  ];
  const offered = capabilities.filter(
    (item) =>
      (item.service === "boost" ||
        item.service === "accounts" ||
        item.service === "shop") &&
      item.state !== "off",
  );
  const paused =
    game.paused || !offered.some((item) => item.state === "active");
  const body = (
    <>
      {game.asset && !failed ? (
        <img
          className="game-card-art"
          ref={imageRef}
          src={cardArtwork(game.asset)}
          alt=""
          width="640"
          height="400"
          loading="lazy"
          decoding="async"
          onError={() => {
            setFailed(true);
          }}
        />
      ) : (
        <span className="game-card-initial" aria-hidden="true">
          {game.name.slice(0, 1)}
        </span>
      )}
      <div className="game-card-identity">
        <Heading>{game.name}</Heading>
        <div className="game-capabilities">
          {offered.map((item) => (
            <span key={item.service}>
              {serviceNames[item.service]}
              {item.state === "paused" ? " · paused" : ""}
            </span>
          ))}
        </div>
        {paused && <p>Services currently unavailable</p>}
      </div>
      {!paused && (
        <span className="game-card-arrow" aria-hidden="true">
          ↗
        </span>
      )}
    </>
  );
  const frame = {
    "data-art-desktop-x": framing.desktop_x,
    "data-art-desktop-y": framing.desktop_y,
    "data-art-mobile-x": framing.mobile_x,
    "data-art-mobile-y": framing.mobile_y,
  };
  return paused ? (
    <article className="discovery-game-card is-paused" {...frame}>
      {body}
    </article>
  ) : (
    <Link
      className="discovery-game-card"
      {...frame}
      to={`/games/${game.slug}${intent}`}
    >
      {body}
    </Link>
  );
}
export default function GameCards({
  games,
  intent = "",
  headingLevel = 3,
}: {
  games: Listing["games"];
  intent?: string;
  headingLevel?: 2 | 3;
}) {
  return (
    <div className="discovery-game-grid">
      {games.map((game) => (
        <GameCard
          key={game.id + game.asset}
          game={game}
          intent={intent}
          headingLevel={headingLevel}
        />
      ))}
    </div>
  );
}
