import { useEffect, useRef } from "react";
import { bindScrollProgress } from "../ui/motion";
export {
  sceneProgress,
  setMotionPreference,
  useMotionPreference,
} from "../ui/motion";

// A paused Web Animation is scrubbed by native scroll position. No animation
// loop runs between scroll/resize events, and CSS remains the no-JS fallback.
export function useRankScene(enabled: boolean) {
  const scene = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = scene.current;
    if (!element || !enabled || typeof Element.prototype.animate !== "function")
      return;
    const animations: Animation[] = [];
    const animate = (selector: string, frames: Keyframe[]) => {
      const target = element.querySelector(selector);
      if (!target) return;
      const animation = target.animate(frames, {
        duration: 1000,
        fill: "both",
        easing: "linear",
      });
      animation.pause();
      animations.push(animation);
    };
    try {
      animate(".rank-character", [
        { transform: "translate(35px, 28px) scale(.9)", opacity: 0.1 },
        { transform: "translate(-12px, -16px) scale(1.04)", opacity: 0.4 },
      ]);
      animate(".rank-start", [
        { opacity: 1, offset: 0 },
        { opacity: 1, offset: 0.4 },
        { opacity: 0, offset: 0.7 },
        { opacity: 0, offset: 1 },
      ]);
      animate(".rank-finish", [
        { opacity: 0, offset: 0 },
        { opacity: 0, offset: 0.4 },
        { opacity: 1, offset: 0.8 },
        { opacity: 1, offset: 1 },
      ]);
      animate(".rank-start .rank-label", [
        { opacity: 1, offset: 0 },
        { opacity: 1, offset: 0.4 },
        { opacity: 0, offset: 0.52 },
        { opacity: 0, offset: 1 },
      ]);
      animate(".rank-finish .rank-label", [
        { opacity: 0, offset: 0 },
        { opacity: 0, offset: 0.52 },
        { opacity: 1, offset: 0.7 },
        { opacity: 1, offset: 1 },
      ]);
      animate(".profile-stage", [
        { transform: "translateY(54px) scale(.9)", opacity: 0.25, offset: 0 },
        { transform: "translateY(0) scale(1)", opacity: 1, offset: 0.2 },
        { transform: "translateY(0) scale(1)", opacity: 1, offset: 1 },
      ]);
      animate(".rank-shimmer", [
        { transform: "translateX(-120%)", opacity: 0, offset: 0 },
        { transform: "translateX(-120%)", opacity: 0, offset: 0.55 },
        { transform: "translateX(0%)", opacity: 0.45, offset: 0.7 },
        { transform: "translateX(120%)", opacity: 0, offset: 0.85 },
        { transform: "translateX(120%)", opacity: 0, offset: 1 },
      ]);
      animate(".rank-sparks", [
        { opacity: 0, transform: "scale(.8)", offset: 0 },
        { opacity: 0, transform: "scale(.8)", offset: 0.6 },
        { opacity: 0.8, offset: 0.8 },
        { opacity: 0, transform: "scale(1.1)", offset: 1 },
      ]);
      animate(".rank-orbit", [
        { transform: "rotate(-25deg) scale(.85)", opacity: 0.2 },
        { transform: "rotate(25deg) scale(1.08)", opacity: 0.65 },
      ]);
      animate(".journey-fill", [
        { transform: "scaleX(0)" },
        { transform: "scaleX(1)" },
      ]);
    } catch {
      animations.forEach((animation) => {
        animation.cancel();
      });
      return;
    }
    element.dataset.enhanced = "true";
    const dispose = bindScrollProgress(element, (progress) => {
      animations.forEach((animation) => {
        animation.currentTime = progress * 1000;
      });
      element.dataset.progress = String(Math.round(progress * 100));
    });
    return () => {
      dispose();
      animations.forEach((animation) => {
        animation.cancel();
      });
      delete element.dataset.enhanced;
      delete element.dataset.progress;
    };
  }, [enabled]);
  return scene;
}

// One bounded reveal per section; no continuous background animation.
export function useSectionReveals(enabled: boolean) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (
      !enabled ||
      !root.current ||
      typeof IntersectionObserver !== "function" ||
      typeof Element.prototype.animate !== "function"
    )
      return;
    const pending = new Map<Element, Animation>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            pending.get(entry.target)?.play();
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08 },
    );
    for (const element of root.current.querySelectorAll(
      ".pathway-card, .steps-grid > li, .control-copy, .journey-preview, .faq-section > div, .final-ascent h2",
    )) {
      if (element.getBoundingClientRect().top < window.innerHeight) continue;
      try {
        const animation = element.animate(
          [
            { opacity: 1, transform: "translateY(24px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          {
            duration: 550,
            easing: "cubic-bezier(.2,.7,.3,1)",
            fill: "backwards",
          },
        );
        animation.pause();
        pending.set(element, animation);
        observer.observe(element);
      } catch {
        /* Unsupported motion leaves normal visible content. */
      }
    }
    const stopHidden = () => {
      if (document.hidden)
        for (const animation of pending.values()) {
          if (animation.playState === "running") animation.finish();
        }
    };
    document.addEventListener("visibilitychange", stopHidden);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", stopHidden);
      for (const animation of pending.values()) animation.cancel();
    };
  }, [enabled]);
  return root;
}
