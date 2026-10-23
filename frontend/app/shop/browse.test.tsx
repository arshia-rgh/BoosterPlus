import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { useResource } from "../orders/resource";
import { GameShop } from "./public";
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
afterEach(() => vi.resetAllMocks());
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
  expect(await screen.findByLabelText("Sort by")).toHaveValue("diamonds_asc");
  fireEvent.change(screen.getByLabelText("Sort by"), {
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
    expect(await screen.findByLabelText("Sort by")).toHaveValue(sort);
    fireEvent.click(screen.getByRole("link", { name: "Clear filters" }));
    await waitFor(() => {
      expect(router.state.location.search).toBe("");
    });
    expect(screen.getByLabelText("Sort by")).toHaveValue("diamonds_asc");
    expect(screen.getByLabelText("Region")).toHaveValue("");
  },
);
