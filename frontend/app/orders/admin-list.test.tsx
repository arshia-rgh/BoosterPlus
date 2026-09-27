import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, Link } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { get } from "../identity/api";
import OrderList from "./list";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
const scrollToRow = vi.fn();
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    value: scrollToRow,
    configurable: true,
  });
});
afterEach(() => {
  vi.clearAllMocks();
  Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});
const order = {
  id: "11111111-1111-4111-8111-111111111111",
  version: 1,
  kind: "custom",
  state: "submitted",
  slug: "game",
  service: "boost",
  package: "",
  variant: "",
  game_name: "Test game",
  created_at: "2026-09-27T00:00:00Z",
  updated_at: "2026-09-27T00:00:00Z",
  staff: {
    customer_id: "customer123",
    assigned_id: "staff123456",
    payment_state: "no_agreement",
  },
};
function Detail() {
  const location = useLocation();
  const state = location.state as { orderListSearch: string };
  return (
    <Link to={"/admin/orders?" + state.orderListSearch}>Return to queue</Link>
  );
}
it("shows staff triage and returns from a named local action to the same queue filters", async () => {
  vi.mocked(get).mockResolvedValue({ orders: [order], next: "" });
  render(
    <MemoryRouter initialEntries={["/admin/orders?game=game&state=submitted"]}>
      <Routes>
        <Route path="/admin/orders" element={<OrderList admin />} />
        <Route path="/admin/orders/:id" element={<Detail />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText("Customer customer")).toBeInTheDocument();
  expect(screen.getByText("Assignee staff123")).toBeInTheDocument();
  expect(screen.getByText("Payment: no agreement")).toBeInTheDocument();
  const action = screen.getByRole("link", { name: "Review request" });
  expect(action).toHaveAttribute(
    "href",
    "/admin/orders/" + order.id + "?section=request",
  );
  fireEvent.click(action);
  fireEvent.click(screen.getByRole("link", { name: "Return to queue" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Game slug")).toHaveValue("game");
  });
  expect(screen.getByLabelText("Order status")).toHaveValue("submitted");
  await screen.findByText("Customer customer");
  await waitFor(() => {
    expect(scrollToRow).toHaveBeenCalled();
  });
});
it("uses staff no-match recovery for advanced filters", async () => {
  vi.mocked(get).mockResolvedValue({ orders: [], next: "" });
  render(
    <MemoryRouter initialEntries={["/admin/orders?assigned=unassigned"]}>
      <OrderList admin />
    </MemoryRouter>,
  );
  expect(
    await screen.findByText(/No orders match the current queue filters/),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Clear order filters" }),
  ).toBeInTheDocument();
});
