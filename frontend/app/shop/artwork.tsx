import { useState } from "react";
/** One bounded, failure-safe media presentation for released items and private previews. */
export default function ShopArtwork({
  source,
  alt,
  lazy = false,
}: {
  source: string;
  alt: string;
  lazy?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (
    !/^\/catalog-assets\/[a-z0-9][a-z0-9_-]{0,79}\.(png|jpg|webp|avif|svg)$/.test(
      source,
    ) ||
    failed === source
  )
    return (
      <div
        className="shop-artwork shop-artwork-unavailable"
        role="img"
        aria-label={
          alt ? `${alt} — artwork unavailable` : "Artwork unavailable"
        }
      >
        Artwork unavailable
      </div>
    );
  return (
    <img
      className="shop-artwork"
      src={source}
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
