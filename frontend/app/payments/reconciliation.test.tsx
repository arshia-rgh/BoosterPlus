import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import Reconciliation from "./reconciliation";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
afterEach(() => vi.clearAllMocks());
const evidence = {
  direction: "incoming",
  payment_id: "123",
  found: true,
  state: "partially_paid",
  issue: "provider_unavailable",
  order_id: "order",
  submission_id: "seller",
  case_id: "",
  transfer_id: "",
  checked_at: "2026-09-27T12:01:00Z",
  observed_at: "2026-09-27T12:00:00Z",
  reading: false,
  job: null,
};
function mount(
  direction = "incoming",
  job: { id: string; state: string; attempts: number } | null = null,
) {
  const reload = vi.fn();
  vi.mocked(useResource).mockReturnValue({
    data: { ...evidence, job },
    loading: false,
    error: null,
    reload,
  });
  function Harness() {
    const [id, setID] = useState("123");
    const [selectedDirection, setDirection] = useState(direction);
    return (
      <Reconciliation
        paymentID={id}
        change={setID}
        direction={selectedDirection}
        setDirection={setDirection}
        done={vi.fn()}
        request={0}
      />
    );
  }
  const router = createMemoryRouter(
    [
      { path: "/admin/finance", element: <Harness /> },
      { path: "/admin/orders/:id", element: <h1>Order detail</h1> },
      { path: "/admin/submissions/:id", element: <h1>Seller detail</h1> },
    ],
    { initialEntries: ["/admin/finance?view=reconcile&filter=all"] },
  );
  render(<RouterProvider router={router} />);
  return { router, reload };
}
it.each(["incoming", "outgoing"])(
  "keeps the inspected %s reference and finance filter in linked record return context",
  async (direction) => {
    const { router } = mount(direction);
    fireEvent.change(screen.getByLabelText("Provider payment ID"), {
      target: { value: "456" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Inspect provider reference" }),
    );
    fireEvent.click(
      screen.getByRole("link", {
        name:
          direction === "incoming"
            ? "Review linked order order"
            : "Review linked seller agreement",
      }),
    );
    await screen.findByRole("heading", {
      name: direction === "incoming" ? "Order detail" : "Seller detail",
    });
    expect(router.state.location.state).toEqual({
      financeSearch: `view=reconcile&filter=all&direction=${direction}&reference=456`,
    });
  },
);
it("locks duplicate pending checks while keeping their status refresh available", () => {
  const { reload } = mount("incoming", {
    id: "job",
    state: "pending",
    attempts: 0,
  });
  expect(screen.getByLabelText("Reason for reconciliation")).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Refresh provider check" }),
  );
  expect(reload).toHaveBeenCalledOnce();
  expect(post).not.toHaveBeenCalled();
});
it("queues an exact inspected reference and refreshes evidence without calling it settled", async () => {
  const { reload } = mount();
  vi.mocked(post).mockResolvedValue({ queued: true });
  fireEvent.change(screen.getByLabelText("Reason for reconciliation"), {
    target: { value: "Review the retained provider reference." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Reconcile payment" }));
  await waitFor(() => {
    expect(reload).toHaveBeenCalled();
  });
  expect(vi.mocked(post).mock.calls[0]?.slice(0, 2)).toEqual([
    "/admin/finance/reconcile",
    { payment_id: "123", reason: "Review the retained provider reference." },
  ]);
  expect(screen.getByText(/Provider check requested/)).toBeInTheDocument();
});
