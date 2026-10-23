import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useResource } from "../orders/resource";
import { GameShop } from "./public";
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
const originalShow = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  "showModal",
);
const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  "close",
);
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    },
  });
});
afterEach(() => {
  for (const [name, descriptor] of [
    ["showModal", originalShow],
    ["close", originalClose],
  ] as const) {
    if (descriptor)
      Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

function mount(search = "") {
  vi.mocked(useResource).mockImplementation((path) => ({
    data: path.endsWith("/filters")
      ? { regions: ["Global", "Indonesia"], categories: ["Diamonds", "Passes"] }
      : { items: [], next: "page-two" },
    loading: false,
    error: null,
    reload: vi.fn(),
  }));
  const router = createMemoryRouter(
    [
      {
        path: "/games/:slug/shop",
        element: <GameShop />,
        loader: () => ({
          slug: "fixture",
          configuration: {
            discovery: { capabilities: [{ service: "shop", state: "active" }] },
          },
          paused: false,
        }),
      },
    ],
    { initialEntries: ["/games/fixture/shop" + search] },
  );
  render(<RouterProvider router={router} />);
  return router;
}
it("defaults to ascending diamonds and submits sorting with filters, clearing the old cursor", async () => {
  const router = mount("?after=old&q=Diamonds&region=Global&method=id");
  fireEvent.click(await screen.findByRole("button", { name: /^Filters/ }));
  expect(await screen.findByLabelText("Sort by", { exact: true })).toHaveValue(
    "diamonds_asc",
  );
  fireEvent.change(screen.getByLabelText("Sort by", { exact: true }), {
    target: { value: "price_asc" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
  await waitFor(() => {
    expect(router.state.location.search).toContain("sort=price_asc");
  });
  const query = new URLSearchParams(router.state.location.search);
  expect(query.get("q")).toBe("Diamonds");
  expect(query.get("region")).toBe("Global");
  expect(query.get("method")).toBe("id");
  expect(query.has("after")).toBe(false);
  expect(screen.getByRole("link", { name: "Next products" })).toHaveAttribute(
    "href",
    expect.stringContaining("sort=price_asc"),
  );
});
it.each(["diamonds_desc", "price_asc", "price_desc"])(
  "restores %s from the URL and clears to the default",
  async (sort) => {
    const router = mount("?sort=" + sort + "&region=Indonesia");
    fireEvent.click(await screen.findByRole("button", { name: /^Filters/ }));
    expect(
      await screen.findByLabelText("Sort by", { exact: true }),
    ).toHaveValue(sort);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    await waitFor(() => {
      expect(
        new URLSearchParams(router.state.location.search).get("sort"),
      ).toBe("diamonds_asc");
    });
    fireEvent.click(await screen.findByRole("button", { name: /^Filters/ }));
    expect(screen.getByLabelText("Sort by", { exact: true })).toHaveValue(
      "diamonds_asc",
    );
    expect(screen.getByLabelText("Region")).toHaveValue("");
  },
);
