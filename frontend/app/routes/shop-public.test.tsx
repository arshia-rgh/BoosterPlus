import { render, screen } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import Browse, { meta as browseMeta } from "./game-shop";
import Product, { meta as productMeta } from "./game-shop-product";
import Queue, { meta as queueMeta } from "./shop-orders-admin";
vi.mock("../shop/public", () => ({
  GameShop: ({ detail = false }: { detail?: boolean }) => (
    <p>{detail ? "Published product" : "Published shop"}</p>
  ),
}));
vi.mock("../shop/queue", () => ({
  default: () => <p>Manual delivery queue</p>,
}));
vi.mock("../identity/identity", () => ({
  default: ({
    children,
    capability,
  }: {
    children: ReactNode;
    capability: string;
  }) => <section aria-label={capability}>{children}</section>,
}));
it("mounts game-local shop routes and a protected manual delivery queue", () => {
  for (const meta of [browseMeta, productMeta, queueMeta])
    expect(meta()[0]?.title).toContain("PLAYORA");
  render(
    <>
      <Browse />
      <Product />
      <Queue />
    </>,
  );
  expect(screen.getByText("Published product")).toBeVisible();
  expect(screen.getByText("Published shop")).toBeVisible();
  expect(screen.getByRole("region", { name: "admin" })).toHaveTextContent(
    "Manual delivery queue",
  );
});
