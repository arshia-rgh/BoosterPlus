import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { loadCatalog, loadGame, loadOffering } from "../catalog/loaders.server";
import { loader as gamesLoader, meta as gamesMeta } from "./games";
import Game, { loader as gameLoader, meta as gameMeta } from "./game";
import Service, {
  loader as serviceLoader,
  meta as serviceMeta,
} from "./service";
import Package, {
  loader as packageLoader,
  meta as packageMeta,
} from "./package";
import Admin, { meta as adminMeta } from "./catalog-admin";
vi.mock("../catalog/loaders.server", () => ({
  loadCatalog: vi.fn(),
  loadGame: vi.fn(),
  loadOffering: vi.fn(),
}));
vi.mock("../catalog/public", () => ({
  GameCatalog: () => null,
  GamePage: () => <h1>Game page</h1>,
  ServicePage: () => <h1>Service page</h1>,
  PackagePage: () => <h1>Package page</h1>,
}));
vi.mock("../catalog/admin", () => ({ default: () => <p>Catalog child</p> }));
vi.mock("../identity/identity", () => ({
  default: ({
    capability,
    children,
  }: {
    capability: string;
    children: ReactNode;
  }) => <section aria-label={capability}>{children}</section>,
}));
it("routes catalog requests through authoritative loaders", async () => {
  const request = new Request("http://localhost/games");
  await gamesLoader({ request });
  await gameLoader({ params: { slug: "test" } });
  await serviceLoader({ params: { slug: "test", service: "boost" } });
  await packageLoader({ params: { slug: "test", pack: "fixed" } });
  expect(loadCatalog).toHaveBeenCalledWith(request);
  expect(loadGame).toHaveBeenCalledWith("test");
  expect(loadOffering).toHaveBeenCalledWith("test", "boost", "service");
  expect(loadOffering).toHaveBeenCalledWith("test", "fixed", "package");
  for (const meta of [gamesMeta, gameMeta, serviceMeta, packageMeta, adminMeta])
    expect(meta()[0]?.title).toContain("Booster Plus");
  render(
    <>
      <Game />
      <Service />
      <Package />
      <Admin />
    </>,
  );
  expect(screen.getByRole("heading", { name: "Game page" })).toBeVisible();
  expect(screen.getByRole("region", { name: "admin" })).toHaveTextContent(
    "Catalog child",
  );
});
