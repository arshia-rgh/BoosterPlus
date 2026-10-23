import {
  useCallback,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import "./loading-image.css";
type Props = ComponentProps<"img"> & { frame?: boolean; sources?: ReactNode };
/** Decorative heroes keep their positioning; product media reserve a quiet frame. */
export function LoadingImage({
  ref,
  onLoad,
  onError,
  frame = false,
  sources,
  ...props
}: Props) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const ready = useCallback(
    (image: HTMLImageElement | null) => {
      if (image?.complete && image.currentSrc)
        setState(image.naturalWidth > 0 ? "ready" : "failed");
      else if (image?.complete && image.naturalWidth > 0) setState("ready");
      if (typeof ref === "function") return ref(image);
      if (ref) ref.current = image;
    },
    [ref],
  );
  const image = (
    <img
      {...props}
      alt={props.alt ?? ""}
      className={frame ? "loading-image-content" : props.className}
      ref={ready}
      data-image-loading={state !== "ready" ? "true" : undefined}
      onLoad={(event) => {
        setState("ready");
        onLoad?.(event);
      }}
      onError={(event) => {
        setState("failed");
        onError?.(event);
      }}
    />
  );
  const media = sources ? (
    <picture className="artwork-picture">
      {sources}
      {image}
    </picture>
  ) : (
    image
  );
  if (!frame) return media;
  return (
    <span
      className={`loading-image-frame ${props.className ?? ""}`}
      data-image-state={state}
    >
      {media}
      {state === "failed" && (
        <span className="loading-image-fallback" aria-hidden="true">
          Artwork unavailable
        </span>
      )}
    </span>
  );
}
