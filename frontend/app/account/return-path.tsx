import { useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { APIError } from "../identity/api";

const key = "playora.google-return";
// Retain local navigation and a bounded public package variant, never private query values.
export function safeReturnPath(value: string | null) {
  if (
    !value ||
    value.length > 2048 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return null;
  try {
    const url = new URL(value, "https://playora.invalid");
    if (
      url.origin !== "https://playora.invalid" ||
      !/^\/(account|orders|games|support|sell|privacy|favorites|availability|notifications|reviews|admin|booster)(\/|$)/.test(
        url.pathname,
      )
    )
      return null;
    const variant = url.searchParams.get("variant");
    return (
      url.pathname +
      (/^\/games\/[^/]+\/packages\/[^/]+$/.test(url.pathname) &&
      variant &&
      /^[a-zA-Z0-9_-]{1,64}$/.test(variant)
        ? "?variant=" + encodeURIComponent(variant)
        : "")
    );
  } catch {
    return null;
  }
}
export function rememberGoogleReturn(path: string, resume?: string) {
  const target = safeReturnPath(path);
  try {
    if (target)
      sessionStorage.setItem(
        key,
        JSON.stringify({
          path: target,
          resume: safeReturnPath(resume ?? null),
          expires: Date.now() + 10 * 60_000,
        }),
      );
  } catch {
    /* Sign-in remains available when browser storage is blocked. */
  }
}
export function clearGoogleReturn() {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* Storage is optional. */
  }
}
function takeGoogleReturn() {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(key) ?? "null");
    clearGoogleReturn();
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
    const target = safeReturnPath(raw.path);
    const resume =
      "resume" in raw && typeof raw.resume === "string"
        ? safeReturnPath(raw.resume)
        : null;
    return target === "/account/security" && resume
      ? target + "?returnTo=" + encodeURIComponent(resume)
      : target;
  } catch {
    clearGoogleReturn();
    return null;
  }
}
export function SignInReturn({ ready }: { ready: boolean }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const requested = safeReturnPath(params.get("returnTo"));
  useEffect(() => {
    if (!ready || (pathname !== "/account" && pathname !== "/login")) return;
    const stored = takeGoogleReturn();
    const target = requested ?? stored;
    if (target && target !== pathname) {
      clearGoogleReturn();
      // Admin has an independent route graph and requires a document navigation.
      if (/^\/admin(?:\/|$)/.test(target)) location.assign(target);
      else void navigate(target, { replace: true });
    }
  }, [ready, pathname, requested, navigate]);
  return null;
}
export function VerificationReturn() {
  const [params] = useSearchParams();
  const target = safeReturnPath(params.get("returnTo"));
  return target && target !== "/account/security" ? (
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
      : safeReturnPath(window.location.pathname);
  return (
    <a
      href={
        "/account/security" +
        (target ? "?returnTo=" + encodeURIComponent(target) : "")
      }
    >
      Verify your identity to continue
    </a>
  );
}
