import { useSyncExternalStore } from "react";
import { isRouteErrorResponse, Link, useLocation } from "../portal-router";
import { useRetryPending } from "./retry-button";
import { retryLabel } from "./retry-time";
import "./feedback.css";

function subscribeConnection(changed: () => void) {
  window.addEventListener("online", changed);
  window.addEventListener("offline", changed);
  return () => {
    window.removeEventListener("online", changed);
    window.removeEventListener("offline", changed);
  };
}
function connection() {
  return navigator.onLine;
}
function serverConnection() {
  return true;
}

export default function ErrorPage({
  error,
  admin = false,
}: {
  error: unknown;
  admin?: boolean;
}) {
  const online = useSyncExternalStore(
    subscribeConnection,
    connection,
    serverConnection,
  );
  const { pathname } = useLocation();
  const booster = !admin && pathname.startsWith("/booster");
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const raw: unknown = isRouteErrorResponse(error) ? error.data : null;
  const candidate =
    typeof raw === "object" && raw !== null && "retry_at" in raw
      ? raw.retry_at
      : undefined;
  const retryAt =
    typeof candidate === "number" &&
    Number.isFinite(candidate) &&
    candidate > 0 &&
    candidate < 8640000000000000
      ? candidate
      : undefined;
  const blocked = useRetryPending(status === 429 ? retryAt : undefined);
  const workspace = admin
    ? "Administration"
    : booster
      ? "Booster workspace"
      : "My account";
  const destination = admin ? "/admin" : booster ? "/booster" : "/account";
  const title = !online
    ? "Check your connection."
    : status === 404
      ? "This page isn’t available."
      : status === 401
        ? "Sign in to continue."
        : status === 403
          ? "This page isn’t available to you."
          : status === 429
            ? "Please wait a moment."
            : status === 503
              ? "Temporarily unavailable."
              : "We couldn’t open this page.";
  const description = !online
    ? "You appear to be offline. Reconnect, then reload this page."
    : status === 404
      ? "We couldn’t find that page. Choose a destination below to continue."
      : status === 401
        ? "Your session may have ended. Return to your workspace and sign in again."
        : status === 403
          ? "Return to your workspace to check your access. Private information is not shown here."
          : status === 429
            ? retryAt === undefined
              ? "Too many requests. Please wait before trying again."
              : `Too many requests. You can try again after ${retryLabel(retryAt)}.`
            : status === 503
              ? "This service is temporarily unavailable. Please try again shortly."
              : "If an earlier action was interrupted, check its record before repeating that action.";
  const canRetry = !online || ![401, 403, 404].includes(status);
  return (
    <main id="main" className="page system-error-page">
      <title>{`${title} | PLAYORA`}</title>
      <meta name="robots" content="noindex,nofollow" />
      <p className="eyebrow">
        {admin ? "Admin workspace" : booster ? "Booster workspace" : "PLAYORA"}
      </p>
      <p className="system-error-mark" aria-hidden="true">
        {!online ? "↯" : status === 404 ? "404" : "!"}
      </p>
      <h1 tabIndex={-1}>{title}</h1>
      <p role="status">{description}</p>
      <div className="ui-state-actions">
        {canRetry && (
          <button
            className="button"
            type="button"
            disabled={blocked}
            onClick={() => {
              window.location.reload();
            }}
          >
            Reload page
          </button>
        )}
        {!admin && !booster && status !== 401 && status !== 403 && (
          <Link className={canRetry ? "context-back" : "button"} to="/games">
            Explore games
          </Link>
        )}
        <Link
          className={
            !canRetry && (admin || booster || status === 401 || status === 403)
              ? "button"
              : "context-back"
          }
          to={destination}
        >
          {status === 401 ? `Sign in · ${workspace}` : `Return to ${workspace}`}
        </Link>
      </div>
      {!admin && !booster && (
        <p>
          <Link to="/support">Contact support</Link>
        </p>
      )}
    </main>
  );
}
