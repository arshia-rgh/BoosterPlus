import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import OperationsOverview from "./overview";
vi.mock("../orders/resource", () => ({
  useResource: () => ({
    loading: false,
    error: null,
    reload: vi.fn(),
    data: {
      observed_at: "2026-09-13T12:00:00Z",
      cards: [
        {
          key: "waiting",
          label: "Waiting reviews",
          count: 2,
          detail: "Submitted orders",
          href: "/admin/orders?state=submitted",
        },
        {
          key: "empty",
          label: "Quiet queue",
          count: 0,
          detail: "No items",
          href: "/admin/submissions",
        },
      ],
      requests: [],
      sessions: [],
      jobs: [],
      oldest_runnable_at: null,
    },
  }),
}));
it("keeps current work prominent and zero queues available in a disclosure", () => {
  const view = render(
    <MemoryRouter>
      <OperationsOverview />
    </MemoryRouter>,
  );
  expect(screen.getByRole("link", { name: "Waiting reviews" })).toHaveAttribute(
    "href",
    "/admin/orders?state=submitted",
  );
  expect(view.container.querySelectorAll(".operation-metric")).toHaveLength(1);
  expect(
    screen.getByRole("link", { name: "Quiet queue: 0" }),
  ).not.toBeVisible();
  fireEvent.click(screen.getByText("Queues with no current items (1)"));
  expect(screen.getByRole("link", { name: "Quiet queue: 0" })).toHaveAttribute(
    "href",
    "/admin/submissions",
  );
});
