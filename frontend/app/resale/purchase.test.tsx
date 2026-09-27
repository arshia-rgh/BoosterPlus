import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { get, post } from "../identity/api";
import { useResource } from "../orders/resource";
import { AccountProduct } from "./market";
import type { PublicListing } from "./model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
vi.mock("../orders/favorites", () => ({ FavoriteButton: () => null }));
vi.mock("../availability/accounts", () => ({ default: () => null }));
const listing: PublicListing = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  release_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  game: "Game",
  slug: "game",
  state: "published",
  images: [],
  product: {
    title: "Reviewed account",
    description: "Published attributes only",
    region: "Europe",
    rank: "Advanced",
    attributes: [],
    media_ids: [],
    currency: "USD",
    amount_minor: "5000",
    sale_terms: "Exact sale terms",
    transfer_requirements: "Secure transfer",
    dispute_terms: "Dispute terms",
    acknowledgement_terms: "Confirm receipt",
    dispute_hours: 48,
    delivery_min_hours: 1,
    delivery_max_hours: 24,
  },
};
const session = {
  user: { id: "buyer" },
  mfa_required: false,
  terms_version: "terms-v1",
};
beforeEach(() => {
  vi.mocked(useResource).mockImplementation((path) => ({
    data: path === "/auth/session" ? session : listing,
    error: null,
    loading: false,
    reload: vi.fn(),
  }));
  vi.mocked(get).mockImplementation((path) =>
    Promise.resolve(path === "/auth/session" ? session : { order_id: "" }),
  );
});
afterEach(() => vi.clearAllMocks());
function mount() {
  render(
    <MemoryRouter initialEntries={["/accounts/" + listing.id]}>
      <Routes>
        <Route path="/accounts/:id" element={<AccountProduct />} />
        <Route path="/orders/:id" element={<h1>Saved order</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}
it("separates inspection from explicit purchase acceptance without creating an order", () => {
  mount();
  expect(
    screen.queryByRole("button", { name: "Reserve and continue to payment" }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Review this account purchase" }),
  );
  expect(
    screen.getByRole("heading", { name: "Review your account purchase" }),
  ).toBeVisible();
  expect(
    screen.getByRole("region", { name: "Account purchase review" }),
  ).toHaveFocus();
  expect(
    screen.getByRole("button", { name: "Reserve and continue to payment" }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Back to account listing" }),
  );
  expect(
    screen.getByRole("heading", { name: "Account details" }),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Review this account purchase" }),
  ).toHaveFocus();
  expect(post).not.toHaveBeenCalled();
});
it("recovers a saved purchase after a lost response instead of creating a second reservation", async () => {
  let saved = false;
  vi.mocked(get).mockImplementation((path) =>
    Promise.resolve(
      path === "/auth/session"
        ? session
        : { order_id: saved ? "saved-order" : "" },
    ),
  );
  vi.mocked(post).mockImplementation(() => {
    saved = true;
    return Promise.reject(new Error("Lost response"));
  });
  mount();
  fireEvent.click(
    screen.getByRole("button", { name: "Review this account purchase" }),
  );
  fireEvent.click(
    screen.getByLabelText(
      "I accept this account's price, sale, transfer, dispute and acknowledgement terms and the site terms",
    ),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Reserve and continue to payment" }),
  );
  await screen.findByRole("heading", { name: "Your request was saved" });
  expect(post).toHaveBeenCalledOnce();
  expect(vi.mocked(post).mock.calls[0]?.[1]).toEqual(
    expect.objectContaining({
      release_id: listing.release_id,
      currency: "USD",
      expected_amount: "5000",
      accept_terms: true,
      terms_version: "terms-v1",
    }),
  );
  fireEvent.click(screen.getByRole("link", { name: "View your saved order" }));
  await screen.findByRole("heading", { name: "Saved order" });
  await waitFor(() => {
    expect(post).toHaveBeenCalledOnce();
  });
});
