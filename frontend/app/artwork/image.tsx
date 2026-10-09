import { type ComponentProps } from "react";
import { useInRouterContext, useLocation } from "../portal-router";
import { rendition, uploadedArtwork } from "./model";
import "./artwork.css";
/** Bundled paths retain their exact rendering; uploads use finite checked derivatives. */
type Props = Omit<ComponentProps<"img">, "src" | "srcSet"> & {
  source: string;
  placement?: "hero" | "card" | "content" | "background";
};
export function ArtworkImage(props: Props) {
  const inRouter = useInRouterContext();
  return inRouter ? (
    <RoutedArtwork {...props} />
  ) : (
    <RenderedArtwork {...props} preview={false} />
  );
}
function RoutedArtwork(props: Props) {
  const { pathname } = useLocation();
  return (
    <RenderedArtwork {...props} preview={pathname.startsWith("/admin/")} />
  );
}
function RenderedArtwork({
  source,
  placement = "content",
  preview,
  alt = "",
  ...props
}: Props & { preview: boolean }) {
  if (!uploadedArtwork(source))
    return <img {...props} alt={alt} src={source} />;
  const main =
    placement === "card"
      ? "card"
      : placement === "background"
        ? "wide-small"
        : "wide";
  return (
    <picture className="artwork-picture">
      {placement === "hero" && (
        <>
          <source
            media="(max-width: 600px) and (max-resolution: 1.49dppx)"
            srcSet={rendition(source, "mobile-small", preview)}
          />
          <source
            media="(max-width: 600px)"
            srcSet={rendition(source, "mobile", preview)}
          />
        </>
      )}
      {placement === "card" ? (
        <source
          media="(max-width: 380px) and (max-resolution: 1.49dppx)"
          srcSet={rendition(source, "thumb", preview)}
        />
      ) : (
        <source
          media="(max-width: 800px)"
          srcSet={rendition(source, "wide-small", preview)}
        />
      )}
      <img {...props} alt={alt} src={rendition(source, main, preview)} />
    </picture>
  );
}
