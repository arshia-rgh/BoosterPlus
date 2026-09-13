import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import Market, { meta as marketMeta } from "./accounts";
import Product, { meta as productMeta } from "./account-product";
import Inventory, { meta as inventoryMeta } from "./accounts-admin";
import Editor, { meta as editorMeta } from "./account-listing-admin";
vi.mock("../identity/identity", () => ({
  default: ({
    children,
    capability,
  }: {
    children: ReactNode;
    capability: string;
  }) => <section aria-label={capability}>{children}</section>,
}));
vi.mock("../resale/market", () => ({
  AccountMarket: () => <p>Available account market</p>,
  AccountProduct: () => <p>Public product agreement</p>,
}));
vi.mock("../resale/inventory", () => ({
  AccountInventory: () => <p>Private account inventory</p>,
  InventoryDetail: () => <p>Reviewed listing editor</p>,
}));
it("exposes public listings and protects both inventory routes", () => {
  for (const meta of [marketMeta, productMeta, inventoryMeta, editorMeta])
    expect(meta()[0]?.title).toContain("PLAYORA");
  render(
    <>
      <Market />
      <Product />
      <Inventory />
      <Editor />
    </>,
  );
  expect(screen.getAllByRole("region", { name: "admin" })).toHaveLength(2);
  expect(screen.getByText("Available account market")).toBeVisible();
  expect(screen.getByText("Public product agreement")).toBeVisible();
  expect(screen.getByText("Reviewed listing editor")).toBeVisible();
});
