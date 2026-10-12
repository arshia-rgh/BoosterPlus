import { ArtworkImage } from "../artwork/image";
import { validArtwork } from "../artwork/model";
import { useCallback, useState } from "react";
/** One bounded, failure-safe media presentation for released items and private previews. */
export default function ShopArtwork({
  source,
  alt,
  lazy = false,
  placement = "content",
  className = "",
}: {
  source: string;
  alt: string;
  lazy?: boolean;
  placement?: "card" | "content";
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const ready = useCallback(
    (image: HTMLImageElement | null) => {
      if (image?.complete && image.naturalWidth === 0) setFailed(source);
    },
    [source],
  );
  if (!validArtwork(source) || failed === source)
    return (
      <div
        className={`shop-artwork shop-artwork-unavailable ${className}`}
        data-placement={placement}
        role="img"
        aria-label={
          alt ? `${alt} — artwork unavailable` : "Artwork unavailable"
        }
      >
        Artwork unavailable
      </div>
    );
  return (
    <ArtworkImage
      ref={ready}
      className={`shop-artwork ${className}`}
      source={source}
      placement={placement}
      data-placement={placement}
      alt={alt}
      width="640"
      height="400"
      loading={lazy ? "lazy" : "eager"}
      onError={() => {
        setFailed(source);
      }}
    />
  );
}
