import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { LoadingImage } from "./loading-image";
import { ArtworkImage } from "../artwork/image";
it("preserves accessible alt and the frame while loading, forwards events, then resets for a different source", () => {
  const onLoad = vi.fn(),
    onError = vi.fn();
  const { rerender } = render(
    <ArtworkImage
      source="/catalog-assets/one.webp"
      alt="Accessible artwork"
      width={640}
      height={400}
      onLoad={onLoad}
      onError={onError}
    />,
  );
  expect(screen.getByRole("img")).toHaveAttribute("data-image-loading", "true");
  expect(screen.getByRole("img")).toHaveAttribute("alt", "Accessible artwork");
  fireEvent.load(screen.getByRole("img"));
  expect(onLoad).toHaveBeenCalledOnce();
  expect(screen.getByRole("img")).not.toHaveAttribute("data-image-loading");
  rerender(
    <ArtworkImage
      source="/catalog-assets/two.webp"
      alt="Another artwork"
      onError={onError}
    />,
  );
  expect(screen.getByRole("img")).toHaveAttribute("data-image-loading", "true");
  fireEvent.error(screen.getByRole("img"));
  expect(onError).toHaveBeenCalledOnce();
});
it("recognizes cached success without waiting for another load event and forwards refs", () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    "naturalWidth",
  );
  const complete = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    "complete",
  );
  try {
    Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", {
      configurable: true,
      get: () => 640,
    });
    Object.defineProperty(HTMLImageElement.prototype, "complete", {
      configurable: true,
      get: () => true,
    });
    const ref = vi.fn();
    render(<LoadingImage ref={ref} src="/cached.webp" alt="Cached image" />);
    expect(screen.getByRole("img")).not.toHaveAttribute("data-image-loading");
    expect(ref).toHaveBeenCalled();
  } finally {
    if (descriptor)
      Object.defineProperty(
        HTMLImageElement.prototype,
        "naturalWidth",
        descriptor,
      );
    if (complete)
      Object.defineProperty(HTMLImageElement.prototype, "complete", complete);
  }
});

it("reserves a product frame and keeps failed media text hidden while showing a clear fallback", () => {
  render(<LoadingImage frame src="/missing.webp" alt="Package artwork" />);
  const image = screen.getByRole("img");
  expect(image.parentElement).toHaveAttribute("data-image-state", "loading");
  fireEvent.error(image);
  expect(image).toHaveAttribute("data-image-loading", "true");
  expect(image.parentElement).toHaveAttribute("data-image-state", "failed");
  expect(screen.getByText("Artwork unavailable")).toBeInTheDocument();
});

it("keeps responsive source and image siblings inside a reserved product frame", () => {
  render(
    <ArtworkImage
      loadingFrame
      placement="card"
      source="/api/v1/artwork/11111111-1111-4111-8111-111111111111/wide"
      alt="Responsive product"
    />,
  );
  const image = screen.getByRole("img");
  expect(image.parentElement?.tagName).toBe("PICTURE");
  expect(image.parentElement?.querySelector("source")).toHaveAttribute(
    "srcset",
    "/api/v1/artwork/11111111-1111-4111-8111-111111111111/thumb",
  );
  expect(image.parentElement?.parentElement).toHaveClass("loading-image-frame");
});
