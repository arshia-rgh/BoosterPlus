import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useResource } from "../orders/resource";
import { emptyDefinition } from "../shop/model";
import type { Promotion } from "./discovery-model";
import ShopPromotionTarget from "./shop-promotion-target";
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
afterEach(() => vi.resetAllMocks());
const initial: Promotion = {
  key: "offer",
  title: "Offer",
  description: "",
  enabled: false,
  target: "shop",
  package: "",
  variant: "item",
  product_id: "product",
  listing_id: "",
  release_id: "old",
  coupon_code: "",
  coupon_version: 0,
  starts_at: "",
  ends_at: "",
  priority: 0,
  show_quantity: false,
};
function Harness() {
  const [value, change] = useState(initial);
  return (
    <>
      <ShopPromotionTarget
        slug="game"
        value={value}
        change={(patch) => {
          change((old) => ({ ...old, ...patch }));
        }}
      />
      <output>
        {value.release_id}:{value.variant}
      </output>
    </>
  );
}
function mock(revised = false) {
  vi.mocked(useResource).mockImplementation((path) => ({
    loading: false,
    error: null,
    reload: vi.fn(),
    data: path.endsWith("/product")
      ? {
          id: "product",
          release_id: revised ? "new" : "old",
          version: 3,
          definition: {
            ...emptyDefinition(),
            title: "Named selected item",
            variants: [
              {
                key: "item",
                label: "Gold",
                region: "EU",
                platform: "PC",
                server: "Realm",
                enabled: true,
                min_quantity: 2,
                unit_amount_minor: "1234",
                currency: "USD",
              },
            ],
          },
        }
      : { items: [], next: path.endsWith("after=") ? "next" : "" },
  }));
}
it("keeps named selected-product and variant details when paging beyond their list page", () => {
  mock();
  render(<Harness />);
  expect(
    screen.getByRole("heading", { name: "Named selected item" }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "More products" }));
  expect(screen.getByLabelText("Shop variant")).toHaveValue("item");
  expect(
    screen.getByRole("option", {
      name: "Gold · EU · PC · Realm · 2 × USD 12.34",
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Named selected item" }),
  ).toBeVisible();
});
it("requires an explicit replacement when the saved release has changed", () => {
  mock(true);
  render(<Harness />);
  expect(screen.getByLabelText("Shop variant")).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent("old:item");
  fireEvent.click(
    screen.getByRole("button", { name: "Use current published revision" }),
  );
  expect(screen.getByRole("status")).toHaveTextContent("new:");
  expect(screen.getByLabelText("Shop variant")).toBeEnabled();
});
