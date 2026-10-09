import { expect, it } from "vitest";
import { kindLabel } from "./model";
it("distinguishes supported financial work without changing unknown-task handling", () => {
  const labels = [
    "payments.refund",
    "payments.payout",
    "payments.seller_obligation",
    "payments.outgoing_reconcile",
  ].map(kindLabel);
  expect(labels).toEqual([
    "Approved customer refund",
    "Approved seller payout",
    "Seller payout eligibility review",
    "Refund and payout evidence reconciliation",
  ]);
  expect(new Set(labels).size).toBe(4);
  expect(kindLabel("unrecognized.private-payload")).toBe(
    "Unsupported background task",
  );
});
