import { actionLabel, actionRoute, verifyAction } from "./action-verification";
import {
  activePortal,
  portalAPIPath,
  portalHeaders,
  notifySession,
  sessionEvent,
  sessionEventMatches,
  type Portal,
} from "./portal";
import { invalidNumericFields } from "../ui/numeric-fields";
import { retryTime, retryLabel } from "../ui/retry-time";
import { z } from "../validation";
import type { components } from "../api/schema";

export const userSchema = z.object({
  portal: z.enum(["customer", "admin", "booster"]),
  email_verified: z.boolean().default(false),
  deleted: z.boolean().default(false),
  id: z.string(),
  email: z.string(),
  display_name: z.string(),
  role: z.enum(["customer", "booster", "administrator", "owner"]),
  staff_alias: z.string(),
  suspended: z.boolean(),
  mfa_enabled: z.boolean(),
  notify_updates: z.boolean(),
}) satisfies z.ZodType<components["schemas"]["User"]>;
export type User = z.infer<typeof userSchema>;
export const sessionSchema: z.ZodType<components["schemas"]["AuthSession"]> = z
  .object({
    portal: z.enum(["customer", "booster", "admin"]),
    user: userSchema.nullable(),
    csrf_token: z.string().min(40),
    google_enabled: z.boolean(),
    google_linked: z.boolean(),
    mfa_required: z.boolean(),
    capabilities: z.array(z.string()),
    terms_version: z.string(),
    terms_url: z.string(),
  })
  .superRefine((value, context) => {
    if (value.user && value.user.portal !== value.portal)
      context.addIssue({
        code: "custom",
        path: ["user", "portal"],
        message: "Identity belongs to a different workspace",
      });
  });
