import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import Queue, { meta as queueMeta } from "./booster-orders";
import Order, { meta as orderMeta } from "./booster-order";
import StaffCalendar, { meta as staffCalendarMeta } from "./booster-calendar";
import AdminCalendar, { meta as adminCalendarMeta } from "./admin-calendar";
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

it("protects calendar routes by staff capability", () => {
  expect(staffCalendarMeta()[0]?.title).toContain("Booster Plus");
  expect(adminCalendarMeta()[0]?.title).toContain("Booster Plus");
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
