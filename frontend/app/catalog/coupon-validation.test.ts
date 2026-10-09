import { expect, it } from "vitest";
import { couponIssues } from "./coupon-validation";
const valid = {
  code: "WELCOME",
  name: "Welcome coupon",
  enabled: false,
  kind: "percentage",
  value: "5",
  currency: "USD",
  starts_at: "2026-10-08T00:00:00Z",
  ends_at: "2026-10-09T00:00:00Z",
  minimum_subtotal: "0",
  maximum_discount: "",
  global_limit: 0,
  customer_limit: 1,
  games: [],
  services: [],
  packages: [],
  categories: ["boosting"],
};
it("accepts explicit coupon terms, bounded percentages and whole fixed minor units", () => {
  expect(couponIssues(valid)).toEqual([]);
  expect(couponIssues({ ...valid, kind: "fixed", value: "100.00" })).toEqual(
    [],
  );
});
it.each([
  ["value", "100.1"],
  ["value", "1e2"],
  ["value", "0005"],
  ["value", "1.1234567"],
  ["minimum_subtotal", "-1"],
  ["maximum_discount", "0"],
  ["starts_at", "2026-10-08T00:00:00"],
  ["ends_at", "2026-10-07T00:00:00Z"],
  ["global_limit", Number.NaN],
  ["customer_limit", 1.5],
  ["games", ["mlbb", "mlbb"]],
  ["categories", []],
])(
  "rejects invalid %s without normalizing away the owner's input",
  (path, value) => {
    expect(couponIssues({ ...valid, [path]: value })).toEqual(
      expect.arrayContaining([expect.objectContaining({ path })]),
    );
  },
);
it("requires explicit games for restricted services and whole fixed values", () => {
  expect(couponIssues({ ...valid, services: ["rank_boost"] })).toEqual(
    expect.arrayContaining([expect.objectContaining({ path: "games" })]),
  );
  expect(couponIssues({ ...valid, kind: "fixed", value: "1.5" })).toEqual(
    expect.arrayContaining([expect.objectContaining({ path: "value" })]),
  );
});
