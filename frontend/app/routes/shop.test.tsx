import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import List, { meta as listMeta } from "./shop-admin";
import Editor, { meta as editorMeta } from "./shop-product-admin";
vi.mock("../identity/identity", () => ({
  default: ({
    children,
    capability,
  }: {
    children: ReactNode;
    capability: string;
  }) => <section aria-label={capability}>{children}</section>,
}));
vi.mock("../shop/list", () => ({
  ShopProducts: () => <p>Private shop catalog</p>,
}));
vi.mock("../shop/editor", () => ({
  ShopProductEditor: () => <p>Product authoring workspace</p>,
}));
it("protects shop authoring routes with separate administrator identity", () => {
  expect(listMeta()[0]?.title).toContain("PLAYORA");
  expect(editorMeta()[0]?.title).toContain("PLAYORA");
  render(
    <>
      <List />
      <Editor />
    </>,
  );
  expect(screen.getAllByRole("region", { name: "admin" })).toHaveLength(2);
  expect(screen.getByText("Private shop catalog")).toBeVisible();
  expect(screen.getByText("Product authoring workspace")).toBeVisible();
});
