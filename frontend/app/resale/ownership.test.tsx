import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import { AccountInventory, InventoryDetail } from "./inventory";
import type { Listing } from "./model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
const game = "11111111-1111-4111-8111-111111111111";
const base: Listing = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  submission_id: "",
  offer_id: "",
  origin: "playora",
  ownership: "playora",
  blockers: ["listing_price", "listing_terms", "publication"],
  version: 1,
  state: "draft",
  game: "Mobile Legends",
  slug: "mobile-legends",
  release_id: "",
  draft: {
    title: "Mythic account",
    description: "",
    region: "",
    rank: "",
    attributes: [],
    media_ids: [],
    currency: "USD",
    amount_minor: "",
    sale_terms: "Approved buyer sale terms for every account purchase.",
    transfer_requirements: "Approved buyer transfer requirements text.",
    dispute_terms: "Approved buyer dispute terms for every account.",
    acknowledgement_terms: "Approved buyer acknowledgement terms text.",
    dispute_hours: 168,
    delivery_min_hours: 0,
    delivery_max_hours: 0,
  },
};
const rows: Listing[] = [
  base,
  {
    ...base,
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    origin: "buy_first",
    submission_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    offer_id: "offer",
    seller_payout_confirmed: false,
    state: "draft",
    draft: { ...base.draft, title: "Bought account", amount_minor: "10500" },
  },
  {
    ...base,
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    origin: "consignment",
    ownership: "seller",
    submission_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    offer_id: "offer2",
    state: "withdrawn",
    draft: { ...base.draft, title: "Seller account", amount_minor: "5250" },
  },
];
const paths: string[] = [];
let detail: Listing = base;
beforeEach(() => {
  paths.length = 0;
  detail = structuredClone(base);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.mocked(useResource).mockImplementation((path) => {
    paths.push(path);
    if (path.startsWith("/admin/account-listings?"))
      return {
        data: {
          items: path.includes("ownership=seller")
            ? rows.filter((row) => row.ownership === "seller")
            : path.includes("state=sold")
              ? []
              : rows,
          next: "",
          counts: { playora: 2, seller: 1 },
        },
        error: null,
        loading: false,
        reload: vi.fn(),
      };
    if (path.startsWith("/admin/catalog/games"))
      return {
        data: {
          games: [
            {
              id: game,
              slug: "mobile-legends",
              name: "Mobile Legends",
              published: true,
              paused: false,
              archived: false,
            },
            {
              id: "22222222-2222-4222-8222-222222222222",
              slug: "closed",
              name: "Closed game",
              published: true,
              paused: true,
              archived: false,
            },
          ],
          next: "",
        },
        error: null,
        loading: false,
        reload: vi.fn(),
      };
    if (path.startsWith("/admin/account-listings/"))
      return { data: detail, error: null, loading: false, reload: vi.fn() };
    return { data: null, error: null, loading: true, reload: vi.fn() };
  });
});
afterEach(() => vi.clearAllMocks());
function mount(entry: string) {
  const router = createMemoryRouter(
    [
      { path: "/admin/accounts", element: <AccountInventory /> },
      { path: "/admin/accounts/:id", element: <InventoryDetail /> },
    ],
    { initialEntries: [entry] },
  );
  return { ...render(<RouterProvider router={router} />), router };
}

it("separates ownership with labelled links, server counts and the sale rule on each card", async () => {
  const { router } = mount("/admin/accounts");
  const group = await screen.findByRole("group", { name: "Ownership" });
  expect(group).toHaveTextContent("All3");
  expect(group).toHaveTextContent("PLAYORA-owned2");
  expect(group).toHaveTextContent("Seller consignment1");
  expect(screen.getByRole("link", { name: /^All/ })).toHaveAttribute(
    "aria-current",
    "true",
  );
  expect(screen.getAllByText("Created by staff")).toHaveLength(1);
  expect(screen.getByText("Bought from seller")).toBeVisible();
  expect(screen.getByText("Listed for a seller")).toBeVisible();
  expect(screen.getByText("On sale: no seller payout.")).toBeVisible();
  expect(
    screen.getByText(
      "On sale: no seller payout. The seller is paid before publication. Seller payout not confirmed yet.",
    ),
  ).toBeVisible();
  expect(
    screen.getByText(
      "On sale: the seller is paid after the buyer's delivery and inspection.",
    ),
  ).toBeVisible();
  expect(screen.getByText("Price not set")).toBeVisible();
  expect(screen.getByText("Buyer pays USD 105.00")).toBeVisible();
  // The status badge shows the editor's own word for a withdrawn listing.
  expect(
    screen.getByText("Paused", { selector: ".ui-status-badge" }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("link", { name: /^Seller consignment/ }));
  await waitFor(() => {
    expect(router.state.location.search).toBe("?owner=consignment");
  });
  expect(paths.at(-1)).toContain("ownership=seller");
  expect(
    screen.getByRole("link", { name: /^Seller consignment/ }),
  ).toHaveAttribute("aria-current", "true");
});

it("replaces an unknown ownership filter and offers a way out of an empty status view", async () => {
  const { router } = mount("/admin/accounts?owner=mine&state=sold");
  await waitFor(() => {
    expect(router.state.location.search).toBe("?state=sold");
  });
  expect(await screen.findByText("No listings are sold.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Show all statuses" }));
  await waitFor(() => {
    expect(router.state.location.search).toBe("");
  });
});

