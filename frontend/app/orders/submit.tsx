import { useContext, useEffect, useRef, useState } from "react";
import { clearConfigurationDraft } from "../catalog/configuration-draft";
import { sessionEventMatches } from "../identity/portal";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "../portal-router";
import { get, post, sessionSchema, type Session } from "../identity/api";
import { Check, ErrorNotice, Action } from "../catalog/controls";
import { minorDisplay } from "../catalog/dynamic-form";
import type { Answers, Estimate, Variant } from "../catalog/model";
import { detailSchema } from "./model";
import {
  recoverySchema,
  requestReference,
  RequestSubmission,
} from "./request-recovery";

export default function SubmitOrder({
  slug,
  service,
  releaseID,
  pack,
  variant,
  answers,
  coupon,
  estimate,
  setBusy,
  onSignIn,
  intakeKey,
}: {
  slug: string;
  service: string;
  releaseID: string;
  pack: string;
  variant?: Variant | undefined;
  answers: Answers;
  coupon: string;
  estimate: Estimate | null;
  setBusy: (busy: boolean) => void;
  onSignIn?: () => void;
  intakeKey?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const lock = useRef(false);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const focusedReview = useRef(false);
  useEffect(() => {
    if (!variant || focusedReview.current) return;
    focusedReview.current = true;
    reviewHeading.current?.focus({ preventScroll: true });
    if (typeof reviewHeading.current?.scrollIntoView === "function")
      reviewHeading.current.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
  }, [variant]);
  const submitting = useContext(RequestSubmission);
  const [session, setSession] = useState<Session | null>(null),
    [error, setError] = useState<unknown>(null),
    [accepted, setAccepted] = useState(false),
    [pending, setPending] = useState(false),
    [requestKey] = useState(
      () => requestReference(params) || crypto.randomUUID(),
    );
  useEffect(() => {
    let active = true,
      sequence = 0;
    const refresh = () => {
      const request = ++sequence;
      void get("/auth/session", sessionSchema, "customer")
        .then((value) => {
          if (active && request === sequence) {
            setSession(value);
            setAccepted(false);
            setError(null);
          }
        })
        .catch((cause: unknown) => {
          if (active && request === sequence) {
            setSession(null);
            setAccepted(false);
            setError(cause);
          }
        });
    };
    refresh();
    const changed = (event: Event) => {
      if (sessionEventMatches(event, "customer")) refresh();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("boosterplus:session-changed", changed);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("boosterplus:session-changed", changed);
    };
  }, []);
  const amount = variant
    ? (estimate?.amount_minor ?? variant.amount_minor)
    : "";
  async function create() {
    if (lock.current || !accepted || !session?.user || session.mfa_required)
      return;
    lock.current = true;
    submitting(true);
    const reference = requestReference(params) || intakeKey || requestKey;
    const next = new URLSearchParams(params);
    next.set("request", reference);
    setParams(next, { replace: true, preventScrollReset: true });
    setPending(true);
    setBusy(true);
    setError(null);
    try {
      const recovered = await get(
        `/me/order-requests/${reference}`,
        recoverySchema,
        "customer",
      );
      if (recovered.order_id) {
        clearConfigurationDraft();
        await navigate(`/orders/${recovered.order_id}`);
        return;
      }
      const result = await post(
        "/orders",
        {
          request_key: reference,
          release_id: releaseID,
          slug,
          service,
          package: pack,
          variant: variant?.key ?? "",
          kind: variant ? "package" : "custom",
          answers,
          coupon_code: coupon,
          accept_terms: accepted,
          terms_version: session.terms_version,
          expected_amount: amount,
          expected_coupon_version: variant
            ? (estimate?.discount?.version ?? 0)
            : 0,
        },
        detailSchema,
      );
      clearConfigurationDraft();
      await navigate(`/orders/${result.order.id}`);
    } catch (cause) {
      setError(cause);
    } finally {
      lock.current = false;
      submitting(false);
      setPending(false);
      setBusy(false);
    }
  }
  return (
    <section aria-label="Submit order" className="catalog-section">
      <h2 ref={reviewHeading} tabIndex={-1}>
        {variant ? "Review fixed package" : "Request an administrator’s quote"}
      </h2>
      {variant && (
        <p>
          Agreed price: {variant.currency} {minorDisplay(amount)}. Availability
          and coupon eligibility are checked when you submit.
        </p>
      )}
      {!variant && (
        <p>
          Your request is unpaid. Review and accept the administrator’s final
          quote before payment.
        </p>
      )}
      <p>
        Payment follows a saved agreement. Submitting an order does not transfer
        funds.
      </p>
      <ErrorNotice error={error} />
      {!session ? (
        <p role="status">
          {error
            ? "Sign-in could not be checked. Return to this tab to retry."
            : "Checking sign-in…"}
        </p>
      ) : !session.user || session.mfa_required ? (
        <p>
          <Link
            to={
              "/login?returnTo=" +
              encodeURIComponent(
                location.pathname +
                  "?" +
                  new URLSearchParams({
                    ...(variant
                      ? { variant: variant.key }
                      : { step: "review" }),
                    ...(coupon ? { coupon } : {}),
                    ...(requestReference(params)
                      ? { request: requestReference(params) }
                      : {}),
                  }).toString(),
              )
            }
            onClick={onSignIn}
          >
            Sign in and complete verification
          </Link>{" "}
          to continue. Your non-sensitive choices can be restored in this tab
          for 15 minutes. Private details and acceptance are never saved.
        </p>
      ) : (
        <>
          <p>
            <Link
              to={session.terms_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read order terms
            </Link>{" "}
            · version {session.terms_version}
          </p>
          <Check
            label={
              variant
                ? "I accept the terms and fixed package price"
                : "I accept the terms and request a final quote"
            }
            value={accepted}
            change={setAccepted}
          />
          <Action disabled={!accepted || pending} onClick={() => void create()}>
            {pending
              ? "Submitting…"
              : variant
                ? "Create package order"
                : "Submit quote request"}
          </Action>
        </>
      )}
    </section>
  );
}
