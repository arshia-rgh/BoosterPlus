import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router";
import { Action, ErrorNotice } from "../catalog/controls";
import { post } from "../identity/api";
import { linkSchema, parseLink } from "./model";
function watchHash(notify: () => void) {
  window.addEventListener("hashchange", notify);
  return () => {
    window.removeEventListener("hashchange", notify);
  };
}
export default function Unsubscribe() {
  const hash = useSyncExternalStore(
    watchHash,
    () => window.location.hash,
    () => "",
  );
  return <UnsubscribeLink key={hash} fragment={hash} />;
}
function UnsubscribeLink({ fragment }: { fragment: string }) {
  const input = useMemo(() => parseLink(fragment), [fragment]);
  const [state, setState] = useState("loading"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (!input) return;
    let active = true;
    void post("/availability-link/inspect", input, linkSchema)
      .then((result) => {
        if (active) setState(result.current ? "current" : "invalid");
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause);
          setState("error");
        }
      });
    return () => {
      active = false;
    };
  }, [input]);
  async function confirm() {
    if (!input) return;
    setBusy(true);
    setError(null);
    try {
      const result = await post(
        "/availability-link/confirm",
        input,
        linkSchema,
      );
      setState(result.current ? "done" : "invalid");
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="page">
      <h1>Stop package availability emails</h1>
      {input && state === "loading" && (
        <p role="status">Checking this unsubscribe link…</p>
      )}
      {input && state === "current" && (
        <>
          <p>
            Confirm to stop emails for the package subscription attached to this
            link. Your order update preferences stay as configured in your
            account.
          </p>
          <Action disabled={busy} onClick={() => void confirm()}>
            Stop these availability emails
          </Action>
        </>
      )}
      {state === "done" && (
        <p role="status">
          These availability emails are stopped. An email already being sent may
          still arrive.
        </p>
      )}
      {(!input || state === "invalid") && (
        <p>This link is no longer current or has already been used.</p>
      )}
      <ErrorNotice error={error} />
      <Link to="/availability">Sign in to manage all package alerts</Link>
    </main>
  );
}
