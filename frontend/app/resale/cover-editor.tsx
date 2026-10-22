import { useEffect, useState, useRef } from "react";
import { post } from "../identity/api";
import { z } from "../validation";
import { ErrorNotice, Ordering, Select, move } from "../catalog/controls";
import type { Product } from "./model";

export function ReviewedImage({ id, label }: { id: string; label: string }) {
  const [url, setURL] = useState(""),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!url) return;
    const timer = setTimeout(() => {
      setURL("");
    }, 45000);
    return () => {
      clearTimeout(timer);
    };
  }, [url]);
  async function preview() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await post(
        `/admin/media/${id}/grant`,
        {},
        z.object({
          url: z.string().startsWith(`/api/v1/admin/media/${id}/content?`),
        }),
      );
      setURL(result.url);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="reviewed-account-image">
      <button
        type="button"
        className="button"
        aria-disabled={busy}
        onClick={() => void preview()}
      >
        {busy
          ? "Preparing image…"
          : `${url ? "Refresh preview of" : "Preview"} ${label.toLowerCase()}`}
      </button>
      {url && (
        <img
          src={url}
          alt={label}
          onError={() => {
            setURL("");
            setError(
              new Error(
                "Image preview expired or could not load. Request it again.",
              ),
            );
          }}
        />
      )}
      <ErrorNotice error={error} />
    </div>
  );
}
// Staff uploads for PLAYORA-owned listings are previewed through the admin
// artwork route; they are never public until a listing release references them.
function UploadedImage({ id, label }: { id: string; label: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="reviewed-account-image">
      {failed ? (
        <p role="status">
          This image preview could not load. The image stays in the draft.
        </p>
      ) : (
        <img
          src={`/api/v1/admin/artwork/${id}/card`}
          alt={label}
          loading="lazy"
          onError={() => {
            setFailed(true);
          }}
        />
      )}
    </div>
  );
}
export default function CoverEditor({
  product,
  change,
  uploads = false,
}: {
  product: Product;
  change: (patch: Partial<Product>) => void;
  /** PLAYORA-owned listings use staff uploads instead of seller chat images. */
  uploads?: boolean;
}) {
  const cover = product.cover_media_id ?? "";
  const root = useRef<HTMLElement>(null);
  function focus(index: number) {
    requestAnimationFrame(() => {
      const target =
        root.current?.querySelector<HTMLElement>(
          `[data-reviewed-image="${String(index)}"]`,
        ) ?? root.current?.querySelector<HTMLSelectElement>("select");
      target?.focus();
    });
  }
  return (
    <section ref={root} className="account-cover-editor">
      <h3>Title image & gallery order</h3>
      <p>
        {uploads
          ? "Choose the cover shown on account cards. The gallery follows the order below, with the cover first."
          : "Select reviewed images below, then choose the cover shown on account cards. Removing the cover requires choosing a replacement before publication. The gallery follows the order below, with the cover first."}
      </p>
      <Select
        name="product.cover_media_id"
        label="Account title image"
        value={cover}
        options={[
          ["", "Choose a reviewed public image"],
          ...product.media_ids.map(
            (id, i) => [id, `Reviewed image ${String(i + 1)}`] as const,
          ),
          ...(cover && !product.media_ids.includes(cover)
            ? [
                [
                  cover,
                  "Previous cover unavailable · choose a replacement",
                ] as const,
              ]
            : []),
        ]}
        change={(cover_media_id) => {
          change({ cover_media_id });
        }}
      />
      {product.media_ids.length === 0 && (
        <p>
          {uploads
            ? "No images added yet. The account card will use a game placeholder until you add one."
            : "No images are selected. The account card will use a game placeholder until reviewed images are added."}
        </p>
      )}
      {product.media_ids.map((id, i) => (
        <fieldset
          key={id}
          className="catalog-item"
          data-reviewed-image={i}
          tabIndex={-1}
        >
          <legend>
            Reviewed image {i + 1}
            {cover === id ? " · Title image" : ""}
          </legend>
          {uploads ? (
            <UploadedImage id={id} label={`Reviewed image ${String(i + 1)}`} />
          ) : (
            <ReviewedImage id={id} label={`Reviewed image ${String(i + 1)}`} />
          )}
          <Ordering
            index={i}
            count={product.media_ids.length}
            change={(direction) => {
              change({ media_ids: move(product.media_ids, i, direction) });
              focus(i + direction);
            }}
            remove={() => {
              change({
                media_ids: product.media_ids.filter((value) => value !== id),
                ...(cover === id ? { cover_media_id: "" } : {}),
              });
              focus(Math.min(i, product.media_ids.length - 2));
            }}
          />
        </fieldset>
      ))}
    </section>
  );
}
