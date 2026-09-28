import {
  activePortal,
  portalAPIPath,
  portalHeaders,
  notifySession,
  sessionEvent,
  sessionEventMatches,
  type Portal,
} from "./portal";
import { retryTime, retryLabel } from "../ui/retry-time";
import { z } from "../validation";
import type { components } from "../api/schema";

export const userSchema: z.ZodType<components["schemas"]["User"]> = z.object({
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
});
export type User = z.infer<typeof userSchema>;
export const sessionSchema: z.ZodType<components["schemas"]["AuthSession"]> =
  z.object({
    portal: z.enum(["customer", "booster", "admin"]),
    user: userSchema.nullable(),
    csrf_token: z.string().min(40),
    google_enabled: z.boolean(),
    google_linked: z.boolean(),
    mfa_required: z.boolean(),
    capabilities: z.array(z.string()),
    terms_version: z.string(),
    terms_url: z.string(),
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
  ["mfa_required", "Verify a fresh authenticator code before continuing."],
  [
    "recent_auth_required",
    "Verify your email or Google account again, then enter a fresh authenticator code.",
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
  if (
    (response.status === 401 || response.status === 403) &&
    typeof window !== "undefined"
  )
    notifySession(portal);
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
): Promise<T> {
  // Capture one portal for the whole operation, including its CSRF bootstrap.
  // Navigation during the read cancels the action; it never borrows a new portal.
  const session = await get("/auth/session", sessionSchema, portal);
  if (activePortal() !== portal)
    throw new APIError(
      "Your portal changed. Return to the action and review it again.",
    );
  const result = schema.parse(
    await read(path, portal, body, session.csrf_token),
  );
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
