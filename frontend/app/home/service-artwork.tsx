import { LoadingImage } from "../ui/loading-image";
import type { IntroductionKind } from "./introductions";

/** Decorative scenes accompany the selected service's equivalent written copy. */
export function ServiceArtwork({
  kind,
  className = "service-scene",
  peek = false,
}: {
  kind: IntroductionKind;
  className?: string;
  peek?: boolean;
}) {
  const source = `/artwork/service-scenes/${kind}-v1`;
  return (
    <LoadingImage
      key={kind}
      frame
      className={className}
      src={`${source}-800.webp`}
      srcSet={`${source}-480.webp 480w, ${source}-800.webp 800w, ${source}-1200.webp 1200w`}
      sizes={
        peek
          ? "64px"
          : "(max-width: 650px) calc(100vw - 32px), (max-width: 1000px) calc(100vw - 140px), 1120px"
      }
      width={1200}
      height={750}
      alt=""
      loading="lazy"
      decoding="async"
    />
  );
}
