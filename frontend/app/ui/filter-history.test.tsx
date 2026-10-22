import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, it, vi } from "vitest";
import { Articles } from "../news/list";
import { ShopProducts } from "../shop/list";
vi.mock("../orders/resource", () => ({
  useResource: (path: string) => ({
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
          ? { games: [], next: "" }
          : { items: [], next: "" },
    error: null,
    loading: false,
    reload: vi.fn(),
  }),
}));
function deferred() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
it.each([
  {
    path: "/admin/shop",
    View: ShopProducts,
    label: "Search products by title or reference",
    submit: "Search products",
    author: false,
  },
  {
    path: "/admin/news",
    View: Articles,
    label: "Search article title or reference",
    submit: "Search articles",
    author: true,
  },
])(
  "$path preserves newer typing through delayed multiple submissions but restores history",
  async ({ path, View, label, submit, author }) => {
    const first = deferred(),
      second = deferred();
    const router = createMemoryRouter(
      [
        {
          path,
          element: <View />,
          HydrateFallback: () => <p>Loading filters</p>,
          loader: async ({ request }) => {
            const q = new URL(request.url).searchParams.get("q");
            if (q === "First") await first.promise;
            if (q === "Second") await second.promise;
            return null;
          },
        },
      ],
      { initialEntries: [path + "?q=Start" + (author ? "&author=Owner" : "")] },
    );
    render(<RouterProvider router={router} />);
    const input = await screen.findByLabelText(label);
    const change = (value: string) => {
      fireEvent.change(input, { target: { value } });
      if (author)
        fireEvent.change(screen.getByLabelText("Author filter"), {
          target: { value },
        });
    };
    change("First");
    fireEvent.click(screen.getByRole("button", { name: submit }));
    await waitFor(() => {
      expect(router.state.navigation.location?.search).toContain("q=First");
    });
    change("Second");
    fireEvent.click(screen.getByRole("button", { name: submit }));
    await waitFor(() => {
      expect(router.state.navigation.location?.search).toContain("q=Second");
    });
    change("Newer typing");
    await act(async () => {
      first.release();
      second.release();
      await Promise.all([first.promise, second.promise]);
    });
    await waitFor(() => {
      expect(router.state.navigation.state).toBe("idle");
    });
    expect(router.state.location.search).toContain("q=Second");
    expect(input).toHaveValue("Newer typing");
    if (author)
      expect(screen.getByLabelText("Author filter")).toHaveValue(
        "Newer typing",
      );
    await act(async () => {
      await router.navigate(-1);
    });
    expect(input).toHaveValue("Start");
    if (author)
      expect(screen.getByLabelText("Author filter")).toHaveValue("Owner");
    await act(async () => {
      await router.navigate(1);
    });
    expect(input).toHaveValue("Second");
    if (author)
      expect(screen.getByLabelText("Author filter")).toHaveValue("Second");
  },
);
