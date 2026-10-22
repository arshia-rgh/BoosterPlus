import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ShopProducts } from "./list";
import { useResource } from "../orders/resource";
import { post } from "../identity/api";
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(useResource).mockImplementation((path) => ({
    data:
      path === "/admin/shop/price-sync"
        ? {
            interval_minutes: 480,
            configured: true,
            last_run: null,
            next_check_at: null,
            attention_count: 0,
            attention: [],
            repriced: [],
          }
        : path.startsWith("/admin/catalog")
          ? {
              games: [
                { id: "game-a", name: "Game A", archived: false },
                { id: "game-b", name: "Game B", archived: false },
              ],
              next: "",
            }
          : {
              items: [
                {
                  id: "item-a",
                  title: "Named item",
                  game: "Game A",
                  state: "draft",
                  version: 1,
                },
              ],
              next: "",
            },
    error: null,
    loading: false,
    reload: vi.fn(),
  }));
});
afterEach(() => vi.clearAllMocks());
function mount() {
  const router = createMemoryRouter(
    [
      { path: "/admin/shop", element: <ShopProducts /> },
      { path: "/admin/shop/:id", element: <h1>Product editor destination</h1> },
    ],
    { initialEntries: ["/admin/shop?state=draft&after=old-cursor"] },
  );
  return { ...render(<RouterProvider router={router} />), router };
}
it("applies game and search filters before pagination and retains named return context", async () => {
  const { router } = mount();
  fireEvent.change(screen.getByLabelText("Game filter"), {
    target: { value: "game-b" },
  });
  await waitFor(() => {
    expect(router.state.location.search).toBe("?state=draft&game=game-b");
  });
  fireEvent.change(
    screen.getByLabelText("Search products by title or reference"),
    { target: { value: "Named" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Search products" }));
  fireEvent.click(screen.getByRole("link", { name: "Edit Named item" }));
  await screen.findByText("Product editor destination");
  expect(router.state.location.state).toEqual({
    shopSearch: "q=Named&state=draft&game=game-b",
  });
});
it("guards cancellation and route departure while creating a new product", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "New product draft" }));
  fireEvent.change(screen.getByLabelText("New product title"), {
    target: { value: "Unsaved new item" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Cancel new product" }));
  expect(await screen.findByRole("alert")).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Keep new product" }));
  fireEvent.click(screen.getByRole("link", { name: "Edit Named item" }));
  expect(
    await screen.findByRole("heading", { name: "Discard this new product?" }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Discard new product" }));
  await screen.findByText("Product editor destination");
  expect(post).not.toHaveBeenCalled();
});
it("creates only a private draft and enters its named editor without a discard prompt", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "New product draft" }));
  fireEvent.change(screen.getByLabelText("Product game"), {
    target: { value: "game-a" },
  });
  fireEvent.change(screen.getByLabelText("New product title"), {
    target: { value: "New item" },
  });
  vi.mocked(post).mockResolvedValue({ id: "new-product" });
  fireEvent.click(screen.getByRole("button", { name: "Create product draft" }));
  await screen.findByText("Product editor destination");
  expect(post).toHaveBeenCalledWith(
    "/admin/shop/products",
    expect.objectContaining({
      game_id: "game-a",
      definition: expect.objectContaining({
        title: "New item",
        reviewed: false,
        variants: [],
      }) as unknown,
    }),
    expect.anything(),
  );
});

it("restores committed search through browser history without wiping drafts on unrelated filters", async () => {
  const { router } = mount();
  const input = screen.getByLabelText("Search products by title or reference");
  fireEvent.change(input, { target: { value: "First item" } });
  fireEvent.click(screen.getByRole("button", { name: "Search products" }));
  await waitFor(() => {
    expect(router.state.location.search).toContain("q=First+item");
  });
  fireEvent.change(input, { target: { value: "Second item" } });
  fireEvent.click(screen.getByRole("button", { name: "Search products" }));
  await waitFor(() => {
    expect(router.state.location.search).toContain("q=Second+item");
  });
  await act(async () => {
    await router.navigate(-1);
  });
  expect(input).toHaveValue("First item");
  await act(async () => {
    await router.navigate(1);
  });
  expect(input).toHaveValue("Second item");
  fireEvent.change(input, { target: { value: "Unsubmitted draft" } });
  fireEvent.change(screen.getByLabelText("Game filter"), {
    target: { value: "game-b" },
  });
  await waitFor(() => {
    expect(router.state.location.search).toContain("game=game-b");
  });
  expect(input).toHaveValue("Unsubmitted draft");
});
