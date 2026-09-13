import { useRef, useState } from "react";
import { Action } from "../catalog/controls";
import "./marketplace.css";
export function AccountImage({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="account-image-placeholder">Image unavailable</div>
  ) : (
    <img
      src={src}
      alt={title}
      width={720}
      height={480}
      loading="lazy"
      onError={() => {
        setFailed(true);
      }}
    />
  );
}
export default function AccountGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [index, setIndex] = useState(0),
    dialog = useRef<HTMLDialogElement>(null);
  const activeIndex = Math.min(index, images.length - 1);
  const src = images.at(activeIndex);
  if (!src)
    return (
      <p className="quiet">
        No public screenshots are included in this listing.
      </p>
    );
  return (
    <section className="account-gallery" aria-label="Account screenshots">
      <figure>
        <AccountImage
          key={src}
          src={src}
          title={`${title} — reviewed view ${String(activeIndex + 1)}`}
        />
        <figcaption>
          Reviewed screenshot {activeIndex + 1} of {images.length}
        </figcaption>
      </figure>
      <div className="gallery-controls">
        <div
          role="group"
          aria-label="Choose screenshot"
          className="gallery-thumbnails"
        >
          {images.map((image, i) => (
            <button
              type="button"
              key={image}
              aria-label={`View screenshot ${String(i + 1)}`}
              aria-pressed={i === activeIndex}
              onClick={() => {
                setIndex(i);
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button
          className="button compact"
          type="button"
          aria-haspopup="dialog"
          onClick={(event) => {
            // Safari does not focus a button on pointer click; establish the native dialog return target.
            event.currentTarget.focus();
            dialog.current?.showModal();
          }}
        >
          Enlarge screenshot
        </button>
      </div>
      <dialog
        ref={dialog}
        className="account-image-dialog"
        aria-label="Enlarged account screenshot"
      >
        <Action
          onClick={() => {
            dialog.current?.close();
          }}
        >
          Close screenshot
        </Action>
        <AccountImage
          key={src}
          src={src}
          title={`${title} — reviewed view ${String(activeIndex + 1)}`}
        />
      </dialog>
    </section>
  );
}