export type Session = z.infer<typeof sessionSchema>;
export const codesSchema = z.object({ recovery_codes: z.array(z.string()) });
export const sessionsSchema = z.object({
  sessions: z.array(
    z.object({
      id: z.string(),
      portal: z.enum(["customer", "booster", "admin"]),
      created_at: z.string(),
      last_seen_at: z.string(),
      expires_at: z.string(),
      current: z.boolean(),
    }),
  ),
});
export const auditsSchema = z.object({
  next: z.string().optional(),
  audits: z.array(
    z.object({
      id: z.string(),
      actor_id: z.string().optional(),
      actor_reference: z.string().optional(),
      action: z.string(),
      target_id: z.string().optional(),
      metadata: z.record(z.string(), z.string()),
      created_at: z.string(),
    }),
  ),
});
export const recoveriesSchema = z.object({
  recoveries: z.array(
    z.object({
      id: z.string(),
      user_id: z.string(),
      new_email: z.string(),
      created_at: z.string(),
    }),
  ),
});
const messages = new Map([
  [
    "payment_below_minimum",
    "This order is below NOWPayments’ current minimum for the selected network. No checkout was created. Contact support to review the order amount or choose another available network.",
  ],
  [
    "article_invalid",
    "Review the article fields and publication requirements.",
  ],
  [
    "article_conflict",
    "This article changed. Refresh and review its saved revision before continuing.",
  ],
  [
    "shop_invalid",
    "Review the product details and field guidance before continuing.",
  ],
  [
    "shop_conflict",
    "This shop record changed or is not ready for this action. Refresh its current status; check availability, verified payment and any open case before continuing.",
  ],
  [
    "payment_invalid",
    "Review the payment policy, asset and network, and confirm your acceptance.",
  ],
  [
    "payment_conflict",
    "Payment details changed. Refresh before continuing; do not create another payment.",
  ],
  [
    "payments_unavailable",
    "Checkout is temporarily unavailable. Contact support for updates.",
  ],
  [
    "report_invalid",
    "Check the report filters, UTC date range, and export reason.",
  ],
  [
    "report_conflict",
    "The records changed after preview. Refresh the report before downloading.",
  ],
  [
    "availability_invalid",
    "Check the offering and explicitly accept availability emails.",
  ],
  [
    "availability_conflict",
    "The offering or your subscription changed. Open Package alerts, refresh, and review the current details.",
  ],
  [
    "operations_invalid",
    "Check the task filters and provide a reason for retry.",
  ],
  [
    "operations_conflict",
    "This task changed or cannot be retried. Refresh before continuing.",
  ],
  [
    "review_invalid",
    "Check your rating, feedback and publication-policy confirmation.",
  ],
  [
    "review_conflict",
    "This review, publication policy or purchase eligibility changed. Refresh before continuing.",
  ],
  [
    "submission_invalid",
    "Review the account fields and ownership information before continuing.",
  ],
  [
    "submission_conflict",
    "This submission or intake form changed or is unavailable. Refresh before retrying. If draft creation was interrupted, check your submission history first.",
  ],
  [
    "fulfillment_invalid",
    "Review the fulfillment fields and limits before continuing.",
  ],
  [
    "fulfillment_conflict",
    "This work changed or is not ready. Refresh the order and check its assignment, payment and handoff status.",
  ],
  [
    "media_invalid",
    "Choose a valid JPEG, PNG, or WebP matching the upload requirements.",
  ],
  [
    "media_conflict",
    "This image is not ready or has changed. Refresh its status before continuing.",
  ],
  [
    "conversation_conflict",
    "This conversation changed. Refresh it before trying again.",
  ],
  ["conversation_invalid", "Review the highlighted conversation issues."],
  [
    "privacy_invalid",
    "Review the selected privacy action and required policy acceptance.",
  ],
  [
    "privacy_conflict",
    "Refresh this request and policy. Holds, retention deadlines or pending file cleanup must be resolved before erasure can finish.",
  ],
  [
    "content_invalid",
    "Review the content limits and required fields. Published versions must be unique and cannot reuse the original deployment terms label.",
  ],
  [
    "content_conflict",
    "The draft changed or this published version already exists. Reload and review before saving.",
  ],
  ["not_found", "This item is unavailable or you do not have access."],
  [
    "order_conflict",
    "This order, quote, or availability changed. Reload before continuing.",
  ],
  ["order_invalid", "Review the highlighted order issues."],
  [
    "resale_invalid",
    "Review the highlighted account details before continuing.",
  ],
  [
    "resale_conflict",
    "This account's availability or purchase terms changed. Refresh the listing and review the current terms before continuing. If your earlier reservation was not confirmed, check that same request first.",
  ],
  [
    "catalog_conflict",
    "This catalog changed or is unavailable. Reload it before continuing.",
  ],
  ["catalog_invalid", "Review the highlighted catalog issues."],
  [
    "invalid_verification",
    "Verification failed. Use a fresh code; codes expire and cannot be reused.",
  ],
  ["sign_in_required", "Your session ended. Sign in again."],
  ["permission_denied", "You do not have permission for this action."],
  [
    "staff_access_required",
    "Staff access is not available for this email in this workspace. Ask the owner to add or restore your account here. No verification code was sent.",
  ],
  ["mfa_required", "Verify a fresh authenticator code before continuing."],
  [
    "recent_auth_required",
    "Confirm this action with an authenticator or email code without leaving this page.",
  ],
  ["terms_required", "Accept the current account terms to continue."],
  [
    "identity_conflict",
    "This identity cannot be linked or changed. Sign in using your existing method first.",
  ],
  [
    "rate_limited",
    "Too many attempts. Wait a few minutes before trying again.",
  ],
]);
export class APIError extends Error {
  code = "";
  status = 0;
  retryAt?: number;
  issues: { path: string; message: string }[] = [];
}
async function read(
  path: string,
  portal: Portal,
  body?: unknown,
  csrf?: string,
): Promise<unknown> {
  const response = await fetch("/api/v1" + portalAPIPath(path, portal), {
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: portalHeaders(path, portal),
    ...(body === undefined
      ? {}
      : {
          method: "POST",
          headers: {
            ...portalHeaders(path, portal),
            "Content-Type": "application/json",
            "X-CSRF-Token": csrf ?? "",
          },
          body: JSON.stringify(body),
        }),
  });
  if (response.status === 204) return null;
  // Preserve authority/status even when a proxy returns a non-JSON error page.
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const problem = z
      .object({
        code: z.string(),
        issues: z
          .array(z.object({ path: z.string(), message: z.string() }))
          .optional(),
      })
      .safeParse(result);
    const error = new APIError(
      problem.success
        ? (messages.get(problem.data.code) ??
            "The service is unavailable. Please try again.")
        : "The service is unavailable. Please try again.",
    );
    error.status = response.status;
    if (response.status === 429) {
      const retryAt = retryTime(response.headers.get("Retry-After"));
      if (retryAt !== undefined) {
        error.retryAt = retryAt;
        error.message = `Too many attempts. Try again after ${retryLabel(retryAt)}.`;
      }
    }
    if (problem.success) {
      error.issues = problem.data.issues ?? [];
      error.code = problem.data.code;
    }
    // A freshness challenge does not revoke the signed-in identity. Preserve
    // the form while its contextual dialog is open; actual authority loss still
    // conceals private content, including malformed proxy responses.
    if (response.status === 401 || response.status === 403) {
      if (error.code !== "recent_auth_required")
        notifySession(
          portal,
          error.code === "mfa_required" ? error.code : undefined,
        );
    }
    throw error;
  }
  return result;
}
// Share only simultaneous browser session reads. On first visit two independent
// bootstraps could otherwise set different anonymous cookies and invalidate CSRF.
// No resolved session is cached, and portals never share pending identity data.
const pendingSessions = new Map<Portal, Promise<unknown>>();
if (typeof window !== "undefined")
  window.addEventListener(sessionEvent, (event) => {
    for (const portal of pendingSessions.keys()) {
      if (sessionEventMatches(event, portal)) pendingSessions.delete(portal);
    }
  });
