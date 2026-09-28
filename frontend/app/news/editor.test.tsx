import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import { ArticleEditor } from "./editor";
import { emptyDefinition, type Draft } from "./model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
const id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  reload = vi.fn();
let previewFindings: { path: string; message: string }[] = [];
let row: Draft,
  error: unknown = null;
beforeEach(() => {
  row = {
    id,
    game_id: "game",
    game_name: "Fixture game",
    schedule_state: "",
    version: 1,
    state: "draft",
    revision_id: "first",
    current_revision: "",
    scheduled_revision: "",
    scheduled_at: null,
    published_at: null,
    updated_at: "2026-09-28T00:00:00Z",
    definition: {
      ...emptyDefinition,
      title: "Fixture article",
      reviewed: true,
    },
  };
  error = null;
  previewFindings = [];
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.mocked(useResource).mockImplementation((path) => ({
    data: error
      ? null
      : path.includes("/preview?")
        ? { definition: row.definition, issues: previewFindings }
        : path.includes("/history?")
          ? { items: [], next: 0 }
          : row,
    error,
    loading: false,
    reload,
  }));
});
afterEach(() => vi.clearAllMocks());
function mount(section = "editor") {
  const router = createMemoryRouter(
    [
      { path: "/admin/news/:id", element: <ArticleEditor /> },
      { path: "/admin/news", element: <h1>Article list destination</h1> },
    ],
    {
      initialEntries: [
        {
          pathname: `/admin/news/${id}`,
          search: `?section=${section}`,
          state: { newsSearch: "state=draft&q=fixture" },
        },
      ],
    },
  );
  return { ...render(<RouterProvider router={router} />), router };
}
it("retains article drafts across sections and returns to the filtered list only after discard", async () => {
  const { router } = mount();
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "Private edits" },
  });
  fireEvent.click(screen.getByRole("link", { name: "Publication" }));
  await screen.findByText(
    "Save your draft before making a publication change.",
  );
  fireEvent.click(screen.getByRole("link", { name: "Write" }));
  expect(await screen.findByLabelText("Title")).toHaveValue("Private edits");
  fireEvent.click(screen.getByRole("link", { name: /Back to articles/ }));
  expect(await screen.findByRole("alert")).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Discard and leave" }));
  await screen.findByText("Article list destination");
  expect(router.state.location.search).toBe("?state=draft&q=fixture");
});
it("refreshes a revision conflict without overwriting the working draft", async () => {
  vi.mocked(post).mockRejectedValue(
    Object.assign(new APIError("Changed"), {
      status: 409,
      code: "article_conflict",
    }),
  );
  mount();
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "Keep this edit" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => {
    expect(reload).toHaveBeenCalled();
  });
  expect(screen.getByLabelText("Title")).toHaveValue("Keep this edit");
  expect(
    screen.getByRole("button", { name: "Refresh current article" }),
  ).toBeVisible();
});
it("keeps the leave prompt accessible while a connection failure hides private content", async () => {
  const { router } = mount();
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "Keep this edit" },
  });
  error = Object.assign(new APIError("Unavailable"), { status: 503 });
  await act(async () => {
    await router.navigate("?section=publication");
  });
  await act(async () => {
    await router.navigate("/admin/news");
  });
  expect(
    screen.getByRole("heading", { name: "Leave this article?" }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Discard and leave" }));
  await screen.findByText("Article list destination");
});
it("requires a successful exact saved preview before publication", async () => {
  mount("publication");
  fireEvent.click(
    screen.getByLabelText(
      "I previewed and approve this exact saved revision and publication change",
    ),
  );
  expect(
    screen.getByRole("button", { name: "Publish saved revision now" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("link", { name: "Preview" }));
  await screen.findByRole("heading", { name: "Fixture article" });
  fireEvent.click(screen.getByRole("link", { name: "Publication" }));
  expect(
    await screen.findByRole("button", { name: "Publish saved revision now" }),
  ).toBeEnabled();
});
it("clears private editorial drafts on portal access loss", async () => {
  const { router } = mount();
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "Private text" },
  });
  error = Object.assign(new APIError("Denied"), { status: 403 });
  await act(async () => {
    await router.navigate("?section=history");
  });
  expect(screen.getByText(/Article access changed/)).toBeVisible();
  expect(screen.queryByDisplayValue("Private text")).not.toBeInTheDocument();
});

it("retains preview validation when its correction link returns to the named field", async () => {
  previewFindings = [
    { path: "title", message: "Title is required before publication." },
  ];
  mount("preview");
  const link = await screen.findByRole("link", {
    name: "title: Title is required before publication.",
  });
  fireEvent.click(link);
  const input = await screen.findByLabelText("Title");
  await waitFor(() => {
    expect(input).toHaveFocus();
  });
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(
    screen.getAllByText("Title is required before publication.").length,
  ).toBeGreaterThan(0);
});
