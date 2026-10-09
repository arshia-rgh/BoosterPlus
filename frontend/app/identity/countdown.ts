import { useEffect, useState } from "react";

/** A deadline comes from server response timing, never a client-side rate limit. */
export function useCountdown(deadline: number | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (deadline === undefined) return;
    const update = () => {
      setNow(Date.now());
    };
    update();
    const timer = window.setInterval(update, 1000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [deadline]);
  return deadline === undefined
    ? 0
    : Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function countdownLabel(seconds: number): string {
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, "0")}`;
}
