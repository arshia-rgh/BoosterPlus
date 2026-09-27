import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import Home, { meta as homeMeta } from "./booster-home";
import Queue, { meta as queueMeta } from "./booster-orders";
import Order, { meta as orderMeta } from "./booster-order";
import StaffCalendar, { meta as staffCalendarMeta } from "./booster-calendar";
import AdminCalendar, { meta as adminCalendarMeta } from "./admin-calendar";
vi.mock("../fulfillment/booster-home", () => ({
  default: () => <p>Assigned work overview</p>,
}));
vi.mock("../fulfillment/calendar", () => ({
  BoosterCalendar: () => <p>Personal availability</p>,
  AdminCalendar: () => <p>Staff availability</p>,
}));
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
  expect(queueMeta()[0]?.title).toContain("PLAYORA");
  expect(orderMeta()[0]?.title).toContain("PLAYORA");
  render(
    <>
      <Queue />
      <Order />
    </>,
  );
  expect(screen.getAllByRole("region", { name: "booster" })).toHaveLength(2);
  expect(screen.getByText("Assigned detail")).toBeVisible();
});

it("protects calendar routes by staff capability", () => {
  expect(staffCalendarMeta()[0]?.title).toContain("PLAYORA");
  expect(adminCalendarMeta()[0]?.title).toContain("PLAYORA");
  render(
    <>
      <StaffCalendar />
      <AdminCalendar />
    </>,
  );
  expect(screen.getByRole("region", { name: "booster" })).toHaveTextContent(
    "Personal availability",
  );
  expect(screen.getByRole("region", { name: "admin" })).toHaveTextContent(
    "Staff availability",
  );
});

it("protects the booster homepage with the booster identity boundary", () => {
  expect(homeMeta()[0]?.title).toBe("Your next session — PLAYORA");
  render(<Home />);
  expect(screen.getByRole("region", { name: "booster" })).toHaveTextContent(
    "Assigned work overview",
  );
});
