import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import GameAccounts, {
  meta as gameAccountsMeta,
  loader as gameAccountsLoader,
} from "./game-accounts";
import GameAccount, {
  meta as gameAccountMeta,
  loader as gameAccountLoader,
} from "./game-account";
import { loadGame } from "../catalog/loaders.server";
import Market, { meta as marketMeta } from "./accounts";
import Product, { meta as productMeta } from "./account-product";
import Inventory, { meta as inventoryMeta } from "./accounts-admin";
import Editor, { meta as editorMeta } from "./account-listing-admin";
import Wanted, { meta as wantedMeta } from "./wanted-accounts-admin";
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
vi.mock("../resale/wanted-admin", () => ({
  WantedAccountsAdmin: () => <p>Wanted accounts workspace</p>,
}));
vi.mock("../resale/inventory", () => ({
  AccountInventory: () => <p>Private account inventory</p>,
  InventoryDetail: () => <p>Reviewed listing editor</p>,
}));
it("exposes public listings and protects both inventory routes", () => {
  for (const meta of [
    marketMeta,
    productMeta,
    inventoryMeta,
    editorMeta,
    wantedMeta,
  ])
    expect(meta()[0]?.title).toContain("PLAYORA");
  render(
    <>
      <Market />
      <Product />
      <Inventory />
      <Editor />
      <Wanted />
    </>,
  );
  expect(screen.getAllByRole("region", { name: "admin" })).toHaveLength(3);
  expect(screen.getByText("Wanted accounts workspace")).toBeVisible();
  expect(screen.getByText("Available account market")).toBeVisible();
  expect(screen.getByText("Public product agreement")).toBeVisible();
  expect(screen.getByText("Reviewed listing editor")).toBeVisible();
});

vi.mock("../catalog/game-accounts", () => ({
  GameAccounts: ({ detail }: { detail?: boolean }) => (
    <p>{detail ? "Embedded detail" : "Embedded market"}</p>
  ),
}));
vi.mock("../catalog/loaders.server", () => ({ loadGame: vi.fn() }));
it("binds account browsing routes to the authoritative game loader", async () => {
  await gameAccountsLoader({ params: { slug: "example" } });
  await gameAccountLoader({ params: { slug: "example", id: "listing" } });
  expect(loadGame).toHaveBeenCalledWith("example");
  for (const meta of [gameAccountsMeta, gameAccountMeta])
    expect(meta()[0]?.title).toContain("PLAYORA");
  render(
    <>
      <GameAccounts />
      <GameAccount />
    </>,
  );
  expect(screen.getByText("Embedded market")).toBeVisible();
  expect(screen.getByText("Embedded detail")).toBeVisible();
});
