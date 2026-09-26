import {
  createContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { get, sessionSchema } from "../identity/api";
import { ErrorNotice } from "../catalog/controls";
import { z } from "../validation";
import { clearConfigurationDraft } from "../catalog/configuration-draft";
import { sessionEventMatches } from "../identity/portal";

export const recoverySchema = z.object({ order_id: z.string() });
export const RequestSubmission = createContext<(pending: boolean) => void>(
  () => {},
);
export function requestReference(params: URLSearchParams) {
  const value = params.get("request");
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      value,
    )
    ? value
    : "";
}
// Only an opaque owner-scoped reference survives reload, never answers or consent.
export default function RequestJourney({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const reference = requestReference(params);
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(0);
  const [newRequest, setNewRequest] = useState(0);
  const [result, setResult] = useState<null | {
    reference: string;
    order: string;
    authenticated: boolean;
  }>(null);
  const [error, setError] = useState<unknown>(null);
  const current = result?.reference === reference ? result : null;
  useEffect(() => {
    const changed = (event: Event) => {
      if (sessionEventMatches(event, "customer")) {
        setResult(null);
        setError(null);
        setRevision((v) => v + 1);
      }
    };
    window.addEventListener("boosterplus:session-changed", changed);
    return () => {
      window.removeEventListener("boosterplus:session-changed", changed);
    };
  }, []);
  useEffect(() => {
    if (!reference || pending) return;
    const lifecycle = new AbortController();
    void (async () => {
      try {
        const session = await get("/auth/session", sessionSchema, "customer");
        const authenticated = !!session.user && !session.mfa_required;
        const recovered = authenticated
          ? await get(
              `/me/order-requests/${reference}`,
              recoverySchema,
              "customer",
            )
          : null;
        if (!lifecycle.signal.aborted)
          setResult({
            reference,
            order: recovered?.order_id ?? "",
            authenticated,
          });
      } catch (cause) {
        if (!lifecycle.signal.aborted) setError(cause);
      }
    })();
    return () => {
      lifecycle.abort();
    };
  }, [reference, revision, pending]);
  const checkingRecovery =
    !!reference &&
    !pending &&
    (!current || !!current.order || !current.authenticated);
  const recoveryHeading = useRef<HTMLHeadingElement>(null);
  const formArea = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (checkingRecovery) recoveryHeading.current?.focus();
    else if (newRequest > 0)
      formArea.current
        ?.querySelector<HTMLElement>(
          "input:not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(:disabled)",
        )
        ?.focus();
  }, [checkingRecovery, newRequest, current?.order]);
  return (
    <RequestSubmission value={setPending}>
      {!!reference && !pending && (
        <section className="catalog-section" aria-label="Interrupted request">
          <h2 ref={recoveryHeading} tabIndex={-1}>
            {current?.order ? "Your request was saved" : "Resume your request"}
          </h2>
          <ErrorNotice error={error} />
          {!current && !error && (
            <p role="status">Checking whether your request was saved…</p>
          )}
          {current && (
            <p>
              {current.order
                ? "Your saved order is ready in My account. Its original choices are unchanged."
                : current.authenticated
                  ? "No saved order was found for this reference yet. Review and submit below with the same reference. If another tab is still submitting, check again before changing your choices."
                  : "Sign in to recover a saved order. Private answers and acceptance have not been stored."}
            </p>
          )}
          <div className="configuration-actions">
            {current?.order ? (
              <>
                <Link className="button" to={`/orders/${current.order}`}>
                  View your saved order
                </Link>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.delete("request");
                    next.delete("step");
                    setParams(next, {
                      replace: true,
                      preventScrollReset: true,
                    });
                    clearConfigurationDraft();
                    setResult(null);
                    setError(null);
                    setNewRequest((v) => v + 1);
                  }}
                >
                  Start a separate new request
                </button>
              </>
            ) : (
              <>
                {current && !current.authenticated && (
                  <Link
                    className="button"
                    to={
                      "/login?returnTo=" +
                      encodeURIComponent(location.pathname + location.search)
                    }
                  >
                    Sign in to recover your request
                  </Link>
                )}
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setError(null);
                    setRevision((v) => v + 1);
                  }}
                >
                  Check saved request
                </button>
              </>
            )}
          </div>
        </section>
      )}
      <div ref={formArea} hidden={checkingRecovery} key={newRequest}>
        {children}
      </div>
    </RequestSubmission>
  );
}
