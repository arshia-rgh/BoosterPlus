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
export function transferPresentation(
  state: string,
  recipient: "you" | "seller" | "customer" = "you",
) {
  if (recipient !== "you" && state === "recipient_pending")
    return {
      title: `Waiting for the ${recipient}'s destination`,
      description: `The ${recipient} must review the asset, network and terms and confirm their receiving address. No funds have been sent.`,
    };
  if (recipient !== "you" && state === "verified")
    return {
      title: "Waiting for owner approval",
      description: `The ${recipient}'s destination is confirmed. Review the exact transfer before owner approval. No funds have been sent yet.`,
    };
  const value = transferDescriptions.get(state);
  return {
    title: value?.[0] ?? "Transfer under review",
    description:
      value?.[1] ??
      (recipient === "you"
        ? "Contact support for the current status. This record does not confirm that funds were sent."
        : "Review the transfer evidence for the current status. This record does not confirm that funds were sent."),
  };
}

export function manualPayoutPresentation(
  recording: { available: boolean; reason: string },
  timedHold: boolean,
  inspectionOnly: boolean,
) {
  if (recording.available)
    return {
      title: "Ready for staff payout",
      description:
        "Your destination is confirmed and current eligibility checks have passed. PLAYORA must arrange and record the external transfer; no completed transfer is recorded yet.",
    };
  if (recording.reason === "eligibility_hold")
    return {
      title: timedHold
        ? inspectionOnly
          ? "Waiting for buyer inspection"
          : "Waiting for the agreed payout date"
        : "Payout on hold",
      description: timedHold
        ? "Your destination is confirmed. PLAYORA will recheck the accepted payout conditions after the waiting period; no completed transfer is recorded yet."
        : "PLAYORA must resolve the remaining sale or case requirements before payout. Your destination is confirmed; no completed transfer is recorded yet.",
    };
  return {
    title:
      recording.reason === "provider_attempt"
        ? "Existing transfer under review"
        : "Payout needs staff review",
    description:
      "PLAYORA must review the transfer requirements before recording a payout. This status does not confirm that funds were sent.",
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

export function instructionTitle(status: string, expired = false) {
  if (expired || status === "expired") return "Deposit window ended";
  switch (status) {
    case "ready":
      return "Complete your payment";
    case "refreshing":
      return "Refreshing payment instructions";
    case "review_required":
      return "Checking with the provider";
    case "closed":
      return "Payment instructions closed";
    default:
      return "Preparing payment instructions";
  }
}
export function instructionMessage(status: string, expired = false) {
  if (expired || status === "expired")
    return "Do not send using expired instructions. If you already paid, wait for reconciliation or contact support before sending anything else.";
  switch (status) {
    case "ready":
      return "Use the exact amount, asset and network below. Payment is confirmed separately after the provider verifies received funds.";
    case "refreshing":
      return "Instructions are temporarily hidden while fresh provider information is checked. Do not pay again if you already sent funds.";
    case "review_required":
      return "The provider result needs reconciliation. Your existing checkout is retained; do not start another payment.";
    case "closed":
      return "Do not send funds using these instructions. Your payment history remains available.";
    default:
      return "We are requesting and checking your destination with the provider. No payment has been confirmed.";
  }
}

export function effectiveInstructionStatus(
  attempt: {
    instruction_status: string;
    expires_at: string;
    deposit: {
      expires_at: string;
      valid_until: string;
      checked_at: string;
    } | null;
  },
  now: number,
  unavailable: boolean,
) {
  if (
    ["closed", "review_required", "expired"].includes(
      attempt.instruction_status,
    )
  )
    return attempt.instruction_status;
  if (!Number.isFinite(now)) return "refreshing";
  const expiry = Math.min(
    Date.parse(attempt.expires_at),
    attempt.deposit ? Date.parse(attempt.deposit.expires_at) : Infinity,
  );
  if (!Number.isFinite(expiry) || now >= expiry) return "expired";
  if (unavailable) return "refreshing";
  if (attempt.instruction_status === "ready") {
    if (
      !attempt.deposit ||
      now >= Date.parse(attempt.deposit.valid_until) ||
      now < Date.parse(attempt.deposit.checked_at)
    )
      return "refreshing";
  }
  return attempt.instruction_status;
}
