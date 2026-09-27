import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router";
import { APIError, sessionSchema } from "../identity/api";
import { portalFromPath, sessionEventMatches } from "../identity/portal";
import { useResource } from "../orders/resource";
const ActivityWork = lazy(() => import("./activity-panel"));
type ActivityIdentity = {
  portal: "customer" | "admin" | "booster";
  user: { id: string } | null;
  mfa_required: boolean;
  capabilities: string[];
};
function VerifiedActivity({
  session: value,
}: {
  session: ActivityIdentity | null;
}) {
  return value?.portal === "customer" &&
    value.user &&
    !value.mfa_required &&
    value.capabilities.includes("account") ? (
    <Suspense fallback={null}>
      <ActivityWork key={value.user.id} />
    </Suspense>
  ) : null;
}
function ActivitySession() {
  const session = useResource("/auth/session", sessionSchema),
    reload = session.reload;
  useEffect(() => {
    const check = () => {
      if (
        !document.hidden &&
        !session.loading &&
        !(
          session.error instanceof APIError &&
          (session.error.retryAt ?? 0) > Date.now()
        )
      )
        reload();
    };
    const timer = setInterval(check, 60000);
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
    };
  }, [reload, session.loading, session.error]);
  return <VerifiedActivity session={session.error ? null : session.data} />;
}

export default function CustomerActivity({
  session,
}: {
  session?: ActivityIdentity | null;
}) {
  const { pathname, key } = useLocation();
  const [blocked, setBlocked] = useState<string | null>(null);
  useEffect(() => {
    const changed = (event: Event) => {
      if (sessionEventMatches(event, "customer")) setBlocked(key);
    };
    const focused = () => {
      setBlocked(null);
    };
    window.addEventListener("boosterplus:session-changed", changed);
    window.addEventListener("focus", focused);
    return () => {
      window.removeEventListener("boosterplus:session-changed", changed);
      window.removeEventListener("focus", focused);
    };
  }, [key]);
  if (
    portalFromPath(pathname) !== "customer" ||
    pathname === "/login" ||
    blocked === key
  )
    return null;
  return session === undefined ? (
    <ActivitySession key={key} />
  ) : (
    <VerifiedActivity session={session} />
  );
}
