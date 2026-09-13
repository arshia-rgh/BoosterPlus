import { afterEach, expect, it, vi } from "vitest";
import { bindScrollProgress } from "./motion";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("coalesces native scrolling, resumes at the current position and disposes pending work", () => {
  let queued: FrameRequestCallback | undefined;
  let top = 0;
  let hidden = false;
  const request = vi.fn((callback: FrameRequestCallback) => {
    queued = callback;
    return 7;
  });
  const cancel = vi.fn();
  vi.stubGlobal("requestAnimationFrame", request);
  vi.stubGlobal("cancelAnimationFrame", cancel);
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  const element = document.createElement("section");
  vi.spyOn(element, "getBoundingClientRect").mockImplementation(
    () => ({ top, height: window.innerHeight + 1000 }) as DOMRect,
  );
  const apply = vi.fn();
  const dispose = bindScrollProgress(element, apply);
  expect(apply).toHaveBeenLastCalledWith(0);
  top = -500;
  window.dispatchEvent(new Event("scroll"));
  window.dispatchEvent(new Event("scroll"));
  expect(request).toHaveBeenCalledTimes(1);
  queued?.(0);
  expect(apply).toHaveBeenLastCalledWith(0.5);
  window.dispatchEvent(new Event("resize"));
  hidden = true;
  document.dispatchEvent(new Event("visibilitychange"));
  expect(cancel).toHaveBeenCalledWith(7);
  const count = apply.mock.calls.length;
  queued?.(0);
  expect(apply).toHaveBeenCalledTimes(count);
  top = -250;
  hidden = false;
  document.dispatchEvent(new Event("visibilitychange"));
  queued?.(0);
  expect(apply).toHaveBeenLastCalledWith(0.25);
  dispose();
  const requests = request.mock.calls.length;
  window.dispatchEvent(new Event("scroll"));
  window.dispatchEvent(new Event("pageshow"));
  expect(request).toHaveBeenCalledTimes(requests);
});
