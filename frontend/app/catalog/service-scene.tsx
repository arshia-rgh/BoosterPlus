import { LoadingImage } from "../ui/loading-image";
import { ArtworkImage } from "../artwork/image";
import type { Release } from "./model";
import type { ServiceKind } from "./public-discovery";

/** Game-specific approved artwork only; other games retain their own published image. */
export function ServiceScene({
  release,
  kind,
}: {
  release: Release;
  kind: ServiceKind;
}) {
  const mlbb = release.slug === "mobile-legends";
  return (
    <div className="game-service-art" aria-hidden="true">
      {mlbb ? (
        <>
          <LoadingImage
            className="game-service-art-base"
            src={`/artwork/mlbb-services/${kind}-v1-480.jpg`}
            alt=""
            loading="lazy"
          />
          <LoadingImage
            className="game-service-art-scene"
            src={`/artwork/mlbb-services/${kind}-v1-960.jpg`}
            srcSet={`/artwork/mlbb-services/${kind}-v1-480.jpg 480w, /artwork/mlbb-services/${kind}-v1-960.jpg 960w`}
            sizes="(max-width: 700px) calc(100vw - 32px), (max-width: 1440px) calc((100vw - 96px) / 2), 624px"
            width={960}
            height={640}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </>
      ) : release.configuration.asset ? (
        <ArtworkImage
          source={release.configuration.asset}
          placement="card"
          className="game-service-art-scene"
          alt=""
          loading="lazy"
        />
      ) : null}
    </div>
  );
}
