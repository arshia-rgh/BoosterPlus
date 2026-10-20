import type { Portal } from "./portal";

export type VerificationRequest = {
  portal: Portal;
  userId: string;
  email: string;
  authenticator: boolean;
  action: string;
  route: string;
  returnFocus?: HTMLElement | undefined;
};
type Handler = (request: VerificationRequest) => Promise<void>;
let handler: Handler | undefined;
let pending = false;

// Only the mounted portal owns this in-memory interaction. No action, code or
// identity is persisted, and concurrent clicks cannot queue hidden mutations.
export function registerVerification(next: Handler) {
  handler = next;
  return () => {
    if (handler === next) handler = undefined;
  };
}
export async function verifyAction(request: VerificationRequest) {
  if (!handler || pending)
    throw new Error("Verification is unavailable or already open.");
  pending = true;
  try {
    await handler(request);
  } finally {
    pending = false;
  }
}
export function actionRoute() {
  return typeof window === "undefined"
    ? ""
    : window.location.pathname + window.location.search + window.location.hash;
}
export function actionLabel(path: string, body?: unknown) {
  const action =
    typeof body === "object" && body !== null && "action" in body
      ? body.action
      : null;
  if (path.startsWith("/admin/finance/") && path.endsWith("/reconcile"))
    return "Check this payment with the provider";
  if (path.endsWith("/finance/policy"))
    return action === "publish"
      ? "Publish the payment policy"
      : "Save the payment policy draft";
  if (path.includes("/users/") && path.endsWith("/role"))
    return "Change this staff account’s role";
  if (path.includes("/suspension")) return "Change this account’s access";
  if (path.includes("/staff")) return "Invite a staff account";
  if (path.endsWith("/sessions/revoke")) return "Revoke the selected sessions";
  if (path.includes("/mfa/enroll")) return "Set up your authenticator";
  if (path.includes("/mfa/disable")) return "Remove your authenticator";
  if (path.includes("/mfa/recovery-codes"))
    return "Replace your recovery codes";
  if (path.includes("/recovery")) return "Review account recovery";
  if (path.includes("/email/")) return "Update your email address";
  if (path.includes("/google/")) return "Update your Google connection";
  if (path.includes("/reveal")) return "View protected account information";
  const financial = path.includes("/refund")
    ? "refund"
    : path.includes("/payout")
      ? "seller payout"
      : null;
  if (financial) {
    if (path.endsWith("/manual"))
      return "Record this completed external seller payout";
    if (path.endsWith("/approve")) return `Approve this ${financial}`;
    if (path.endsWith("/verify")) return `Verify this ${financial} transfer`;
    if (path.endsWith("/cancel")) return `Cancel this ${financial}`;
    return `Update this ${financial}`;
  }
  if (path.includes("/privacy")) return "Continue this privacy request";
  if (path.includes("/articles") || path.includes("/news"))
    return "Update this game article";
  if (path.includes("/catalog")) return "Update this game catalog";
  if (/^\/orders\/[^/]+\/shop\/codes$/.test(path))
    return "Reveal your purchased codes";
  if (/^\/orders\/[^/]+\/shop\/action$/.test(path))
    return "Open your protected delivery action";
  if (/^\/admin\/shop\/suppliers\/[^/]+\/purchasing$/.test(path))
    return "Change Sandbox purchasing";
  if (path.includes("/shop")) return "Update this shop record";
  if (path.includes("/quote")) return "Update this order’s quote";
  if (path.includes("/reports")) return "Download the reviewed report";
  if (path.includes("/jobs")) return "Retry the reviewed background task";
  if (path.includes("/media")) return "Update this uploaded image";
  if (path.includes("/reviews")) return "Moderate this customer review";
  if (path.includes("/coordination") || path.includes("/sharing"))
    return "Update this order’s shared conversation";
  if (path.includes("/fulfillment")) return "Update this fulfillment record";
  if (path.includes("/submissions")) return "Review this account submission";
  if (path.includes("/publish")) return "Publish the reviewed changes";
  return "Confirm your requested action";
}
