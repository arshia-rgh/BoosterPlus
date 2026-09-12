import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { get, post, sessionSchema, type Session } from "../identity/api";
import { Check, ErrorNotice, Action } from "../catalog/controls";
import { minorDisplay } from "../catalog/dynamic-form";
import type { Answers, Estimate, Variant } from "../catalog/model";
import { detailSchema } from "./model";

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
}) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null),
    [error, setError] = useState<unknown>(null),
    [accepted, setAccepted] = useState(false),
    [pending, setPending] = useState(false),
    [requestKey] = useState(() => crypto.randomUUID());
  useEffect(() => {
    let active = true,
      sequence = 0;
    const refresh = () => {
      const request = ++sequence;
      void get("/auth/session", sessionSchema)
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
    window.addEventListener("focus", refresh);
    window.addEventListener("boosterplus:session-changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("boosterplus:session-changed", refresh);
    };
  }, []);
  const amount = variant
    ? (estimate?.amount_minor ?? variant.amount_minor)
    : "";
  async function create() {
    setPending(true);
    setBusy(true);
    setError(null);
    try {
      const result = await post(
        "/orders",
        {
          request_key: requestKey,
          release_id: releaseID,
          slug,
          service,
          package: pack,
          variant: variant?.key ?? "",
          kind: variant ? "package" : "custom",
          answers,
          coupon_code: coupon,
          accept_terms: accepted,
          terms_version: session?.terms_version ?? "",
          expected_amount: amount,
          expected_coupon_version: variant
            ? (estimate?.discount?.version ?? 0)
            : 0,
        },
        detailSchema,
      );
      await navigate(`/orders/${result.order.id}`);
    } catch (cause) {
      setError(cause);
    } finally {
      setPending(false);
      setBusy(false);
    }
  }
  return (
    <section aria-label="Submit order" className="catalog-section">
      <h2>
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
        Crypto checkout is being prepared. Submitting an order does not transfer
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
          <Link to="/login" target="_blank" rel="noopener noreferrer">
            Sign in and complete verification
          </Link>{" "}
          in a new tab, then return here. Your selections stay in this tab until
          you leave or reload it.
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
