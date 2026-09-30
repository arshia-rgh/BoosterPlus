import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, it, vi } from "vitest";
import { Articles } from "./list";
vi.mock("../orders/resource", () => ({
  useResource: (path: string) => ({
    data: path.startsWith("/admin/catalog")
      ? { games: [], next: "" }
      : { items: [], next: "" },
    error: null,
    loading: false,
    reload: vi.fn(),
  }),
}));
it("restores title and author filters through history while preserving unrelated unsaved typing", async () => {
  const router = createMemoryRouter(
    [{ path: "/admin/news", element: <Articles /> }],
    {
      initialEntries: ["/admin/news?q=First&author=Writer"],
    },
  );
  render(<RouterProvider router={router} />);
  const title = screen.getByLabelText("Search article title or reference");
  const author = screen.getByLabelText("Author filter");
  fireEvent.change(title, { target: { value: "Second" } });
  fireEvent.change(author, { target: { value: "Editor" } });
  fireEvent.click(screen.getByRole("button", { name: "Search articles" }));
  await waitFor(() => {
    expect(router.state.location.search).toBe("?q=Second&author=Editor");
  });
  await act(async () => {
    await router.navigate(-1);
  });
  expect(title).toHaveValue("First");
  expect(author).toHaveValue("Writer");
  await act(async () => {
    await router.navigate(1);
  });
  expect(title).toHaveValue("Second");
  expect(author).toHaveValue("Editor");
  fireEvent.change(title, { target: { value: "Unsubmitted title" } });
  fireEvent.change(author, { target: { value: "Unsubmitted author" } });
  fireEvent.change(screen.getByLabelText("Article state"), {
    target: { value: "published" },
  });
  await waitFor(() => {
    expect(router.state.location.search).toContain("state=published");
  });
  expect(title).toHaveValue("Unsubmitted title");
  expect(author).toHaveValue("Unsubmitted author");
});
