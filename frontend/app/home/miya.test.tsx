import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import MiyaArt from "./miya";

let images: {
  src: string;
  onload: (() => void) | null;
  onerror: (() => void) | null;
}[];
let visibility: IntersectionObserverCallback;
let disconnect: ReturnType<typeof vi.fn>;
beforeEach(() => {
  images = [];
  disconnect = vi.fn();
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      onload = null;
      onerror = null;
      constructor() {
        images.push(this);
      }
    },
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        visibility = callback;
      }
      observe = vi.fn();
      disconnect = disconnect;
    },
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function settle(failed?: string) {
  await act(async () => {
    images.forEach((image) => {
      if (image.src.includes(failed ?? "never")) image.onerror?.();
      else image.onload?.();
    });
    await Promise.resolve();
  });
}
it("keeps the poster still until all fields load; failures never block navigation", async () => {
  const view = render(<MiyaArt enabled />);
  expect(view.container.querySelector("animate")).toBeNull();
  await settle("hair-field");
  expect(view.container.querySelector("image")).not.toHaveAttribute("filter");
  expect(view.container.querySelector(".character-fallback")).toBeNull();
  const image = view.container.querySelector("image");
  if (!image) throw new Error("Missing poster");
  fireEvent.error(image);
  expect(view.container.querySelector(".character-fallback")).not.toBeNull();
});
it("starts only when visible, freezes the SVG clock offscreen and on cleanup", async () => {
  const view = render(<MiyaArt enabled />);
  await settle();
  const svg = view.container.querySelector("svg");
  if (!svg) throw new Error("Missing rig");
  const pause = vi.fn(),
    resume = vi.fn(),
    begin = vi.fn();
  Object.defineProperties(svg, {
    pauseAnimations: { value: pause },
    unpauseAnimations: { value: resume },
  });
  svg.querySelectorAll("animate").forEach((animation) => {
    Object.defineProperty(animation, "beginElement", { value: begin });
  });
  expect(begin).not.toHaveBeenCalled();
  act(() => {
    visibility(
      [{ isIntersecting: true }] as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    );
  });
  await waitFor(() => {
    expect(resume).toHaveBeenCalledOnce();
  });
  expect(begin).toHaveBeenCalledTimes(2);
  act(() => {
    visibility(
      [{ isIntersecting: false }] as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    );
  });
  expect(pause).toHaveBeenCalledOnce();
  act(() => {
    visibility(
      [{ isIntersecting: true }] as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    );
  });
  await waitFor(() => {
    expect(resume).toHaveBeenCalledTimes(2);
  });
  expect(begin).toHaveBeenCalledTimes(2);
  vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange"));
  expect(view.container.querySelector(".miya-art")).toHaveAttribute(
    "data-active",
    "false",
  );
  expect(pause).toHaveBeenCalledTimes(2);
  view.unmount();
  expect(pause).toHaveBeenCalledTimes(3);
  expect(disconnect).toHaveBeenCalledOnce();
});
it("reduced motion removes deformation and stale asset callbacks are detached", async () => {
  const view = render(<MiyaArt enabled />);
  await settle();
  expect(view.container.querySelectorAll("animate")).toHaveLength(2);
  view.rerender(<MiyaArt enabled={false} />);
  expect(view.container.querySelector("animate")).toBeNull();
  expect(view.container.querySelector("image")).not.toHaveAttribute("filter");
  view.unmount();
  expect(images.every((image) => !image.onload && !image.onerror)).toBe(true);
});
it("a missing poster resolves to a quiet decorative fallback", async () => {
  const view = render(<MiyaArt enabled />);
  await settle("miya-768");
  expect(view.container.querySelector(".character-fallback")).not.toBeNull();
  expect(view.container.querySelector("svg")).toBeNull();
});
