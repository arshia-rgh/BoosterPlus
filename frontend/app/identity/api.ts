import { z } from "zod";
import type { components } from "../api/schema";

export const userSchema: z.ZodType<components["schemas"]["User"]> = z.object({
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
      created_at: z.string(),
      last_seen_at: z.string(),
      expires_at: z.string(),
      current: z.boolean(),
    }),
  ),
});
export const auditsSchema = z.object({
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
  issues: { path: string; message: string }[] = [];
}
async function read(
  path: string,
  body?: unknown,
  csrf?: string,
): Promise<unknown> {
  const response = await fetch("/api/v1" + path, {
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    ...(body === undefined
      ? {}
      : {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrf ?? "",
          },
          body: JSON.stringify(body),
        }),
  });
  if (response.status === 204) return null;
  const result: unknown = await response.json();
  if (!response.ok) {
    if (
      (response.status === 401 || response.status === 403) &&
      typeof window !== "undefined"
    )
      window.dispatchEvent(new Event("boosterplus:session-changed"));
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
    if (problem.success) {
      error.issues = problem.data.issues ?? [];
      error.code = problem.data.code;
    }
    throw error;
  }
  return result;
}
export async function get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  return schema.parse(await read(path));
}
export async function post<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
): Promise<T> {
  // A fresh token follows session rotation and remains in memory only.
  const session = await get("/auth/session", sessionSchema);
  return schema.parse(await read(path, body, session.csrf_token));
}
export async function command(path: string, body: unknown = {}): Promise<void> {
  await post(path, body, z.null());
}
export function errorMessage(error: unknown): string {
  return error instanceof APIError
    ? error.message
    : "The service is unavailable. Please try again.";
}
