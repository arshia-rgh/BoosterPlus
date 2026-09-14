import { useEffect, useRef } from "react";

export function viewportProgress(
  top: number,
  height: number,
  viewport: number,
) {
  return Math.min(
    1,
    Math.max(0, (viewport - top) / Math.max(1, height + viewport)),
  );
}

// The SVG clock and CSS layers share one visibility lifecycle. The only RAF is
// scheduled by scroll/resize; SMIL owns idle timing, without a JS render loop.
export function useCharacterMotion(enabled: boolean, travel = 28) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element || !enabled || typeof IntersectionObserver !== "function")
      return;
    const svg = element.querySelector("svg");
    let visible = false,
      frame = 0,
      started = false;
    const sync = () => {
      frame = 0;
      const active = visible && !document.hidden;
      element.dataset.active = String(active);
      if (active) {
        if (!started) {
          svg?.querySelectorAll("animate").forEach((animation) => {
            // Unsupported SVG animation leaves the scale=0 static illustration.
            if (typeof animation.beginElement === "function")
              animation.beginElement();
          });
          started = true;
        }
        if (typeof svg?.unpauseAnimations === "function")
          svg.unpauseAnimations();
        const rect = element.getBoundingClientRect();
        const progress = viewportProgress(rect.top, rect.height, innerHeight);
        element.style.setProperty(
          "--character-travel",
          `${String((progress - 0.5) * travel)}px`,
        );
        element.style.setProperty(
          "--character-turn",
          `${String((progress - 0.5) * (travel === 28 ? 2 : 0))}deg`,
        );
        element.dataset.progress = String(Math.round(progress * 100));
      } else if (typeof svg?.pauseAnimations === "function")
        svg.pauseAnimations();
    };
    const schedule = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        sync();
      } else if (!frame) frame = requestAnimationFrame(sync);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      // Stop immediately on exit, before scheduling any future visible frame.
      if (!visible) {
        cancelAnimationFrame(frame);
        sync();
      } else schedule();
    });
    observer.observe(element);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("pageshow", schedule);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      if (typeof svg?.pauseAnimations === "function") svg.pauseAnimations();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pageshow", schedule);
      document.removeEventListener("visibilitychange", schedule);
      delete element.dataset.active;
      delete element.dataset.progress;
      element.style.removeProperty("--character-travel");
      element.style.removeProperty("--character-turn");
    };
  }, [enabled, travel]);
  return root;
}
