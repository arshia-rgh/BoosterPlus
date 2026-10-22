import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { emptyConfiguration } from "../catalog/model";
import { post, sessionSchema } from "../identity/api";
import CustomerWorkspace from "../orders/customer-workspace";
import { detailSchema } from "../orders/model";
import { useResource } from "../orders/resource";
import { continueToProvider } from "./provider-navigation";
import { historySchema } from "./model";

vi.mock("./options", () => ({
  usePaymentOptions: vi.fn(() => ({
    data: {
      contract_id: "contract",
      policy_id: "policy",
      currency: "USD",
      amount_minor: "1234",
      server_time: "2026-10-22T00:00:00Z",
      routes: [
        {
          code: "usdttrc20",
          status: "available",
          minimum_crypto: "1",
          minimum_fiat: "1",
          checked_at: "2026-10-22T00:00:00Z",
          valid_until: "2026-10-23T00:00:00Z",
        },
        {
          code: "usdtbsc",
          status: "available",
          minimum_crypto: "1",
          minimum_fiat: "1",
          checked_at: "2026-10-22T00:00:00Z",
          valid_until: "2026-10-23T00:00:00Z",
        },
      ],
    },
    loading: false,
    error: false,
    expired: false,
    reload: vi.fn(),
  })),
}));
vi.mock("./provider-navigation", () => ({ continueToProvider: vi.fn() }));
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
afterEach(() => vi.clearAllMocks());

const price = {
  quote_id: "quote",
  revision: 1,
  currency: "USD",
  subtotal_minor: "1234",
  amount_minor: "1234",
  lines: [],
  scope: "Reviewed package",
  reason: "",
  delivery_min_hours: 2,
  delivery_max_hours: 24,
  expires_at: "2099-01-01T00:00:00Z",
  terms_version: "test-v1",
};
const detail = detailSchema.parse({
  order: {
    id: "owned-order",
    version: 2,
    kind: "package",
    state: "awaiting_payment",
    slug: "game",
    service: "boost",
    package: "pack",
    variant: "standard",
    game_name: "Game",
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
  },
  offer: {
    id: "release",
    game_id: "game",
    slug: "game",
    version: 1,
    paused: false,
    created_at: "2026-09-01T10:00:00Z",
    configuration: emptyConfiguration("Game"),
  },
  answers: {},
  coupon_code: "",
  estimate: {
    release_id: "release",
    version: 1,
    evaluator: "manual-review-v1",
    expires_at: price.expires_at,
    outcome: "manual_review",
    currency: "",
    amount_minor: "0",
    answers: {},
    lines: [],
    issues: [],
  },
  contract: { id: "contract", payment_state: "invoice_pending", data: price },
});
const session = sessionSchema.parse({
  portal: "customer",
  csrf_token: "x".repeat(48),
  user: null,
  google_enabled: false,
  google_linked: false,
  mfa_required: false,
  capabilities: ["account"],
  terms_version: "test-v1",
  terms_url: "/terms",
});
const policy = {
  id: "policy",
  data: {
    remedies: null,
    label: "Fixture agreement",
    text: "Fixture only",
    currencies: ["USD"],
    routes: [{ code: "usdtbsc", network: "bsc", label: "USDT BSC" }],
    fee_mode: "merchant",
    rate_mode: "fixed",
    window_minutes: 30,
  },
};

it("keeps checkout continuation through the real workspace's temporary access suspension", async () => {
  let data = historySchema.parse({
    server_time: new Date().toISOString(),
    enabled: true,
    policy,
    attempts: [],
    receipts: [],
  });
  const reload = vi.fn();
  vi.mocked(useResource).mockImplementation(() => ({
    data,
    error: null,
    loading: false,
    reload,
    requestedAt: performance.now(),
  }));
  vi.mocked(post).mockResolvedValue({ id: "attempt" });
  const content = (suspended: boolean) => (
    <StrictMode>
      <MemoryRouter initialEntries={["/orders/owned-order?section=payment"]}>
        <CustomerWorkspace
          detail={detail}
          session={session}
          refreshing={suspended}
          suspended={suspended}
          reload={reload}
        />
      </MemoryRouter>
    </StrictMode>
  );
  const view = render(content(false));
  fireEvent.click(screen.getByRole("radio", { name: /USDT.*BNB/ }));
  fireEvent.click(
    screen.getByLabelText(
      "I accept this payment policy and the agreed order price",
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Go to payment" }));
  await waitFor(() => {
    expect(post).toHaveBeenCalledOnce();
  });
  await waitFor(() => {
    expect(reload).toHaveBeenCalled();
  });
  view.rerender(content(true));
  expect(
    screen.queryByRole("heading", { name: "Payment and receipts" }),
  ).not.toBeInTheDocument();
  expect(continueToProvider).not.toHaveBeenCalled();
  data = historySchema.parse({
    ...data,
    attempts: [
      {
        id: "attempt",
        order_id: "owned-order",
        state: "awaiting_payment",
        issue: "",
        currency: "USD",
        amount_minor: "1234",
        route: policy.data.routes[0],
        policy,
        checkout_url: "https://nowpayments.io/payment/?iid=123",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 600000).toISOString(),
      },
    ],
  });
  view.rerender(content(false));
  await waitFor(() => {
    expect(continueToProvider).toHaveBeenCalledExactlyOnceWith(
      "https://nowpayments.io/payment/?iid=123",
    );
  });
  expect(screen.getByRole("link", { name: "Go to payment" })).toBeVisible();
  view.rerender(content(false));
  expect(continueToProvider).toHaveBeenCalledOnce();
  // Returning later offers a deliberate continuation, never another auto-redirect.
  view.unmount();
  render(content(false));
  expect(screen.getByRole("link", { name: "Go to payment" })).toBeVisible();
  expect(continueToProvider).toHaveBeenCalledOnce();
});
