import { expect, it } from "vitest";
import { sellerIssues, productIssues } from "./validation";
import type { SellerTerms, Product } from "./model";
const terms: SellerTerms = {
  model: "consignment",
  currency: "usdtbsc",
  network: "bsc",
  amount: "10.00001",
  proceeds_basis: "The exact agreed net proceeds",
  fees: "The agreed fees are described here",
  transfer_requirements: "Complete protected ownership transfer",
  dispute_terms: "The agreed dispute review procedure",
  withdrawal_terms: "The agreed withdrawal procedure",
  payout_delay_hours: 0,
  payout_deadline_hours: 24,
};
const product: Product = {
  title: "Reviewed account",
  description: "A complete reviewed account description",
  region: "Europe",
  rank: "Advanced",
  currency: "USD",
  amount_minor: "1000",
  attributes: [],
  media_ids: [],
  sale_terms: terms.proceeds_basis,
  transfer_requirements: terms.transfer_requirements,
  dispute_terms: terms.dispute_terms,
  acknowledgement_terms: terms.withdrawal_terms,
  dispute_hours: 24,
  delivery_min_hours: 1,
  delivery_max_hours: 24,
};
it("validates exact provider decimals and order of payout obligations", () => {
  const now = Date.parse("2026-10-08T00:00:00Z"),
    expires = "2026-10-09T00:00:00Z";
  expect(sellerIssues(terms, expires, now)).toEqual([]);
  expect(sellerIssues({ ...terms, amount: "1e-8" }, expires, now)).toEqual([]);
  for (const amount of [
    "0",
    "0e5",
    "1e100",
    "1.2.3",
    "Infinity",
    "-1",
    "1".repeat(41),
  ])
    expect(sellerIssues({ ...terms, amount }, expires, now)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "terms.amount" }),
      ]),
    );
  expect(
    sellerIssues({ ...terms, payout_delay_hours: 24 }, expires, now),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: "terms.payout_deadline_hours" }),
    ]),
  );
  expect(sellerIssues(terms, "bad", now)).toEqual(
    expect.arrayContaining([expect.objectContaining({ path: "expires_at" })]),
  );
});
it("validates listing bounds, duplicate labels and Unicode using server code-point limits", () => {
  expect(productIssues(product)).toEqual([]);
  expect(productIssues({ ...product, title: "🎮".repeat(120) })).toEqual([]);
  const invalid = productIssues({
    ...product,
    delivery_max_hours: 0,
    dispute_hours: Number.NaN,
    amount_minor: "1.2",
    attributes: [
      { label: "Rank", value: "One" },
      { label: "Rank", value: "Two" },
    ],
  });
  expect(invalid.map((issue) => issue.path)).toEqual(
    expect.arrayContaining([
      "product.delivery_max_hours",
      "product.dispute_hours",
      "product.amount_minor",
      "product.attributes.1.label",
    ]),
  );
});
