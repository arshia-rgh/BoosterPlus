import {
  activePortal,
  portalHome,
  portalLogin,
  portalSecurity,
  portalFromPath,
  portalReturn,
  type Portal,
} from "../identity/portal";
import { useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { APIError } from "../identity/api";

const key = (portal: Portal) => `playora.google-return.${portal}`;
export function safeReturnPath(
  value: string | null,
  portal: Portal = activePortal(),
) {
  return portalReturn(value, portal);
}
export function rememberGoogleReturn(
  path: string,
  resume?: string,
  portal: Portal = activePortal(),
) {
  const target = safeReturnPath(path, portal);
  try {
    if (target)
      sessionStorage.setItem(
        key(portal),
        JSON.stringify({
          path: target,
          resume: safeReturnPath(resume ?? null, portal),
          expires: Date.now() + 10 * 60_000,
        }),
      );
  } catch {
    /* Sign-in remains available when browser storage is blocked. */
  }
}
export function clearGoogleReturn(portal: Portal = activePortal()) {
  try {
    sessionStorage.removeItem(key(portal));
  } catch {
    /* Storage is optional. */
  }
}
function takeGoogleReturn(portal: Portal) {
  try {
    const raw: unknown = JSON.parse(
      sessionStorage.getItem(key(portal)) ?? "null",
    );
    clearGoogleReturn(portal);
    if (
      typeof raw !== "object" ||
      raw === null ||
      !("expires" in raw) ||
      !("path" in raw) ||
      typeof raw.expires !== "number" ||
      raw.expires < Date.now() ||
      typeof raw.path !== "string"
    )
      return null;
    const target = safeReturnPath(raw.path, portal);
    const resume =
      "resume" in raw && typeof raw.resume === "string"
        ? safeReturnPath(raw.resume, portal)
        : null;
    return target === portalSecurity(portal) && resume
      ? target + "?returnTo=" + encodeURIComponent(resume)
      : target;
  } catch {
    clearGoogleReturn(portal);
    return null;
  }
}
export function SignInReturn({ ready }: { ready: boolean }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const portal = portalFromPath(pathname);
  const requested = safeReturnPath(params.get("returnTo"), portal);
  useEffect(() => {
    if (
      !ready ||
      (pathname !== portalHome(portal) && pathname !== portalLogin(portal))
    )
      return;
    const stored = takeGoogleReturn(portal);
    const target = requested ?? stored ?? portalHome(portal);
    if (target && target !== pathname) {
      clearGoogleReturn(portal);
      void navigate(target, { replace: true });
    }
  }, [ready, pathname, requested, navigate, portal]);
  return null;
}
export function VerificationReturn() {
  const [params] = useSearchParams();
  const portal = portalFromPath(useLocation().pathname);
  const target = safeReturnPath(params.get("returnTo"), portal);
  return target && target !== portalSecurity(portal) ? (
    <p className="account-return">
      <Link to={target}>Return to your task ↗</Link> after verification. Review
      the current details before trying the action again.
    </p>
  ) : null;
}

export function VerificationLink({ error }: { error: unknown }) {
  if (
    !(error instanceof APIError) ||
    !["recent_auth_required", "mfa_required"].includes(error.code)
  )
    return null;
  const target =
    typeof window === "undefined"
      ? null
      : safeReturnPath(window.location.pathname + window.location.search);
  return (
    <a
      href={
        portalSecurity(activePortal()) +
        (target ? "?returnTo=" + encodeURIComponent(target) : "")
      }
    >
      Verify your identity to continue
    </a>
  );
}
