import { useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router";
import { useMotionPreference } from "../ui/motion";

export default function Surface({
  children,
  kind,
}: {
  children: ReactNode;
  kind: "browse" | "workspace";
}) {
  const motion = useMotionPreference();
  const { pathname } = useLocation();
  const surface = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = surface.current;
    if (
      !element ||
      motion !== "system-full" ||
      typeof Element.prototype.animate !== "function"
    )
      return;
    // Only the decorative header moves. Text stays opaque and controls never wait.
    const target = element.querySelector(".experience-glow");
    let animation: Animation | undefined;
    try {
      animation = target?.animate(
        [
          { transform: "translateY(18px) scale(.97)" },
          { transform: "translateY(0) scale(1)" },
        ],
        { duration: 650, easing: "cubic-bezier(.2,.7,.2,1)" },
      );
    } catch {
      // Unsupported animation APIs leave all content visible and usable.
      return;
    }
    return () => animation?.cancel();
  }, [motion, pathname]);
  return (
    <div
      className={`experience ${kind}-experience`}
      ref={surface}
      data-motion={motion === "system-full" ? "full" : "reduced"}
    >
      <div className="experience-glow" aria-hidden="true" />
      {children}
    </div>
  );
}