function sessionRead(path: string, portal: Portal): Promise<unknown> {
  if (typeof window === "undefined") return read(path, portal);
  const current = pendingSessions.get(portal);
  if (current) return current;
  const pending = read(path, portal).finally(() => {
    if (pendingSessions.get(portal) === pending) pendingSessions.delete(portal);
  });
  pendingSessions.set(portal, pending);
  return pending;
}
export async function get<T>(
  path: string,
  schema: z.ZodType<T>,
  portal: Portal = activePortal(),
): Promise<T> {
  const sessionPath = portalAPIPath(path, portal).endsWith("/session");
  const result = await (sessionPath
    ? sessionRead(path, portal)
    : read(path, portal));
  if (sessionPath) {
    const session = sessionSchema.parse(result);
    if (session.portal !== portal)
      throw new APIError(
        "Sign-in context changed. Refresh this portal before continuing.",
      );
  }
  return schema.parse(result);
}
export async function post<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  portal: Portal = activePortal(),
  canResume?: () => boolean,
): Promise<T> {
  const returnFocus =
    typeof document !== "undefined" &&
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : undefined;
  const invalid = invalidNumericFields(body);
  if (invalid.length) {
    const error = new APIError(
      "Correct the highlighted number fields before continuing.",
    );
    error.code = "invalid_request";
    error.status = 400;
    error.issues = invalid;
    throw error;
  }
  // Capture one portal for the whole operation, including its CSRF bootstrap.
  // Navigation during the read cancels the action; it never borrows a new portal.
  const route = actionRoute();
  const snapshot: unknown = JSON.parse(JSON.stringify(body));
  const session = await get("/auth/session", sessionSchema, portal);
  if (activePortal() !== portal || actionRoute() !== route)
    throw new APIError(
      "Your portal changed. Return to the action and review it again.",
    );
  let result: T;
  try {
    result = schema.parse(
      await read(path, portal, snapshot, session.csrf_token),
    );
  } catch (error) {
    const enrollment = path === "/auth/mfa/enroll";
    const verificationEndpoint =
      path === "/auth/mfa/verify" ||
      path === "/auth/email/verify" ||
      (path === "/auth/email/request" &&
        typeof snapshot === "object" &&
        snapshot !== null &&
        "purpose" in snapshot &&
        snapshot.purpose === "reauth");
    if (
      !(error instanceof APIError) ||
      error.status !== 403 ||
      error.code !== "recent_auth_required" ||
      !session.user ||
      (session.mfa_required && !enrollment) ||
      verificationEndpoint
    )
      throw error;
    try {
      await verifyAction({
        portal,
        userId: session.user.id,
        email: session.user.email,
        authenticator: session.user.mfa_enabled && !enrollment,
        action: actionLabel(path, snapshot),
        returnFocus,
        route,
      });
    } catch {
      const cancelled = new APIError(
        "Verification was cancelled. Your action was not submitted; your changes are still here.",
      );
      cancelled.code = "verification_cancelled";
      throw cancelled;
    }
    const verified = await get("/auth/session", sessionSchema, portal);
    if (
      activePortal() !== portal ||
      actionRoute() !== route ||
      verified.user?.id !== session.user.id ||
      (verified.mfa_required && !enrollment)
    )
      throw new APIError(
        "Your sign-in or page changed. Review the action again.",
      );
    if (canResume && !canResume())
      throw new APIError(
        "Identity confirmed. Select Reveal again to view this information safely.",
      );
    // Only an explicit pre-mutation freshness rejection permits one retry.
    // Network failures, uncertain responses and a second rejection never replay.
    result = schema.parse(
      await read(path, portal, snapshot, verified.csrf_token),
    );
  }

  if (path === "/auth/logout" || path === "/auth/sessions/revoke")
    notifySession(portal);
  return result;
}
export async function command(
  path: string,
  body: unknown = {},
  portal: Portal = activePortal(),
): Promise<void> {
  await post(path, body, z.null(), portal);
}
export function errorMessage(error: unknown): string {
  return error instanceof APIError
    ? error.message
    : "The service is unavailable. Please try again.";
}

// Protected reads ask only when the user chooses to continue; background polling
// must never summon a verification dialog or replay a mutation.
export const actionVerifiedEvent = "playora:action-verified";
export async function verifyCurrentAction(portal: Portal = activePortal()) {
  const returnFocus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : undefined;
  const route = actionRoute();
  const session = await get("/auth/session", sessionSchema, portal);
  if (
    !session.user ||
    session.mfa_required ||
    activePortal() !== portal ||
    actionRoute() !== route
  )
    throw new APIError("Finish signing in to this workspace first.");
  try {
    await verifyAction({
      portal,
      route,
      userId: session.user.id,
      email: session.user.email,
      authenticator: session.user.mfa_enabled,
      action: "Continue viewing protected information",
      returnFocus,
    });
  } catch {
    throw new APIError(
      "Verification cancelled. You can continue when you’re ready.",
    );
  }
  const verified = await get("/auth/session", sessionSchema, portal);
  if (
    verified.user?.id !== session.user.id ||
    verified.mfa_required ||
    activePortal() !== portal ||
    actionRoute() !== route
  )
    throw new APIError("Your sign-in changed. Review this page again.");
  window.dispatchEvent(
    new CustomEvent(actionVerifiedEvent, { detail: { portal } }),
  );
}
