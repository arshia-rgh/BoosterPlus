import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import Orders, { meta as ordersMeta } from "./orders";
import Order, { meta as orderMeta } from "./order";
import AdminOrders, { meta as adminOrdersMeta } from "./orders-admin";
import AdminOrder, { meta as adminOrderMeta } from "./order-admin";
import Favorites, { meta as favoritesMeta } from "./favorites";
vi.mock("../identity/identity", () => ({
  default: ({
    capability,
    children,
  }: {
    capability: string;
    children: ReactNode;
  }) => <section aria-label={capability}>{children}</section>,
}));
vi.mock("../orders/list", () => ({
  default: ({ admin = false }: { admin?: boolean }) => (
    <p>{admin ? "Admin queue" : "My order history"}</p>
  ),
}));
vi.mock("../orders/detail", () => ({
  default: ({ admin = false }: { admin?: boolean }) => (
    <p>{admin ? "Admin order" : "Customer order"}</p>
  ),
}));
vi.mock("../orders/favorites", () => ({ default: () => <p>My favorites</p> }));
it("keeps customer and administrator routes behind distinct identity capabilities", () => {
  for (const meta of [
    ordersMeta,
    orderMeta,
    adminOrdersMeta,
    adminOrderMeta,
    favoritesMeta,
  ])
    expect(meta()[0]?.title).toContain("PLAYORA");
  render(
    <>
      <Orders />
      <Order />
      <AdminOrders />
      <AdminOrder />
      <Favorites />
    </>,
  );
  expect(screen.getAllByRole("region", { name: "account" })).toHaveLength(3);
  expect(screen.getAllByRole("region", { name: "admin" })).toHaveLength(2);
  expect(
    screen.getByText("Admin queue").closest("section"),
  ).toHaveAccessibleName("admin");
  expect(
    screen.getByText("Customer order").closest("section"),
  ).toHaveAccessibleName("account");
});
