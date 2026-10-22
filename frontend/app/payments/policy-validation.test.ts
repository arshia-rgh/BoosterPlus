import { paymentRoutes } from "./routes";
import { expect, it } from "vitest";
import { policyIssues } from "./policy-validation";
import { emptyRemedies, remedyLabels, type Policy } from "./model";
const valid: Policy = {
  label: "Approved terms",
  text: "Approved payment terms for all checkout.",
  remedies: {
    ...emptyRemedies,
    ...Object.fromEntries(
      remedyLabels.map(([key]) => [
        key,
        "Approved synthetic remedy terms for customers.",
      ]),
    ),
    dispute_hours: 8760,
    appeal_hours: 720,
    max_appeals: 3,
  },
  currencies: ["USD"],
  routes: [
    { code: "usdtbsc", label: "USDT on BNB Smart Chain", network: "bsc" },
  ],
  fee_mode: "merchant",
  rate_mode: "fixed",
  window_minutes: 15,
};
it("accepts the server's policy and remedy boundary values", () => {
  expect(policyIssues(valid)).toEqual([]);
  expect(
    policyIssues({
      ...valid,
      window_minutes: 1440,
      remedies: {
        ...(valid.remedies ?? emptyRemedies),
        appeal_hours: 0,
        max_appeals: 0,
      },
    }),
  ).toEqual([]);
});
it.each([
  ["label", { label: " " }],
  ["label", { label: "a".repeat(121) }],
  ["text", { text: "short" }],
  ["text", { text: "a".repeat(8001) }],
  ["text", { text: "Approved text containing a null\0character." }],
  ["currencies", { currencies: [] }],
  ["currencies", { currencies: ["USD", "USD"] }],
  ["currencies", { currencies: ["BTC"] }],
  [
    "routes.0.code",
    {
      routes: [
        {
          ...{ code: "usdtbsc", label: "USDT on BNB", network: "bsc" },
          code: "USDT_bsc",
        },
      ],
    },
  ],
  [
    "routes.0.network",
    {
      routes: [
        {
          ...{ code: "usdtbsc", label: "USDT on BNB", network: "bsc" },
          network: " bsc",
        },
      ],
    },
  ],
  [
    "routes.0.label",
    {
      routes: [
        {
          ...{ code: "usdtbsc", label: "USDT on BNB", network: "bsc" },
          label: "",
        },
      ],
    },
  ],
  ["fee_mode", { fee_mode: "other" }],
  ["rate_mode", { rate_mode: "" }],
  ["window_minutes", { window_minutes: 14 }],
  ["window_minutes", { window_minutes: 15.5 }],
  ["remedies.cancellation", { remedies: null }],
  [
    "remedies.appeal_hours",
    { remedies: { ...(valid.remedies ?? emptyRemedies), appeal_hours: 0 } },
  ],
  [
    "remedies.max_appeals",
    { remedies: { ...(valid.remedies ?? emptyRemedies), max_appeals: 4 } },
  ],
] satisfies [string, Partial<Policy>][])(
  "links invalid %s to the correct input",
  (path, patch) => {
    expect(policyIssues({ ...valid, ...patch })).toEqual(
      expect.arrayContaining([expect.objectContaining({ path })]),
    );
  },
);
it("rejects duplicate asset codes even when the labels differ", () => {
  expect(
    policyIssues({
      ...valid,
      routes: [
        ...valid.routes,
        { code: "usdtbsc", label: "Duplicate", network: "bsc" },
      ],
    }),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: "routes.1.code" }),
    ]),
  );
});

it("accepts all 30 reviewed routes and rejects a mismatched chain", () => {
  expect(policyIssues({ ...valid, routes: paymentRoutes })).toEqual([]);
  expect(
    policyIssues({
      ...valid,
      routes: [{ code: "usdc", network: "bsc", label: "USDC" }],
    }),
  ).toContainEqual({
    path: "routes",
    message: "Choose the matching coin and network from the list.",
  });
});

it("allows checkout policies with no configured seller payout routes", () => {
  expect(policyIssues({ ...valid, routes: [] })).toEqual([]);
});