it("creates one private draft and reuses its request key after an uncertain failure", async () => {
  const created = { ...base, id: "ffffffff-ffff-4fff-8fff-ffffffffffff" };
  vi.mocked(post)
    .mockRejectedValueOnce(new TypeError("Failed to fetch"))
    .mockResolvedValueOnce(created);
  const { router } = mount("/admin/accounts?owner=playora");
  fireEvent.click(
    await screen.findByRole("button", { name: "Add a PLAYORA account" }),
  );
  const select = await screen.findByLabelText("Game (required)");
  await waitFor(() => {
    expect(select).toHaveFocus();
  });
  expect(
    screen.getByRole("option", { name: "Closed game (account sales off)" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Create private draft" }));
  await waitFor(() => {
    expect(select).toHaveAttribute("aria-invalid", "true");
  });
  expect(post).not.toHaveBeenCalled();
  fireEvent.change(select, { target: { value: game } });
  fireEvent.change(screen.getByLabelText("Public account title (required)"), {
    target: { value: "Mythic account" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create private draft" }));
  expect(
    await screen.findByText(/couldn't confirm the draft was created/),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Create private draft" }));
  await waitFor(() => {
    expect(router.state.location.pathname).toBe(
      "/admin/accounts/ffffffff-ffff-4fff-8fff-ffffffffffff",
    );
  });
  const [first, second] = vi.mocked(post).mock.calls;
  expect(first?.[0]).toBe("/admin/account-listings");
  expect(first?.[1]).toEqual(second?.[1]);
  expect(first?.[1]).toMatchObject({ game_id: game, title: "Mythic account" });
  expect(router.state.location.state).toEqual({
    inventorySearch: "owner=playora",
  });
});

it("asks before discarding a typed new listing", async () => {
  mount("/admin/accounts");
  fireEvent.click(
    await screen.findByRole("button", { name: "Add a PLAYORA account" }),
  );
  fireEvent.change(
    await screen.findByLabelText("Public account title (required)"),
    {
      target: { value: "Typed" },
    },
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(
    await screen.findByRole("heading", { name: "Discard this new listing?" }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Discard new listing" }));
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: "Add a PLAYORA account" }),
    ).toBeEnabled();
  });
  expect(screen.queryByLabelText("Public account title (required)")).toBeNull();
});

it("edits a PLAYORA listing without seller agreement, selling progress or chat images", async () => {
  mount(`/admin/accounts/${base.id}?section=details`);
  expect(await screen.findByText("Created by staff")).toBeVisible();
  expect(screen.getByText("No seller payout.")).toBeVisible();
  expect(
    screen.queryByRole("link", { name: "Seller agreement and sale progress" }),
  ).toBeNull();
  expect(
    screen.getByLabelText("Account base price (USD)"),
  ).toHaveAccessibleDescription(
    "Enter dollars, for example 100.00. The buyer pays 5% more.",
  );
  expect(paths.some((path) => path.startsWith("/admin/submissions/"))).toBe(
    false,
  );
  fireEvent.click(screen.getByRole("link", { name: "Account images" }));
  expect(await screen.findByText("Add an account image")).toBeVisible();
  expect(screen.queryByText("Existing artwork path")).toBeNull();
  expect(paths.some((path) => path.includes("/conversations/"))).toBe(false);
  fireEvent.click(screen.getByRole("link", { name: "Preview & publication" }));
  expect(
    await screen.findByRole("link", {
      name: "Check the listing price and commissions",
    }),
  ).toBeVisible();
  expect(
    screen.getByLabelText(/I confirm PLAYORA owns this account/),
  ).toBeVisible();
});

it("shows the closed-sales message when publication is refused for the game", async () => {
  detail = {
    ...structuredClone(base),
    blockers: ["publication"],
    draft: {
      ...base.draft,
      description: "A complete reviewed account description.",
      region: "Europe",
      rank: "Mythic",
      amount_minor: "10500",
      commission: {
        version: "account_commission_v1",
        base_minor: "10000",
        fee_minor: "500",
        total_minor: "10500",
      },
      delivery_min_hours: 1,
      delivery_max_hours: 24,
    },
  };
  vi.mocked(post).mockRejectedValueOnce(
    Object.assign(
      new APIError(
        "Account sales are off for this game. Turn on its Accounts service in the catalog, then publish.",
      ),
      { status: 409, code: "resale_game_unavailable" },
    ),
  );
  mount(`/admin/accounts/${base.id}?section=publication`);
  fireEvent.click(
    await screen.findByLabelText(/I confirm PLAYORA owns this account/),
  );
  fireEvent.click(screen.getByRole("button", { name: "Show listing preview" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Publish account listing" }),
  );
  expect(await screen.findByText(/Account sales are off/)).toBeVisible();
  expect(post).toHaveBeenCalledWith(
    `/admin/account-listings/${base.id}/publish`,
    expect.objectContaining({ public_reviewed: true }),
    expect.anything(),
  );
});
