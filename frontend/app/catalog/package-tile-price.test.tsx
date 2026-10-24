import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PackageTilePrice } from "./package-tile-price";
import type { Package, Variant } from "./model";
const variant = (
  amount: string,
  overrides: Partial<Variant> = {},
): Variant => ({
  key: amount,
  name: "Option",
  currency: "USD",
  amount_minor: amount,
  delivery_min_hours: 24,
  delivery_max_hours: 48,
  required_fields: [],
  preset_answers: {},
  ...overrides,
});
const pack = (variants: Variant[]): Package => ({
  key: "pack",
  service: "boost",
  name: "Climb",
  description: "Scope stays on detail page",
  variants,
});
it("shows the full available range without advertising a sold-out lower price", () => {
  render(
    <PackageTilePrice
      pack={pack([
        variant("100", { capacity: 0 }),
        variant("2500"),
        variant("3500"),
      ])}
    />,
  );
  expect(screen.getByText("USD 25.00 – 35.00")).toBeVisible();
  expect(screen.getByText("2 available options")).toBeVisible();
  expect(screen.queryByText(/1.00/)).not.toBeInTheDocument();
});
it("keeps currencies separate and reports unavailable options honestly", () => {
  render(
    <PackageTilePrice
      pack={pack([
        variant("2000", { capacity: 0 }),
        variant("1800", { capacity: 0, currency: "EUR" }),
      ])}
    />,
  );
  expect(screen.getByText("USD 20.00")).toBeVisible();
  expect(screen.getByText("EUR 18.00")).toBeVisible();
  expect(screen.getByText("Currently unavailable")).toBeVisible();
});
it("does not crash or invent a price for an unreviewed legacy option", () => {
  const v = variant("bad");
  delete v.preset_answers;
  render(<PackageTilePrice pack={pack([v])} />);
  expect(screen.getByText("Price awaiting review")).toBeVisible();
  expect(screen.getByText("Being reviewed")).toBeVisible();
});

it("keeps a single package concise while identifying its delivery estimate", () => {
  render(<PackageTilePrice pack={pack([variant("2500")])} />);
  expect(screen.getByText("Estimated 24–48h")).toBeVisible();
  expect(
    screen.queryByText("Fixed scope · fixed price"),
  ).not.toBeInTheDocument();
});
