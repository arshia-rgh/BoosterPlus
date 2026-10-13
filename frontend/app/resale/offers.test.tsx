import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { useResource } from "../orders/resource";
import { APIError, post } from "../identity/api";
import SellerOffers from "./offers";
import type { SellerTerms } from "./model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
afterEach(() => vi.clearAllMocks());
it("keeps seller conflicts in the seller agreement and requires fresh review after refresh", async () => {
  const terms: SellerTerms = {
    model: "consignment",
    currency: "usdtbsc",
    network: "bsc",
    amount: "44.990000",
    proceeds_basis: "Accepted exact net amount",
    fees: "The accepted seller fee schedule",
    transfer_requirements: "Protected account ownership transfer",
    dispute_terms: "Protected account dispute terms",
    withdrawal_terms: "Request withdrawal through support",
    payout_delay_hours: 0,
    payout_deadline_hours: 48,
  };
  let version = 1;
  const reload = vi.fn();
  let offers = {
    offers: [
      {
        id: "offer",
        version,
        state: "offered",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        control_verified_at: null,
        terms,
      },
    ],
  };
  const sessionData = { user: { role: "customer", portal: "customer" } };
  const payouts = { transfers: [] };
  vi.mocked(useResource).mockImplementation((path) => ({
    data: path.endsWith("/offers")
      ? offers
      : path === "/auth/session"
        ? sessionData
        : payouts,
    loading: false,
    error: null,
    reload,
  }));
  vi.mocked(post).mockRejectedValueOnce(
    Object.assign(new APIError("Buyer listing and reservation guidance"), {
      code: "resale_conflict",
      status: 409,
    }),
  );
  const component = () => (
    <MemoryRouter>
      <SellerOffers
        id="submission"
        version={2}
        state="approved_pending_terms"
        admin={false}
        changed={vi.fn()}
      />
    </MemoryRouter>
  );
  const view = render(component());
  const note = screen.getByLabelText("Seller agreement decision note");
  fireEvent.change(note, {
    target: { value: "I reviewed the exact seller agreement." },
  });
  fireEvent.click(
    screen.getByLabelText("I confirm these exact terms and this decision"),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Accept seller agreement" }),
  );
  await screen.findByText(/This seller agreement or submission changed/);
  expect(note).toHaveValue("I reviewed the exact seller agreement.");
  expect(
    screen.queryByText(/Buyer listing and reservation guidance/),
  ).not.toBeInTheDocument();
  const priorRefreshes = reload.mock.calls.length;
  fireEvent.click(
    screen.getByRole("button", { name: "Refresh seller agreements" }),
  );
  expect(reload).toHaveBeenCalledTimes(priorRefreshes + 1);
  version++;
  offers = { offers: offers.offers.map((offer) => ({ ...offer, version })) };
  view.rerender(component());
  expect(
    screen.getByLabelText("I confirm these exact terms and this decision"),
  ).not.toBeChecked();
  expect(
    screen.getByRole("button", { name: "Accept seller agreement" }),
  ).toBeDisabled();
  expect(post).toHaveBeenCalledOnce();
});
it.each(["buy_first", "consignment"])(
  "prevents accepting expired %s terms and distinguishes the payout trigger",
  (model) => {
    // Match the real hook: a resolved response retains its identity until refresh.
    const responses = new Map<string, ReturnType<typeof useResource>>();
    vi.mocked(useResource).mockImplementation((path) => {
      const cached = responses.get(path);
      if (cached) return cached;
      const response = {
        data: path.endsWith("/offers")
          ? {
              offers: [
                {
                  id: "offer",
                  version: 2,
                  state: "offered",
                  expires_at: "2020-01-01T00:00:00Z",
                  control_verified_at: null,
                  terms: {
                    model,
                    amount: "10.00000001",
                    currency: "usdttrc20",
                    network: "trx",
                    proceeds_basis: "Exact net amount",
                    fees: "No additional deductions",
                    transfer_requirements: "Protected ownership checklist",
                    dispute_terms: "Published dispute terms",
                    withdrawal_terms: "Agreed withdrawal terms",
                    payout_delay_hours: 24,
                    payout_deadline_hours: 48,
                  },
                },
              ],
            }
          : path === "/auth/session"
            ? { user: { role: "customer" } }
            : { transfers: [] },
        error: null,
        loading: false,
        reload: vi.fn(),
      };
      responses.set(path, response);
      return response;
    });
    render(
      <MemoryRouter>
        <SellerOffers
          id="submission"
          version={2}
          state="approved_pending_terms"
          admin={false}
          changed={vi.fn()}
        />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText("Seller agreement decision note"), {
      target: { value: "I reviewed these exact seller terms." },
    });
    fireEvent.click(
      screen.getByLabelText("I confirm these exact terms and this decision"),
    );
    expect(
      screen.getByRole("button", { name: "Accept seller agreement" }),
    ).toBeDisabled();
    expect(screen.getByText(/This offer has expired/)).toBeVisible();
    expect(
      screen.getByText(
        model === "buy_first"
          ? /after verified ownership control/
          : /after buyer acknowledgement/,
      ),
    ).toBeVisible();
  },
);

