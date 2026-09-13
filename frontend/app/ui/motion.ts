import { useSyncExternalStore } from "react";

const preferenceKey = "boosterplus.motion";
const preferenceEvent = "boosterplus-motion-change";
let temporaryPreference: boolean | undefined;

function readPreference() {
  if (temporaryPreference !== undefined) return temporaryPreference;
  try {
    return localStorage.getItem(preferenceKey) === "reduced";
  } catch {
    return false;
  }
}
function snapshot() {
  if (readPreference()) return "reduced";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "system-reduced"
    : "system-full";
}
function subscribe(notify: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  const storageChanged = (event: StorageEvent) => {
    if (event.key !== preferenceKey && event.key !== null) return;
    temporaryPreference = undefined;
    notify();
  };
  window.addEventListener("storage", storageChanged);
  window.addEventListener(preferenceEvent, notify);
  return () => {
    media.removeEventListener("change", notify);
    window.removeEventListener("storage", storageChanged);
    window.removeEventListener(preferenceEvent, notify);
  };
}
export function setMotionPreference(reduced: boolean) {
  temporaryPreference = reduced;
  try {
    if (reduced) localStorage.setItem(preferenceKey, "reduced");
    else localStorage.removeItem(preferenceKey);
    temporaryPreference = undefined;
  } catch {
    // A blocked storage API must not prevent an in-memory accessibility preference.
  }
  window.dispatchEvent(new Event(preferenceEvent));
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
