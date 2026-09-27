import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import { InventoryDetail } from "./inventory";
import type { Listing } from "./model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
const id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const fixture: Listing = {
  id,
  submission_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  offer_id: "offer",
  version: 1,
  state: "draft",
  game: "Game",
  slug: "game",
  release_id: "",
  draft: {
    title: "Reviewed listing",
    description: "Ordinary account description",
    region: "Europe",
    rank: "Advanced",
    attributes: [],
    media_ids: [],
    currency: "USD",
    amount_minor: "5000",
    sale_terms: "Sale terms",
    transfer_requirements: "Protected delivery",
    dispute_terms: "Dispute terms",
    acknowledgement_terms: "Confirm receipt",
    dispute_hours: 48,
    delivery_min_hours: 1,
    delivery_max_hours: 24,
  },
};
const reload = vi.fn();
let row: Listing;
let error: unknown = null;
beforeEach(() => {
  row = structuredClone(fixture);
  error = null;
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.mocked(useResource).mockImplementation((path) => ({
    data: path.startsWith("/admin/account-listings/") && !error ? row : null,
    error: path.startsWith("/admin/account-listings/") ? error : null,
    loading: false,
    reload,
  }));
});
afterEach(() => vi.clearAllMocks());
function mount() {
  const router = createMemoryRouter(
    [
      { path: "/admin/accounts/:id", element: <InventoryDetail /> },
      {
        path: "/admin/submissions/:id",
        element: <h1>Seller agreement destination</h1>,
      },
    ],
    {
      initialEntries: [
        {
          pathname: `/admin/accounts/${id}`,
          search: "?section=details",
          state: { inventorySearch: "state=draft&after=cursor" },
        },
      ],
    },
  );
  return { ...render(<RouterProvider router={router} />), router };
}
it("keeps local listing drafts and requires an explicit choice before leaving the record", async () => {
  const { router } = mount();
  fireEvent.change(screen.getByLabelText("Public account title"), {
    target: { value: "Unsaved listing title" },
  });
  fireEvent.click(screen.getByRole("link", { name: "Buyer terms" }));
  await screen.findByLabelText("Buyer sale terms");
  fireEvent.click(screen.getByRole("link", { name: "Listing details" }));
  expect(await screen.findByLabelText("Public account title")).toHaveValue(
    "Unsaved listing title",
  );
  fireEvent.click(
    screen.getByRole("link", {
      name: "Private seller agreement and ownership review",
    }),
  );
  expect(await screen.findByRole("alert")).toHaveFocus();
  expect(router.state.location.pathname).toBe(`/admin/accounts/${id}`);
  fireEvent.click(screen.getByRole("button", { name: "Stay with this draft" }));
  expect(screen.getByLabelText("Public account title")).toHaveValue(
    "Unsaved listing title",
  );
  fireEvent.click(
    screen.getByRole("link", {
      name: "Private seller agreement and ownership review",
    }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Discard draft and leave" }),
  );
  await screen.findByRole("heading", { name: "Seller agreement destination" });
  expect(router.state.location.state).toEqual({
    inventoryID: id,
    inventorySection: "details",
    inventorySearch: "state=draft&after=cursor",
  });
  expect(post).not.toHaveBeenCalled();
});
it("retains an ordinary draft during a recoverable failure but removes it after access loss", async () => {
  const view = mount();
  fireEvent.change(screen.getByLabelText("Public account title"), {
    target: { value: "Retained ordinary draft" },
  });
  error = Object.assign(new APIError("Connection unavailable"), {
    status: 503,
  });
  view.rerender(<RouterProvider router={view.router} />);
  // A local navigation forces the resource consumer to observe the changed fixture.
  await act(async () => {
    await view.router.navigate(`?section=terms`);
  });
  expect(screen.getByText(/listing is hidden while/)).toBeVisible();
  error = null;
  await act(async () => {
    await view.router.navigate(`?section=details`);
  });
  expect(await screen.findByLabelText("Public account title")).toHaveValue(
    "Retained ordinary draft",
  );
  error = Object.assign(new APIError("Access denied"), { status: 403 });
  await act(async () => {
    await view.router.navigate(`?section=terms`);
  });
  expect(await screen.findByText(/Inventory access changed/)).toBeVisible();
  expect(
    screen.queryByDisplayValue("Retained ordinary draft"),
  ).not.toBeInTheDocument();
});
it("does not publish unsaved or unpreviewed changes and preserves the original revision on conflict", async () => {
  mount();
  fireEvent.change(screen.getByLabelText("Public account title"), {
    target: { value: "Edited listing" },
  });
  vi.mocked(post).mockRejectedValue(
    Object.assign(new APIError("Listing changed"), { status: 409 }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Save account listing" }));
  await screen.findByText("Listing changed");
  expect(post).toHaveBeenCalledWith(
    `/admin/account-listings/${id}/save`,
    expect.objectContaining({ version: 1 }),
    expect.anything(),
  );
  fireEvent.click(screen.getByRole("link", { name: "Preview & publication" }));
  fireEvent.click(
    await screen.findByLabelText(/I reviewed every public field/),
  );
  expect(
    screen.getByRole("button", { name: "Publish account listing" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Show listing preview" }));
  await screen.findByRole("heading", {
    name: "Customer preview · private draft",
  });
  expect(
    screen.getByRole("button", { name: "Publish account listing" }),
  ).toBeDisabled();
  await waitFor(() => {
    expect(post).toHaveBeenCalledOnce();
  });
});