it("explains invalid seller offer fields before any commercial request", async () => {
  const responses = new Map<string, ReturnType<typeof useResource>>();
  vi.mocked(useResource).mockImplementation((path) => {
    const old = responses.get(path);
    if (old) return old;
    const result = {
      data: path.endsWith("/offers")
        ? { offers: [] }
        : path === "/auth/session"
          ? { user: { role: "owner", portal: "admin" } }
          : { transfers: [] },
      error: null,
      loading: false,
      reload: vi.fn(),
    };
    responses.set(path, result);
    return result;
  });
  render(
    <MemoryRouter>
      <SellerOffers
        id="submission"
        version={2}
        state="approved_pending_terms"
        admin
        changed={vi.fn()}
        view="agreement"
      />
    </MemoryRouter>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Propose exact seller terms" }),
  );
  await waitFor(() => {
    expect(screen.getByLabelText("Seller payout asset code")).toHaveFocus();
  });
  expect(screen.getByLabelText("Seller payout asset code")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(post).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Seller payout asset code"), {
    target: { value: "usdtbsc" },
  });
  expect(screen.getByLabelText("Seller payout asset code")).not.toHaveAttribute(
    "aria-invalid",
  );
});

it("switches approved arrangements but requires review of custom wording and invalidates a changed route's quote", () => {
  const standard: SellerTerms = {
    model: "consignment",
    currency: "usdtbsc",
    network: "bsc",
    amount: "",
    proceeds_basis: "Consignment proceeds after buyer delivery",
    fees: "PLAYORA covers outgoing costs",
    transfer_requirements: "Protected ownership handover required",
    dispute_terms: "Review evidence before deciding a dispute",
    withdrawal_terms: "Request unsold consignment withdrawal",
    payout_delay_hours: 0,
    payout_deadline_hours: 48,
  };
  const defaults = {
    seller_consignment: standard,
    seller_buy_first: {
      ...standard,
      model: "buy_first",
      proceeds_basis: "Buy-first proceeds before resale",
      withdrawal_terms: "Coordinate purchased account reversal",
    },
  };
  const responses = new Map<string, ReturnType<typeof useResource>>();
  vi.mocked(useResource).mockImplementation((path) => {
    const previous = responses.get(path);
    if (previous) return previous;
    const value = {
      data: path.endsWith("/offers")
        ? { offers: [] }
        : path === "/auth/session"
          ? { user: { role: "owner", portal: "admin" } }
          : path.endsWith("account-agreement-defaults")
            ? defaults
            : { transfers: [] },
      error: null,
      loading: false,
      reload: vi.fn(),
    };
    responses.set(path, value);
    return value;
  });
  render(
    <MemoryRouter>
      <SellerOffers
        id="submission"
        version={2}
        state="approved_pending_terms"
        admin
        changed={vi.fn()}
        view="agreement"
      />
    </MemoryRouter>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Use approved consignment terms" }),
  );
  fireEvent.change(screen.getByLabelText("Seller payment arrangement"), {
    target: { value: "buy_first" },
  });
  expect(screen.getByLabelText("Seller proceeds basis")).toHaveValue(
    "Buy-first proceeds before resale",
  );
  fireEvent.change(screen.getByLabelText("Seller proceeds basis"), {
    target: { value: "Custom conditions must be reviewed" },
  });
  fireEvent.change(screen.getByLabelText("Seller payment arrangement"), {
    target: { value: "consignment" },
  });
  const review = screen.getByLabelText(
    "I reviewed the custom wording for the selected payment arrangement",
  );
  fireEvent.change(screen.getByLabelText("Agreed account base price (USD)"), {
    target: { value: "100" },
  });
  expect(review).not.toBeChecked();
  fireEvent.click(review);
  expect(review).toBeChecked();
  expect(review).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Crypto units per USD"), {
    target: { value: "1.0001" },
  });
  fireEvent.change(screen.getByLabelText("Seller payout asset code"), {
    target: { value: "other" },
  });
  expect(screen.getByLabelText("Crypto units per USD")).toHaveValue("");
  expect(screen.getByLabelText("Agreed account base price (USD)")).toHaveValue(
    "100.00",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Use approved consignment terms" }),
  );
  expect(
    screen.queryByLabelText(
      "I reviewed the custom wording for the selected payment arrangement",
    ),
  ).not.toBeInTheDocument();
  expect(post).not.toHaveBeenCalled();
});
