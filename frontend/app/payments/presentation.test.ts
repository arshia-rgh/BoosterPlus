import { expect, it } from "vitest";
import {
  effectiveInstructionStatus,
  instructionTitle,
  transferPresentation,
} from "./presentation";
it.each(["seller", "customer"] as const)(
  "identifies the %s as the payee in staff transfer guidance",
  (payee) => {
    expect(transferPresentation("recipient_pending", payee).title).toBe(
      `Waiting for the ${payee}'s destination`,
    );
    expect(transferPresentation("verified", payee).description).toContain(
      `The ${payee}'s destination is confirmed`,
    );
    expect(transferPresentation("recipient_pending").title).toBe(
      "Your destination is needed",
    );
    expect(transferPresentation("verified").description).toContain(
      "Your destination is confirmed",
    );
  },
);
it("uses provider expiry, freshness and connection state consistently", () => {
  const now = Date.parse("2026-09-27T12:00:00Z");
  const attempt = {
    instruction_status: "ready",
    expires_at: new Date(now + 600000).toISOString(),
    deposit: {
      expires_at: new Date(now + 180000).toISOString(),
      checked_at: new Date(now).toISOString(),
      valid_until: new Date(now + 120000).toISOString(),
    },
  };
  expect(effectiveInstructionStatus(attempt, now, false)).toBe("ready");
  expect(effectiveInstructionStatus(attempt, now, true)).toBe("refreshing");
  expect(effectiveInstructionStatus(attempt, now + 120000, false)).toBe(
    "refreshing",
  );
  const expired = effectiveInstructionStatus(attempt, now + 180000, false);
  expect(expired).toBe("expired");
  expect(instructionTitle(expired)).toBe("Deposit window ended");
  expect(effectiveInstructionStatus(attempt, NaN, false)).toBe("refreshing");
  expect(
    effectiveInstructionStatus({ ...attempt, deposit: null }, now, false),
  ).toBe("refreshing");
});
