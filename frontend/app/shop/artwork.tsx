import { RegionBadge } from "./region-badge";
import { ArtworkImage } from "../artwork/image";
import { validArtwork } from "../artwork/model";
import { useState } from "react";
/** One bounded, failure-safe media presentation for released items and private previews. */
export default function ShopArtwork({
  source,
  alt,
  lazy = false,
  placement = "content",
  className = "",
  regions,
}: {
  source: string;
  alt: string;
  lazy?: boolean;
  placement?: "card" | "content";
  className?: string;
  regions?: string[];
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const content =
    !validArtwork(source) || failed === source ? (
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
    ) : (
      <ArtworkImage
        className={`shop-artwork ${className}`}
        source={source}
        loadingFrame
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
  return regions ? (
    <div className="shop-artwork-frame" data-placement={placement}>
      {content}
      <RegionBadge values={regions} />
    </div>
  ) : (
    content
  );
}
