import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
function mount(search = "") {
  render(
    <MemoryRouter initialEntries={["/accounts/" + listing.id + search]}>
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
it.each([false, true])(
  "discloses the complete buyer price before consent (direct=%s)",
  (direct) => {
    const priced = structuredClone(listing);
    priced.product.amount_minor = "5249";
    priced.product.commission = {
      version: "account_commission_v1",
      base_minor: "4999",
      fee_minor: "250",
      total_minor: "5249",
    };
    vi.mocked(useResource).mockImplementation((path) => ({
      data: path === "/auth/session" ? session : priced,
      error: null,
      loading: false,
      reload: vi.fn(),
    }));
    mount(direct ? "?step=review" : "");
    if (!direct)
      fireEvent.click(
        screen.getByRole("button", { name: "Review this account purchase" }),
      );
    const review = screen.getByRole("region", {
      name: "Account purchase review",
    });
    const breakdown = within(review).getAllByLabelText(
      "Account price breakdown",
    )[0];
    expect(breakdown).toBeVisible();
    expect(breakdown).toHaveTextContent("Account priceUSD 49.99");
    expect(breakdown).toHaveTextContent("Buyer commission (5%)USD 2.50");
    expect(breakdown).toHaveTextContent("Total to payUSD 52.49");
    expect(
      within(review).getByRole("button", {
        name: "Reserve and continue to payment",
      }),
    ).toBeDisabled();
    expect(post).not.toHaveBeenCalled();
  },
);
it("keeps a historical purchase total without inventing a commission", () => {
  mount("?step=review");
  const review = screen.getByRole("region", {
    name: "Account purchase review",
  });
  expect(
    within(review).queryByLabelText("Account price breakdown"),
  ).not.toBeInTheDocument();
  expect(within(review).getAllByText("USD 50.00")[0]).toBeVisible();
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

it.each(["loading", "failed"])(
  "does not flash sign-in or reservation actions while session is %s",
  (state) => {
    vi.mocked(useResource).mockImplementation((path) => ({
      data: path === "/auth/session" ? null : listing,
      error:
        path === "/auth/session" && state === "failed"
          ? new Error("Offline")
          : null,
      loading: path === "/auth/session" && state === "loading",
      reload: vi.fn(),
    }));
    mount("?step=review");
    expect(
      screen.queryByRole("link", { name: "Sign in to reserve this account" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reserve and continue to payment" }),
    ).not.toBeInTheDocument();
    if (state === "loading")
      expect(screen.getByRole("status")).toHaveTextContent("Checking sign-in");
    else
      expect(
        screen.getByRole("button", { name: "Check sign-in again" }),
      ).toBeVisible();
    expect(post).not.toHaveBeenCalled();
  },
);
