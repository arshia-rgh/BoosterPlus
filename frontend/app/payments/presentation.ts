const paymentTitles = new Map([
  ["new", "Preparing checkout"],
  ["creating", "Preparing checkout"],
  ["uncertain", "Checking with the provider"],
  ["awaiting_payment", "Ready for your payment"],
  ["confirming", "Payment is being confirmed"],
  ["settled", "Payment verified"],
  ["closed", "Checkout closed"],
]);
export function paymentTitle(state: string, issue: string, expired = false) {
  if (state === "settled" && issue === "overpaid")
    return "Payment verified · extra funds under review";
  if (issue) return "Payment needs review";
  if (state === "awaiting_payment" && expired) return "Checkout window ended";
  return paymentTitles.get(state) ?? "Payment needs review";
}
const transferDescriptions = new Map([
  [
    "recipient_pending",
    [
      "Your destination is needed",
      "Check the exact asset, network and terms below, then confirm your receiving address.",
    ],
  ],
  [
    "verified",
    [
      "Waiting for owner approval",
      "Your destination is confirmed. No funds have been sent yet.",
    ],
  ],
  [
    "approved",
    [
      "Approved for processing",
      "Owner authorization is recorded. Provider confirmation is still required.",
    ],
  ],
  [
    "creating",
    ["Preparing transfer", "The transfer is being prepared with the provider."],
  ],
  [
    "issuing",
    ["Preparing transfer", "The transfer is being prepared with the provider."],
  ],
  [
    "uncertain",
    [
      "Checking with the provider",
      "The result is not confirmed yet. Staff must reconcile the existing attempt before another transfer.",
    ],
  ],
  [
    "awaiting_verification",
    [
      "Waiting for provider authorization",
      "The owner must complete the provider's verification before funds can be sent.",
    ],
  ],
  [
    "processing",
    [
      "Transfer in progress",
      "The provider is processing the transfer. It is not confirmed yet.",
    ],
  ],
  [
    "confirmed",
    ["Transfer confirmed", "The provider confirmed this outgoing transfer."],
  ],
  [
    "failed",
    [
      "Transfer needs attention",
      "The attempt failed. Staff must reconcile it before approving a new attempt.",
    ],
  ],
  [
    "cancelled",
    [
      "Proposal cancelled",
      "This proposal was cancelled before a transfer was issued.",
    ],
  ],
]);
export function transferPresentation(state: string) {
  const value = transferDescriptions.get(state);
  return {
    title: value?.[0] ?? "Transfer under review",
    description:
      value?.[1] ??
      "Contact support for the current status. This record does not confirm that funds were sent.",
  };
}
export function caseNextStep(state: string, admin: boolean) {
  if (state === "closed")
    return "This case is closed. The agreed resolution and history remain available below.";
  if (state === "decided")
    return admin
      ? "A resolution is proposed. Wait for customer acceptance or the applicable appeal window."
      : "Review the proposed resolution. You can accept it or appeal within the displayed deadline.";
  return admin
    ? "Review the customer's evidence and propose a resolution. Replies are visible to the customer."
    : "The support team is reviewing your case. Add relevant details below; active work stays on hold.";
}
