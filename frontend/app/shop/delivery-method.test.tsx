import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import { supplierProduct } from "../../tests/fixtures/supplier-shop/data";
import { ProductFields } from "./fields";
import { ProductPreview } from "./preview";
import {
  productDeliveryLabel,
  supplierContractDelivery,
} from "./delivery-method";
import { emptyDefinition } from "./model";
import { Agreement } from "../orders/parts";
import type { Commercial } from "../orders/model";

it.each([
  ["id", "Instant top-up"],
  ["code", "Instant code delivery"],
  ["account", "Account sign-in · 24–72 hours"],
] as const)(
  "shows the %s delivery category without an hours form",
  (method, label) => {
    const value = supplierProduct(method).definition;
    if (method !== "account")
      value.policy.delivery_min_hours = value.policy.delivery_max_hours = 0;
    render(
      <MemoryRouter>
        <ProductFields section="terms" value={value} change={vi.fn()} />
        <ProductPreview value={value} />
        <section aria-label="Supplier requirements">
          <ProductFields section="variants" value={value} change={vi.fn()} />
        </section>
      </MemoryRouter>,
    );
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    expect(
      within(
        screen.getByRole("region", { name: "Supplier requirements" }),
      ).getByText(label),
    ).toBeVisible();
    expect(
      screen.queryByLabelText("Minimum delivery hours"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Maximum delivery hours"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("0–0 hours")).not.toBeInTheDocument();
  },
);

it("preserves manual hours and historic supplier estimates", () => {
  render(
    <ProductFields
      section="terms"
      value={emptyDefinition()}
      change={vi.fn()}
    />,
  );
  expect(screen.getByLabelText("Minimum delivery hours")).toBeVisible();
  expect(screen.getByLabelText("Maximum delivery hours")).toBeVisible();
  const historical = supplierProduct("id").definition;
  historical.policy.delivery_min_hours = 1;
  historical.policy.delivery_max_hours = 24;
  expect(productDeliveryLabel(historical)).toBe("1–24 hours");
  expect(supplierContractDelivery(undefined)).toBeNull();
  expect(supplierContractDelivery("payment_and_access_v1")).toBeNull();
  expect(supplierContractDelivery("supplier_instant_code_v1")).toBe(
    "Instant code delivery",
  );
});

const acceptedTerms: Commercial = {
  quote_id: "synthetic-quote",
  revision: 1,
  currency: "USD",
  subtotal_minor: "1234",
  amount_minor: "1234",
  lines: [],
  scope: "Synthetic supplier product",
  reason: "Accepted delivery terms remain unchanged.",
  delivery_min_hours: 1,
  delivery_max_hours: 24,
  expires_at: "2099-01-01T00:00:00Z",
  terms_version: "synthetic-terms-v1",
};

it.each([
  ["supplier_instant_id_v1", "Instant top-up", 0, 0],
  ["supplier_instant_code_v1", "Instant code delivery", 0, 0],
  ["supplier_account_24_72_v1", "Account sign-in · 24–72 hours", 24, 72],
] as const)(
  "renders the accepted %s category without a numeric instant estimate",
  (basis, label, minimum, maximum) => {
    render(
      <MemoryRouter>
        <Agreement
          data={{
            ...acceptedTerms,
            delivery_basis: basis,
            delivery_min_hours: minimum,
            delivery_max_hours: maximum,
          }}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(
        `${label} after verified payment and complete required details. Follow the order status for confirmed delivery.`,
      ),
    ).toBeVisible();
    expect(screen.queryByText(/0–0 hours/)).not.toBeInTheDocument();
    expect(screen.getByText(acceptedTerms.reason)).toBeVisible();
  },
);

it("keeps historical accepted estimates without adopting the instant category", () => {
  render(
    <MemoryRouter>
      <Agreement data={acceptedTerms} />
    </MemoryRouter>,
  );
  expect(
    screen.getByText(
      "Delivery estimate: 1–24 hours after fulfillment can start.",
    ),
  ).toBeVisible();
  expect(
    screen.queryByText(/Instant top-up|Instant code delivery/),
  ).not.toBeInTheDocument();
  expect(screen.getByText(acceptedTerms.reason)).toBeVisible();
});
