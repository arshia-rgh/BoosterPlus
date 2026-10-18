import { useEffect, useRef, useState } from "react";
import { post } from "../identity/api";
import { z } from "../validation";
import { ErrorNotice } from "../catalog/controls";
import AccountGallery from "./gallery";
import { AccountCard, ProductTerms } from "./account-presentation";
import type { PublicListing } from "./model";

/** Uses the same gallery/card presentation but only short-lived staff grants. */
export default function ListingPreview({
  listing,
}: {
  listing: PublicListing;
}) {
  const [images, setImages] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const gallery = useRef<HTMLDivElement>(null),
    loadButton = useRef<HTMLButtonElement>(null),
    restoreExpiredFocus = useRef(false);
  const ids = listing.product.media_ids,
    cover = listing.product.cover_media_id ?? "",
    ordered =
      cover && ids.includes(cover)
        ? [cover, ...ids.filter((id) => id !== cover)]
        : ids;
  useEffect(() => {
    if (!images.length) {
      if (
        restoreExpiredFocus.current &&
        document.activeElement === document.body
      )
        loadButton.current?.focus();
      restoreExpiredFocus.current = false;
      return;
    }
    const timer = setTimeout(() => {
      restoreExpiredFocus.current = !!gallery.current?.contains(
        document.activeElement,
      );
      setImages([]);
    }, 45000);
    return () => {
      clearTimeout(timer);
    };
  }, [images]);
  async function load() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const grants = await Promise.all(
        ordered.map((id) =>
          post(
            `/admin/media/${id}/grant`,
            {},
            z.object({
              url: z.string().startsWith(`/api/v1/admin/media/${id}/content?`),
            }),
          ),
        ),
      );
      setImages(grants.map((grant) => grant.url));
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  const coverURL = cover ? images[0] : undefined;
  return (
    <section aria-label="Private staff listing preview">
      <h3>Customer preview · private draft</h3>
      <p>
        Review the cover and gallery order before publication. Preview images
        require staff access and expire after 45 seconds; loading them does not
        publish this listing.
      </p>
      {!!ids.length && (
        <button
          ref={loadButton}
          type="button"
          className="button"
          aria-disabled={busy}
          onClick={() => void load()}
        >
          {busy
            ? "Loading private previews…"
            : images.length
              ? "Refresh private preview images"
              : "Load private preview images"}
        </button>
      )}
      <ErrorNotice error={error} />
      {!!ids.length && !cover && (
        <p role="alert">
          Choose an account title image before publication. The gallery below
          keeps its selected order.
        </p>
      )}
      <div className="account-card-grid private-account-card-preview">
        <AccountCard
          listing={listing}
          heading="h4"
          preview
          previewImage={coverURL}
        />
      </div>
      <ProductTerms
        listing={{ ...listing, images }}
        gallery={
          <div ref={gallery}>
            {ids.length && !images.length ? (
              <p>
                Load the private preview images above to check the selected
                gallery.
              </p>
            ) : (
              <AccountGallery images={images} title={listing.product.title} />
            )}
          </div>
        }
      />
    </section>
  );
}
