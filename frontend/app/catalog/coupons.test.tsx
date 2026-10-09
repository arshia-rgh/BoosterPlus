import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, it, vi } from "vitest";
import { get, post, APIError } from "../identity/api";
import Coupons from "./coupons";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
  post: vi.fn(),
}));
it("distinguishes load failure from empty and resets visible scope only on explicit current-revision load", async () => {
  const definition = {
    code: "FIXTURE",
    name: "Fixture coupon",
    enabled: false,
    kind: "percentage",
    value: "5",
    currency: "USD",
    starts_at: "2026-09-28T00:00:00Z",
    ends_at: "2026-10-28T00:00:00Z",
    minimum_subtotal: "0",
    maximum_discount: "",
    global_limit: 0,
    customer_limit: 1,
    games: ["old-game"],
    services: ["old-service"],
    packages: [],
    categories: ["boosting"],
  };
  const old = { id: "coupon", version: 1, definition };
  vi.mocked(get)
    .mockRejectedValueOnce(new APIError("Temporary outage"))
    .mockResolvedValueOnce({ coupons: [old], next: "" })
    .mockResolvedValueOnce({
      coupons: [
        {
          ...old,
          version: 2,
          definition: {
            ...definition,
            games: ["current-game"],
            services: ["current-service"],
          },
        },
      ],
    });
  const router = createMemoryRouter(
    [{ path: "/admin/coupons", element: <Coupons /> }],
    { initialEntries: ["/admin/coupons"] },
  );
  render(<RouterProvider router={router} />);
  await screen.findByText("Temporary outage");
  expect(
    screen.queryByText("No coupons have been configured."),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Refresh coupon list" }));
  fireEvent.click(await screen.findByRole("button", { name: "Edit FIXTURE" }));
  fireEvent.change(screen.getByLabelText("Eligible game slugs"), {
    target: { value: "unsaved-game" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Check current coupon revision" }),
  );
  await screen.findByRole("region", { name: "Newer coupon revision" });
  expect(screen.getByLabelText("Eligible game slugs")).toHaveValue(
    "unsaved-game",
  );
  expect(screen.getByRole("button", { name: "Save coupon" })).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", {
      name: "Discard local changes and load current coupon",
    }),
  );
  expect(screen.getByLabelText("Eligible game slugs")).toHaveValue(
    "current-game",
  );
  expect(screen.getByLabelText("Eligible service keys")).toHaveValue(
    "current-service",
  );
});
it("names invalid coupon fields and preserves raw numbers without sending a stale valid limit", async () => {
  vi.mocked(get).mockResolvedValue({ coupons: [], next: "" });
  const router = createMemoryRouter(
    [{ path: "/admin/coupons", element: <Coupons /> }],
    { initialEntries: ["/admin/coupons"] },
  );
  render(<RouterProvider router={router} />);
  await screen.findByText("No coupons have been configured.");
  fireEvent.click(screen.getByRole("button", { name: "New coupon" }));
  fireEvent.change(screen.getByLabelText("Coupon name"), {
    target: { value: "Keep my coupon" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save coupon" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Coupon code")).toHaveFocus(),
  );
  expect(screen.getByLabelText("Coupon name")).toHaveValue("Keep my coupon");
  expect(
    screen.getByRole("link", { name: /Coupon code: Use 3–40/ }),
  ).toBeVisible();
  expect(post).not.toHaveBeenCalled();
});
