import { expect, it } from "vitest";
import { financeReturn, relatedRecord } from "./finance-context";
it("restores a bounded finance queue instead of a supplied destination", () => {
  expect(
    financeReturn({
      financeSearch:
        "view=cases&casesAfter=abc_123&returnTo=https://other.example&secret=private",
    }),
  ).toBe("/admin/finance?view=cases&casesAfter=abc_123");
  expect(
    financeReturn({
      financeSearch: "view=unknown&filter=all&after=%3Cscript%3E",
    }),
  ).toBe("/admin/finance?view=payments&filter=all");
  expect(
    financeReturn({ financeSearch: "view=payouts&payoutAfter=cursor" }),
  ).toBe("/admin/finance?view=payouts&payoutAfter=cursor");
});
it("rejects invalid navigation state", () => {
  expect(financeReturn(null)).toBeNull();
  expect(financeReturn({ financeSearch: 42 })).toBeNull();
  expect(financeReturn({ financeSearch: "a".repeat(2049) })).toBeNull();
});

it("restores only validated related records and local listing sections", () => {
  const id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  expect(
    relatedRecord(
      { inventoryID: id, inventorySection: "terms" },
      "inventoryID",
    ),
  ).toBe(`/admin/accounts/${id}?section=terms`);
  expect(
    relatedRecord({ inventoryID: "//external.example" }, "inventoryID"),
  ).toBeNull();
  expect(
    relatedRecord(
      { inventoryID: id, inventorySection: "unknown" },
      "inventoryID",
    ),
  ).toBeNull();
  expect(relatedRecord({ submissionID: id }, "submissionID")).toBe(
    `/admin/submissions/${id}?section=handover`,
  );
});
