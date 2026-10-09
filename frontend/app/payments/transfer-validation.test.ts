import { expect, it } from "vitest";
import { recipientIssues, refundProposalIssues } from "./transfer-validation";

it("guides recipient syntax without claiming to verify a blockchain destination", () => {
  expect(recipientIssues("synthetic-address", "")).toEqual([]);
  expect(
    recipientIssues("bad address", "x\n").map((issue) => issue.path),
  ).toEqual(["address", "memo"]);
  expect(recipientIssues("x".repeat(256), "x".repeat(128))).toEqual([]);
  expect(recipientIssues("x".repeat(257), "é".repeat(65))).toHaveLength(2);
});
it.each([
  "0",
  "0.00",
  "0e99",
  "-1",
  "01",
  "1.",
  "NaN",
  "1e100",
  "1".repeat(41),
])("rejects invalid refund amount %s", (amount) => {
  expect(
    refundProposalIssues(true, amount, "An agreed synthetic refund."),
  ).toEqual(
    expect.arrayContaining([expect.objectContaining({ path: "amount" })]),
  );
});
it.each(["1", "0.000000000000000001", "1.23e-18", "1".repeat(40)])(
  "preserves exact valid refund amount %s",
  (amount) => {
    expect(
      refundProposalIssues(true, amount, "An agreed synthetic refund."),
    ).toEqual([]);
  },
);
it("requires a retained confirmed receipt and bounded terms", () => {
  expect(
    refundProposalIssues(false, "1", "short").map((issue) => issue.path),
  ).toEqual(["receipt_id", "terms"]);
});
