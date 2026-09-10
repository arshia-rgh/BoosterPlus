import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import Queue, { meta as queueMeta } from "./booster-orders";
import Order, { meta as orderMeta } from "./booster-order";
vi.mock("../identity/identity", () => ({
  default: ({
    capability,
    children,
  }: {
    capability: string;
    children: ReactNode;
  }) => <section aria-label={capability}>{children}</section>,
}));
vi.mock("../fulfillment/panel", () => ({
  BoosterQueue: () => <p>Assigned queue</p>,
  BoosterOrder: () => <p>Assigned detail</p>,
}));
it("requires booster authentication for assigned work routes", () => {
  expect(queueMeta()[0]?.title).toContain("Booster Plus");
  expect(orderMeta()[0]?.title).toContain("Booster Plus");
  render(
    <>
      <Queue />
      <Order />
    </>,
  );
  expect(screen.getAllByRole("region", { name: "booster" })).toHaveLength(2);
  expect(screen.getByText("Assigned detail")).toBeVisible();
});
