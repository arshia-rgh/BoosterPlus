import { useEffect, useRef, useState } from "react";
import { z } from "../validation";
import { post } from "./api";
import { activePortal, sessionEvent, sessionEventMatches } from "./portal";

// Register guards before a reveal starts. A late response must never restore
// plaintext after blur, a session change, record navigation or unmount.
export function useProtectedReveal(path: string, lifetime: number) {
  const portal = activePortal();
  const [visible, setVisible] = useState({ path, portal, value: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const generation = useRef(0);
  const feedbackGeneration = useRef(0);
  const pending = useRef(false);
  const mounted = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function hide() {
    generation.current++;
    feedbackGeneration.current++;
    pending.current = false;
    clearTimeout(timer.current);
    if (mounted.current) {
      setVisible({ path, portal, value: "" });
      setBusy(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    const invalidate = (discardFeedback = true) => {
      generation.current++;
      if (discardFeedback) feedbackGeneration.current++;
      pending.current = false;
      clearTimeout(timer.current);
      if (mounted.current) {
        setVisible({ path, portal, value: "" });
        setBusy(false);
        setError(null);
      }
    };
    invalidate();
    const sessionChanged = (event: Event) => {
      // A failed sensitive request emits this event before rejecting. Hide
      // secrets immediately, but keep its safe re-verification explanation.
      if (sessionEventMatches(event, portal)) invalidate(false);
    };
    const dismiss = () => {
      invalidate();
    };
    window.addEventListener("blur", dismiss);
    document.addEventListener("visibilitychange", dismiss);
    window.addEventListener(sessionEvent, sessionChanged);
    return () => {
      mounted.current = false;
      invalidate();
      window.removeEventListener("blur", dismiss);
      document.removeEventListener("visibilitychange", dismiss);
      window.removeEventListener(sessionEvent, sessionChanged);
    };
  }, [path, portal]);
  async function reveal() {
    if (!mounted.current || pending.current || document.hidden) return;
    hide();
    pending.current = true;
    const request = generation.current;
    const feedback = feedbackGeneration.current;
    const hidden = () => document.hidden;
    const current = () =>
      mounted.current &&
      generation.current === request &&
      activePortal() === portal;
    const canReport = () =>
      mounted.current &&
      feedbackGeneration.current === feedback &&
      activePortal() === portal;
    setBusy(true);
    setError(null);
    try {
      const result = await post(path, {}, z.object({ value: z.string() }));
      if (!current() || hidden()) return;
      const bytes = Uint8Array.from(atob(result.value), (c) => c.charCodeAt(0));
      try {
        setVisible({ path, portal, value: new TextDecoder().decode(bytes) });
      } finally {
        bytes.fill(0);
      }
      timer.current = setTimeout(hide, lifetime);
    } catch (cause) {
      if (canReport()) setError(cause);
    } finally {
      if (current()) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  return {
    value:
      visible.path === path && visible.portal === portal ? visible.value : "",
    busy,
    error,
    reveal,
    hide,
  };
}
