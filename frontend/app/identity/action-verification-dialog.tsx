import { useEffect, useRef, useState, type ComponentType } from "react";
import { useLocation } from "../portal-router";
import { sessionEvent, sessionEventMatches } from "./portal";
import {
  actionRoute,
  registerVerification,
  type VerificationRequest,
} from "./action-verification";

type Prompt = VerificationRequest & { resolve: () => void; reject: () => void };
export function ActionVerificationDialog() {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [Content, setContent] = useState<ComponentType<{
    prompt: Prompt;
    finish: (verified: boolean) => void;
  }> | null>(null);
  const current = useRef<Prompt | null>(null);
  const location = useLocation();
  useEffect(() => {
    const unregister = registerVerification(
      (request) =>
        new Promise<void>((resolve, reject) => {
          const next = {
            ...request,
            resolve,
            reject: () => {
              reject(new Error("Verification cancelled"));
            },
          };
          current.current = next;
          void import("./action-verification-content")
            .then(({ default: Component }) => {
              if (current.current !== next) return;
              if (actionRoute() !== next.route) {
                next.reject();
                current.current = null;
                return;
              }
              setContent(() => Component);
              setPrompt(next);
            })
            .catch(() => {
              if (current.current !== next) return;
              current.current = null;
              next.reject();
            });
        }),
    );
    return () => {
      unregister();
      current.current?.reject();
      current.current = null;
    };
  }, []);
  useEffect(() => {
    const cancel = () => {
      current.current?.reject();
      current.current = null;
      setPrompt(null);
    };
    if (current.current && actionRoute() !== current.current.route) cancel();
    const sessionChanged = (event: Event) => {
      if (current.current && sessionEventMatches(event, current.current.portal))
        cancel();
    };
    window.addEventListener(sessionEvent, sessionChanged);
    window.addEventListener("pagehide", cancel);
    return () => {
      window.removeEventListener(sessionEvent, sessionChanged);
      window.removeEventListener("pagehide", cancel);
    };
  }, [location]);
  if (!prompt || !Content) return null;
  return (
    <Content
      prompt={prompt}
      finish={(verified) => {
        if (current.current !== prompt) return;
        current.current = null;
        setPrompt(null);
        if (verified) prompt.resolve();
        else prompt.reject();
      }}
    />
  );
}
