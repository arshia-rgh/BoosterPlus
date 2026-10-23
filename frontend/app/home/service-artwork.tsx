import { LoadingImage } from "../ui/loading-image";
import type { IntroductionKind } from "./introductions";

/** Decorative scenes accompany the selected service's equivalent written copy. */
export function ServiceArtwork({ kind }: { kind: IntroductionKind }) {
  const source = `/artwork/service-scenes/${kind}-v1`;
  return (
    <LoadingImage
      key={kind}
      frame
      className="service-scene"
      src={`${source}-800.webp`}
      srcSet={`${source}-480.webp 480w, ${source}-800.webp 800w, ${source}-1200.webp 1200w`}
      sizes="(max-width: 600px) calc(100vw - 80px), (max-width: 900px) calc((100vw - 112px) / 2), 480px"
      width={1200}
      height={750}
      alt=""
      loading="lazy"
      decoding="async"
    />
  );
}
