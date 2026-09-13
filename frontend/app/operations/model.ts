import { z } from "../validation";
export const jobStateSchema = z.enum([
  "pending",
  "running",
  "failed",
  "complete",
]);
export const jobSchema = z.object({
  id: z.string(),
  kind: z.string(),
  state: jobStateSchema,
  attempts: z.number().int(),
  max_attempts: z.number().int(),
  retry_generation: z.number().int(),
  error_code: z.string(),
  created_at: z.string(),
  available_at: z.string(),
  lease_until: z.string().nullable(),
  retryable: z.boolean(),
});
export const listingSchema = z.object({
  items: z.array(jobSchema),
  next: z.string(),
});
const item = z.object({
  label: z.string(),
  state: z.string(),
  href: z.string(),
  at: z.string(),
});
export const overviewSchema = z.object({
  observed_at: z.string(),
  cards: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      count: z.number().int().nonnegative(),
      detail: z.string(),
      href: z.string(),
    }),
  ),
  requests: z.array(item),
  sessions: z.array(item),
  jobs: z.array(jobSchema),
  oldest_runnable_at: z.string().nullable(),
});
export type Job = z.infer<typeof jobSchema>;
export function kindLabel(kind: string) {
  switch (kind) {
    case "payments.invoice":
      return "Crypto invoice creation";
    case "payments.reconcile":
      return "Payment evidence reconciliation";
    case "system.ping":
      return "Worker connectivity check";
    case "identity.email":
      return "Sign-in or security email";
    case "activity.email":
      return "Account activity email";
    case "media.scan":
      return "Private image safety check";
    case "availability.changed":
      return "Availability update";
    case "availability.fanout":
      return "Matching availability alerts";
    case "availability.email":
      return "Availability email";
    default:
      return "Unsupported background task";
  }
}
export function stateLabel(state: z.infer<typeof jobStateSchema>) {
  switch (state) {
    case "pending":
      return "Scheduled";
    case "running":
      return "Running";
    case "failed":
      return "Needs attention";
    case "complete":
      return "Complete";
  }
}
export function failureLabel(code: string) {
  switch (code) {
    case "":
      return "No recorded failure";
    case "handler_failed":
      return "The task could not finish successfully.";
    case "lease_exhausted":
      return "Worker claims expired and exhausted the automatic retry allowance.";
    default:
      return "An internal failure needs operator investigation.";
  }
}
