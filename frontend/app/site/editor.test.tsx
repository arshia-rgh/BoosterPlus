import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import { useResource } from "../orders/resource";
import { post, APIError } from "../identity/api";
import ContentEditor from "./editor";
import { defaultHome, type Content } from "./model";
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../identity/frame", async () => {
  const { createContext } = await import("react");
  return {
    AuthorizedIdentity: createContext({ session: { user: { role: "owner" } } }),
  };
});
let current: Content;
beforeEach(() => {
  vi.clearAllMocks();
  current = {
    kind: "home",
    version: 1,
    release_id: "",
    label: "",
    data: defaultHome,
    updated_at: "2026-09-28T00:00:00Z",
  };
  vi.mocked(useResource).mockImplementation((path) => ({
    data: path.includes("history") ? { releases: [], next: "" } : current,
    error: null,
    loading: false,
    reload: vi.fn(),
  }));
});
function setup() {
  const router = createMemoryRouter(
    [
      { path: "/admin/content", element: <ContentEditor /> },
      { path: "/admin", element: <h1>Operations</h1> },
    ],
    { initialEntries: ["/admin/content?kind=home"] },
  );
  render(<RouterProvider router={router} />);
  return router;
}
it("preserves a dirty content draft across preview and prompts before changing kind", async () => {
  setup();
  fireEvent.change(screen.getByLabelText("Headline", { exact: true }), {
    target: { value: "Unsent headline" },
  });
  fireEvent.click(screen.getByRole("link", { name: "Preview & publish" }));
  await screen.findByText(
    "Unsaved changes are not in this preview. Return to Write and save them first.",
  );
  expect(
    screen.getByRole("button", { name: "Publish reviewed content" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("link", { name: "Write" }));
  expect(await screen.findByLabelText("Headline", { exact: true })).toHaveValue(
    "Unsent headline",
  );
  fireEvent.change(screen.getByLabelText("Editor", { exact: true }), {
    target: { value: "retention" },
  });
  await screen.findByText("Keep your content draft?");
  fireEvent.click(screen.getByRole("button", { name: "Keep editing content" }));
  expect(screen.getByLabelText("Headline", { exact: true })).toHaveValue(
    "Unsent headline",
  );
});
it("keeps ordinary edits on version conflict and requires explicit latest-draft discard", async () => {
  setup();
  fireEvent.change(screen.getByLabelText("Headline", { exact: true }), {
    target: { value: "Unsent headline" },
  });
  vi.mocked(post).mockRejectedValue(new APIError("A newer revision exists."));
  fireEvent.click(screen.getByRole("button", { name: "Save private draft" }));
  await screen.findByText("A newer revision exists.");
  expect(screen.getByLabelText("Headline", { exact: true })).toHaveValue(
    "Unsent headline",
  );
  current = {
    ...current,
    version: 2,
    data: { ...defaultHome, headline: "Server headline" },
  };
  fireEvent.click(screen.getByRole("link", { name: "Preview & publish" }));
  fireEvent.click(await screen.findByRole("link", { name: "Write" }));
  await screen.findByText(/A newer saved revision is available/);
  fireEvent.click(
    screen.getByRole("button", {
      name: "Discard local changes and load latest draft",
    }),
  );
  expect(screen.getByLabelText("Headline", { exact: true })).toHaveValue(
    "Server headline",
  );
});
it("publishes only the reviewed saved revision and resets approval afterward", async () => {
  setup();
  fireEvent.click(screen.getByRole("link", { name: "Preview & publish" }));
  await screen.findByRole("heading", { name: "Review saved revision" });
  fireEvent.change(screen.getByLabelText("Unique published version"), {
    target: { value: "reviewed-fixture" },
  });
  fireEvent.click(
    screen.getByLabelText(
      "I reviewed the complete content and approve publication.",
    ),
  );
  expect(
    screen.getByRole("button", { name: "Publish reviewed content" }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByLabelText("I reviewed this saved content preview"),
  );
  fireEvent.click(
    screen.getByLabelText(
      "I reviewed the complete content and approve publication.",
    ),
  );
  vi.mocked(post).mockResolvedValue({
    ...current,
    version: 2,
    label: "reviewed-fixture",
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Publish reviewed content" }),
  );
  await waitFor(() => {
    expect(post).toHaveBeenCalledWith(
      "/admin/site/home",
      {
        version: 1,
        label: "reviewed-fixture",
        data: defaultHome,
        publish: true,
      },
      expect.anything(),
    );
  });
  await screen.findByText("Reviewed content published.");
  expect(
    screen.getByLabelText(
      "I reviewed the complete content and approve publication.",
    ),
  ).not.toBeChecked();
});
