import { useSyncExternalStore } from "react";

// Motion follows the device setting; obsolete saved website overrides are ignored.
function snapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "system-reduced"
    : "system-full";
}
function subscribe(notify: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => {
    media.removeEventListener("change", notify);
  };
}
export function useMotionPreference() {
  return useSyncExternalStore(subscribe, snapshot, () => "system-reduced");
}

export function sceneProgress(top: number, height: number, viewport: number) {
  return Math.min(1, Math.max(0, -top / Math.max(1, height - viewport)));
}

// Native scroll owns progress. Consumers decide their keyframes; the binding
// schedules at most one frame and releases every observer/listener on disposal.
export function bindScrollProgress(
  element: HTMLElement,
  apply: (progress: number) => void,
) {
  let frame = 0;
  const update = () => {
    frame = 0;
    if (document.hidden) return;
    const rect = element.getBoundingClientRect();
    apply(sceneProgress(rect.top, rect.height, window.innerHeight));
  };
  const schedule = () => {
    if (!frame && !document.hidden) frame = requestAnimationFrame(update);
  };
  const visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else schedule();
  };
  const resize =
    typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
  resize?.observe(element);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("pageshow", schedule);
  document.addEventListener("visibilitychange", visibility);
  update();
  return () => {
    cancelAnimationFrame(frame);
    resize?.disconnect();
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    window.removeEventListener("pageshow", schedule);
    document.removeEventListener("visibilitychange", visibility);
  };
}
