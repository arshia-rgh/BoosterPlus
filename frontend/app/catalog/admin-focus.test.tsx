import { useLayoutEffect } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { APIError, get, post } from "../identity/api";
import { useResource } from "../orders/resource";
import CatalogAdmin from "./admin";
import { emptyConfiguration, type Draft } from "./model";

vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));

const id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const frames = new Map<number, FrameRequestCallback>();
let sequence = 0;

beforeEach(() => {
  const draft: Draft = {
    id,
    slug: "synthetic-game",
    revision: 1,
    published: false,
    paused: false,
    archived: false,
    current_release: "",
    configuration: emptyConfiguration("Synthetic game"),
  };
  vi.mocked(get).mockResolvedValue(draft);
  vi.mocked(useResource).mockReturnValue({
    data: { games: [], next: "" },
    loading: false,
    error: null,
    reload: vi.fn(),
  });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++sequence, callback);
    return sequence;
  });
  vi.stubGlobal("cancelAnimationFrame", (frame: number) => {
    frames.delete(frame);
  });
});
afterEach(() => {
  frames.clear();
  sequence = 0;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function BeforeSectionEffects() {
  const location = useLocation();
  useLayoutEffect(() => {
    // Reproduce the observed browser ordering: the invalid field has focus when
    // React's passive section effect starts. Keep animation frames controlled so
    // a later callback cannot repair stolen focus and conceal the regression.
    const invalid = document.querySelector<HTMLInputElement>(
      'input[name="name"][aria-invalid="true"]',
    );
    if (invalid && !invalid.closest("[hidden]")) invalid.focus();
  }, [location]);
  return <CatalogAdmin />;
}

function mount() {
  const router = createMemoryRouter(
    [{ path: "/admin/catalog", element: <BeforeSectionEffects /> }],
    { initialEntries: [`/admin/catalog?game=${id}`] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

it("retains validation field focus when the section effect runs after the reveal frame", async () => {
  vi.mocked(post).mockRejectedValue(
    Object.assign(new APIError("Check the highlighted catalog issues."), {
      status: 422,
      issues: [{ path: "name", message: "Enter a game name." }],
    }),
  );
  const router = mount();
  const name = await screen.findByLabelText("Game name");
  fireEvent.change(name, { target: { value: "" } });
  fireEvent.change(screen.getByLabelText("Game description"), {
    target: { value: "Keep this unsaved description." },
  });
  fireEvent.click(screen.getByRole("link", { name: "FAQ" }));
  await waitFor(() => expect(name).not.toBeVisible());
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => {
    expect(router.state.location.search).toContain("section=catalog-basics");
    expect(name).toBeVisible();
    expect(name).toHaveFocus();
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("Enter a game name.");
  });
  // The field can briefly have focus while the later passive effect is pending.
  // Check again after React settles, not only at the first matching instant.
  await act(async () => {
    await Promise.resolve();
  });
  expect(name).toHaveFocus();
  expect(screen.getByLabelText("Game description")).toHaveValue(
    "Keep this unsaved description.",
  );
  expect(post).toHaveBeenCalledOnce();
  expect(frames.size).toBeGreaterThan(0);
});

it("focuses the newly selected section during ordinary catalog navigation", async () => {
  mount();
  const name = await screen.findByLabelText("Game name");
  name.focus();
  fireEvent.click(screen.getByRole("link", { name: "FAQ" }));
  await waitFor(() => {
    expect(name).not.toBeVisible();
    expect(document.getElementById("catalog-faq")).toHaveFocus();
  });
  fireEvent.click(screen.getByRole("link", { name: "Game & ranks" }));
  await waitFor(() => {
    expect(name).toBeVisible();
    expect(
      screen.getByRole("region", { name: "Game and rank references" }),
    ).toHaveFocus();
  });
  expect(post).not.toHaveBeenCalled();
});
