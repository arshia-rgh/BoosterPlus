import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { useResource } from "../orders/resource";
import { Assignment } from "./actions";

vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
afterEach(() => vi.resetAllMocks());
it("explains the enrollment prerequisite and supports refresh without enabling an empty assignment", () => {
  const reload = vi.fn();
  vi.mocked(useResource).mockReturnValue({
    data: { staff: [] },
    loading: false,
    error: null,
    reload,
  });
  const view = render(
    <MemoryRouter>
      <Assignment
        id="synthetic"
        orderVersion={1}
        work={null}
        reload={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "finish authenticator setup in the Pro panel",
  );
  expect(
    screen.getByRole("button", { name: "Save assignment" }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Refresh eligible boosters" }),
  );
  expect(reload).toHaveBeenCalledOnce();
  vi.mocked(useResource).mockReturnValue({
    data: {
      staff: [
        { id: "synthetic-booster", alias: "Ready booster", role: "booster" },
      ],
    },
    loading: false,
    error: null,
    reload,
  });
  view.rerender(
    <MemoryRouter>
      <Assignment
        id="synthetic"
        orderVersion={1}
        work={null}
        reload={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByRole("option", { name: /Ready booster/ })).toBeVisible();
  expect(screen.getByRole("button", { name: "Save assignment" })).toBeEnabled();
});
