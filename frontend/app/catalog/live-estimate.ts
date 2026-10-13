import { useEffect, useState } from "react";
import { APIError, post } from "../identity/api";
import { estimateSchema, type Answers, type Estimate } from "./model";

type Result = {
  key: string;
  state: "checking" | "ready" | "invalid" | "error" | "expired";
  estimate?: Estimate;
  message?: string;
};

/** Read-only, debounced price feedback. Submission still validates afresh. */
export function useLiveEstimate({
  enabled,
  complete,
  slug,
  releaseID,
  service,
  answers,
  coupon,
}: {
  enabled: boolean;
  complete: boolean;
  slug: string;
  releaseID: string;
  service: string;
  answers: Answers;
  coupon: string;
}) {
  const key = JSON.stringify({
    slug,
    releaseID,
    service,
    answers,
    coupon: coupon.trim(),
  });
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const identity = JSON.stringify([key, enabled, complete, attempt]);
  const [previousIdentity, setPreviousIdentity] = useState(identity);
  // A -> B -> A must not revive a result whose expiry timer was cancelled.
  if (previousIdentity !== identity) {
    setPreviousIdentity(identity);
    setResult(null);
  }
  useEffect(() => {
    if (!enabled || !complete) return;
    let current = true;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      setResult({ key, state: "checking" });
      const request = JSON.parse(key) as {
        slug: string;
        releaseID: string;
        service: string;
        answers: Answers;
        coupon: string;
      };
      const endpoint = request.coupon ? "discount" : "estimate";
      void post(
        `/catalog/games/${encodeURIComponent(request.slug)}/${endpoint}`,
        {
          release_id: request.releaseID,
          service: request.service,
          answers: request.answers,
          ...(request.coupon
            ? {
                code: request.coupon,
                stage: "estimate",
                package: "",
                variant: "",
              }
            : {}),
        },
        estimateSchema,
      )
        .then((estimate) => {
          if (!current) return;
          if (estimate.outcome === "invalid" || estimate.issues.length) {
            setResult({ key, state: "invalid" });
            return;
          }
          const remaining =
            new Date(estimate.expires_at).getTime() - Date.now();
          if (!Number.isFinite(remaining) || remaining <= 0) {
            setResult({ key, state: "expired" });
            return;
          }
          setResult({ key, state: "ready", estimate });
          expiry = setTimeout(
            () => {
              if (current) setResult({ key, state: "expired" });
            },
            Math.min(remaining, 2_147_483_647),
          );
        })
        .catch((error: unknown) => {
          if (!current) return;
          setResult({
            key,
            state: "error",
            message:
              error instanceof APIError
                ? error.message
                : "We couldn’t update the estimate. Your selections are still here.",
          });
        });
    }, 500);
    return () => {
      current = false;
      clearTimeout(timer);
      clearTimeout(expiry);
    };
  }, [key, enabled, complete, attempt]);
  const current = enabled && complete && result?.key === key ? result : null;
  return {
    state: !complete ? "incomplete" : (current?.state ?? "checking"),
    estimate: current?.state === "ready" ? current.estimate : undefined,
    message: current?.message,
    retry: () => {
      setAttempt((value) => value + 1);
    },
  };
}
