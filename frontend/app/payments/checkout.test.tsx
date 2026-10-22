import "../../tests/dialog";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import type { Detail } from "../orders/model";
import Checkout from "./checkout";
import { continueToProvider } from "./provider-navigation";
vi.mock("./provider-navigation", () => ({ continueToProvider: vi.fn() }));
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
afterEach(() => vi.clearAllMocks());
const policy = {
  id: "policy-one",
  data: {
    remedies: null,
    label: "Test agreement",
    text: "Synthetic checkout policy for this purchase.",
    currencies: ["USD"],
    routes: [
      { code: "usdttrc20", network: "trx", label: "USDT TRON" },
      { code: "usdtbsc", network: "bsc", label: "USDT BNB" },
    ],
    fee_mode: "merchant",
    rate_mode: "fixed",
    window_minutes: 30,
  },
};
// Checkout consumes only these order fields; the full order parser is tested separately.
const detail = {
  order: { id: "order", state: "awaiting_payment" },
  contract: {
    id: "contract",
    payment_state: "unissued",
    data: { currency: "USD", amount_minor: "1234" },
  },
} as Detail;
function setup() {
  const reload = vi.fn(),
    changed = vi.fn();
  const data = { enabled: true, policy, attempts: [], receipts: [] };
  vi.mocked(useResource).mockReturnValue({
    data,
    loading: false,
    error: null,
    reload,
  });
  return { data, reload, changed };
}
it("keeps agreed USD price and consent visible while hiding operational facts and collapsing full terms", () => {
  const { changed } = setup();
  render(<Checkout detail={detail} admin={false} changed={changed} />);
  expect(screen.getByText("Agreed price: USD 12.34")).toBeVisible();
  expect(screen.queryByText("Processing fees")).not.toBeInTheDocument();
  expect(screen.queryByText("Exchange rate")).not.toBeInTheDocument();
  const policyText = screen.getByText(policy.data.text);
  expect(policyText).not.toBeVisible();
  const disclosure = screen.getByText(policy.data.label).closest("details");
  expect(disclosure).not.toHaveAttribute("open");
  fireEvent.click(screen.getByText(policy.data.label));
  expect(policyText).toBeVisible();
  expect(
    screen.getByLabelText(
      "I accept this payment policy and the agreed order price",
    ),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Go to payment" })).toBeDisabled();
});
it("shows preparation during the create request and exposes its failure without another request", async () => {
  const { changed } = setup();
  let reject: (cause: unknown) => void = () => {};
  vi.mocked(post).mockImplementation(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  render(<Checkout detail={detail} admin={false} changed={changed} />);
  fireEvent.click(
    screen.getByLabelText(
      "I accept this payment policy and the agreed order price",
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Go to payment" }));
  expect(
    screen.getByRole("dialog", { name: "Preparing your secure checkout." }),
  ).toBeVisible();
  reject(new Error("Payment connection failed"));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(post).toHaveBeenCalledOnce();
  expect(changed).not.toHaveBeenCalled();
});
it("requires current policy consent without coin selection, then binds the immutable contract", async () => {
  const { reload, changed } = setup();
  vi.mocked(post).mockResolvedValue({});
  render(<Checkout detail={detail} admin={false} changed={changed} />);
  const submit = screen.getByRole("button", { name: "Go to payment" });
  expect(submit).toBeDisabled();
  expect(submit).toBeDisabled();
  fireEvent.click(
    screen.getByLabelText(
      "I accept this payment policy and the agreed order price",
    ),
  );
  fireEvent.click(submit);
  await waitFor(() => {
    expect(reload).toHaveBeenCalledOnce();
  });
  expect(post).toHaveBeenCalledWith(
    "/orders/order/checkout",
    {
      contract_id: "contract",
      policy_id: "policy-one",
      accept_policy: true,
    },
    expect.anything(),
  );
  expect(changed).toHaveBeenCalledOnce();
});
it("requires fresh acceptance when the published policy changes", () => {
  const { data, reload, changed } = setup();
  if (!detail.contract) throw new Error("Missing fixture contract");
  const view = render(
    <Checkout detail={detail} admin={false} changed={changed} />,
  );
  fireEvent.click(
    screen.getByLabelText(
      "I accept this payment policy and the agreed order price",
    ),
  );
  vi.mocked(useResource).mockReturnValue({
    data: { ...data, policy: { ...policy, id: "policy-two" } },
    loading: false,
    error: null,
    reload,
  });
  view.rerender(<Checkout detail={detail} admin={false} changed={changed} />);
  expect(screen.getByRole("button", { name: "Go to payment" })).toBeDisabled();
});
it("keeps orders unpaid when checkout is paused", () => {
  const { data, reload, changed } = setup();
  vi.mocked(useResource).mockReturnValue({
    data: { ...data, enabled: false },
    loading: false,
    error: null,
    reload,
  });
  render(<Checkout detail={detail} admin={false} changed={changed} />);
  expect(
    screen.queryByRole("button", { name: "Go to payment" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/Checkout is currently unavailable/)).toBeVisible();
});
it("does not let staff create customer checkout", () => {
  const { changed } = setup();
  render(<Checkout detail={detail} admin changed={changed} />);
  expect(
    screen.queryByRole("button", { name: "Go to payment" }),
  ).not.toBeInTheDocument();
});
it("recovers a failed read without claiming to still be loading", () => {
  const { reload, changed } = setup();
  vi.mocked(useResource).mockReturnValue({
    data: null,
    error: new Error("offline"),
    loading: false,
    reload,
  });
  render(<Checkout detail={detail} admin={false} changed={changed} />);
  expect(
    screen.queryByText("Loading payment information…"),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Try payment information again" }),
  );
  expect(reload).toHaveBeenCalledOnce();
  expect(
    screen.queryByRole("button", { name: "Go to payment" }),
  ).not.toBeInTheDocument();
});
it("locks repeated checkout requests while the provider request is pending", async () => {
  const { changed } = setup();
  let finish: (value: unknown) => void = () => {};
  vi.mocked(post).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<Checkout detail={detail} admin={false} changed={changed} />);
  fireEvent.click(
    screen.getByLabelText(
      "I accept this payment policy and the agreed order price",
    ),
  );
  const button = screen.getByRole("button", { name: "Go to payment" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(post).toHaveBeenCalledOnce();
  finish({});
  await waitFor(() => {
    expect(changed).toHaveBeenCalledOnce();
  });
});
it("withdraws consent when the agreement changes and blocks stale reads", () => {
  const { data, reload, changed } = setup();
  if (!detail.contract) throw new Error("Missing fixture contract");
  const view = render(
    <Checkout detail={detail} admin={false} changed={changed} />,
  );
  fireEvent.click(
    screen.getByLabelText(
      "I accept this payment policy and the agreed order price",
    ),
  );
  view.rerender(
    <Checkout
      detail={{
        ...detail,
        contract: { ...detail.contract, id: "new-contract" },
      }}
      admin={false}
      changed={changed}
    />,
  );
  expect(
    screen.getByLabelText(
      "I accept this payment policy and the agreed order price",
    ),
  ).not.toBeChecked();
  vi.mocked(useResource).mockReturnValue({
    data,
    loading: true,
    error: null,
    reload,
  });
  view.rerender(<Checkout detail={detail} admin={false} changed={changed} />);
  expect(screen.getByRole("button", { name: "Go to payment" })).toBeDisabled();
});
it.each(["uncertain", "confirming", "settled", "closed", "exception"])(
  "does not offer a new or payable link for %s",
  (state) => {
    const { data, reload, changed } = setup();
    vi.mocked(useResource).mockReturnValue({
      data: {
        ...data,
        attempts: [
          {
            id: "attempt",
            order_id: "order",
            state,
            issue: "",
            currency: "USD",
            amount_minor: "1234",
            route: policy.data.routes[0],
            policy,
            checkout_url: "https://nowpayments.io/payment/?iid=1",
            created_at: "2026-01-01T00:00:00Z",
            expires_at: "2099-01-01T00:00:00Z",
          },
        ],
      },
      loading: false,
      error: null,
      reload,
    });
    render(<Checkout detail={detail} admin={false} changed={changed} />);
    expect(
      screen.queryByRole("link", { name: /Go to payment/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Go to payment" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/No received funds recorded/)).toBeVisible();
  },
);
it("hides an expired link without fabricating provider failure or settlement", () => {
  const { data, reload, changed } = setup();
  vi.mocked(useResource).mockReturnValue({
    data: {
      ...data,
      attempts: [
        {
          id: "attempt",
          order_id: "order",
          state: "awaiting_payment",
          issue: "",
          currency: "USD",
          amount_minor: "1234",
          route: policy.data.routes[0],
          policy,
          checkout_url: "https://nowpayments.io/payment/?iid=1",
          created_at: "2020-01-01T00:00:00Z",
          expires_at: "2020-01-02T00:00:00Z",
        },
      ],
    },
    loading: false,
    error: null,
    reload,
  });
  render(<Checkout detail={detail} admin={false} changed={changed} />);
  expect(
    screen.getByRole("heading", { name: "Checkout window ended" }),
  ).toBeVisible();
  expect(
    screen.queryByRole("link", { name: /Go to payment/ }),
  ).not.toBeInTheDocument();
  expect(changed).not.toHaveBeenCalled();
});

it("withholds native instructions across reconnect until a fresh response", () => {
  const { data, reload, changed } = setup();
  const server = Date.parse("2026-09-27T12:00:00Z");
  let monotonic = 100;
  vi.spyOn(performance, "now").mockImplementation(() => monotonic);
  const deposit = {
    payment_id: "100",
    address: "synthetic-not-payable-address",
    memo: "123",
    amount: "12.34000001",
    currency: "usdttrc20",
    network: "trx",
    checked_at: new Date(server).toISOString(),
    valid_until: new Date(server + 120000).toISOString(),
    expires_at: new Date(server + 600000).toISOString(),
    qr: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6pAAAAABJRU5ErkJggg==",
  };
  const response = {
    data: {
      ...data,
      server_time: new Date(server).toISOString(),
      attempts: [
        {
          id: "attempt",
          order_id: "order",
          state: "awaiting_payment",
          issue: "",
          currency: "USD",
          amount_minor: "1234",
          route: policy.data.routes[0],
          policy,
          checkout_url: "",
          created_at: new Date(server).toISOString(),
          expires_at: new Date(server + 1800000).toISOString(),
          native_checkout: true,
          instruction_status: "ready",
          deposit,
        },
      ],
    },
    requestedAt: 100,
    loading: false,
    error: null,
    reload,
  };
  vi.mocked(useResource).mockReturnValue(response);
  if (!detail.contract) throw new Error("Missing fixture contract");
  const view = render(
    <Checkout detail={detail} admin={false} changed={changed} />,
  );
  expect(screen.getByRole("button", { name: "Copy address" })).toBeVisible();
  monotonic = 200;
  fireEvent(window, new Event("offline"));
  fireEvent(window, new Event("online"));
  expect(
    screen.queryByRole("button", { name: "Copy address" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Refreshing payment instructions" }),
  ).toBeVisible();
  vi.mocked(useResource).mockReturnValue({ ...response, requestedAt: 201 });
  view.rerender(<Checkout detail={detail} admin={false} changed={changed} />);
  expect(screen.getByRole("button", { name: "Copy address" })).toBeVisible();
  vi.restoreAllMocks();
});

it("keeps payment uncertainty guidance when status retrieval fails", () => {
  const { reload, changed } = setup();
  vi.mocked(useResource).mockReturnValue({
    data: null,
    error: new Error("offline"),
    loading: false,
    reload,
  });
  render(<Checkout detail={detail} admin={false} changed={changed} />);
  expect(
    screen.getByText(/Payment status cannot be verified right now/),
  ).toHaveTextContent("do not send again");
  expect(
    screen.queryByRole("button", { name: "Go to payment" }),
  ).not.toBeInTheDocument();
});

it("continues a newly requested hosted checkout once, with a visible fallback", async () => {
  const { data, reload, changed } = setup();
  vi.mocked(post).mockResolvedValue({ id: "fresh" });
  if (!detail.contract) throw new Error("Missing fixture contract");
  const view = render(
    <Checkout detail={detail} admin={false} changed={changed} />,
  );
  fireEvent.click(
    screen.getByLabelText(
      "I accept this payment policy and the agreed order price",
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Go to payment" }));
  await waitFor(() => {
    expect(reload).toHaveBeenCalledOnce();
  });
  const attempt = {
    id: "fresh",
    order_id: "order",
    native_checkout: false,
    state: "awaiting_payment",
    issue: "",
    currency: "USD",
    amount_minor: "1234",
    route: { selection: "provider", code: "", label: "", network: "" },
    policy,
    checkout_url: "https://nowpayments.io/payment/?iid=123",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 600000).toISOString(),
  };
  vi.mocked(useResource).mockReturnValue({
    data: {
      ...data,
      server_time: new Date().toISOString(),
      attempts: [attempt],
    },
    loading: false,
    error: null,
    reload,
    requestedAt: performance.now(),
  });
  view.rerender(<Checkout detail={detail} admin={false} changed={changed} />);
  await waitFor(() => {
    expect(continueToProvider).toHaveBeenCalledExactlyOnceWith(
      attempt.checkout_url,
    );
  });
  expect(screen.getByRole("link", { name: "Go to payment" })).toHaveAttribute(
    "href",
    attempt.checkout_url,
  );
  view.rerender(<Checkout detail={detail} admin={false} changed={changed} />);
  expect(continueToProvider).toHaveBeenCalledOnce();
});

it("brings a failed checkout into view without redirecting or hiding the order", async () => {
  const { changed } = setup();
  const error = new APIError(
    "Checkout is temporarily unavailable. Please try again.",
  );
  error.code = "payments_unavailable";
  error.status = 503;
  vi.mocked(post).mockRejectedValue(error);
  render(<Checkout detail={detail} admin={false} changed={changed} />);
  fireEvent.click(
    screen.getByLabelText(
      "I accept this payment policy and the agreed order price",
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Go to payment" }));
  const message = await screen.findByText(
    "Checkout is temporarily unavailable. Please try again.",
  );
  await waitFor(() => expect(message.closest('[tabindex="-1"]')).toHaveFocus());
  expect(changed).not.toHaveBeenCalled();
  expect(continueToProvider).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Go to payment" })).toBeDisabled();
});

it("gives missing-link recovery its own support path and honest connection feedback", () => {
  const { data, reload, changed } = setup();
  const result = {
    data: {
      ...data,
      server_time: new Date().toISOString(),
      attempts: [
        {
          id: "recovering",
          order_id: "order",
          native_checkout: false,
          state: "awaiting_payment",
          issue: "",
          currency: "USD",
          amount_minor: "1234",
          route: policy.data.routes[0],
          policy,
          checkout_url: "",
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 600000).toISOString(),
        },
      ],
    },
    loading: false,
    error: null,
    reload,
    requestedAt: performance.now(),
  };
  vi.mocked(useResource).mockReturnValue(result);
  if (!detail.contract) throw new Error("Missing fixture contract");
  const view = render(
    <Checkout detail={detail} admin={false} changed={changed} />,
  );
  expect(
    screen.getByText(
      /Your checkout is saved. We’re checking for its payment link/,
    ),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Ask support about this checkout" }),
  ).toHaveAttribute("href", "/orders/order?section=messages");
  vi.mocked(useResource).mockReturnValue({
    ...result,
    error: new Error("offline"),
  });
  view.rerender(<Checkout detail={detail} admin={false} changed={changed} />);
  expect(
    screen.queryByText(/We’re checking it automatically/),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText(/Payment status cannot be verified right now/),
  ).toBeVisible();
  expect(
    screen.queryByRole("link", { name: "Go to payment" }),
  ).not.toBeInTheDocument();
  const waiting = result.data.attempts[0];
  if (!waiting) throw new Error("Missing test attempt");
  waiting.checkout_url = "https://nowpayments.io/payment/?iid=123";
  vi.mocked(useResource).mockReturnValue(result);
  view.rerender(<Checkout detail={detail} admin={false} changed={changed} />);
  expect(
    screen.queryByText(/payment link is still being recovered/),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Go to payment" })).toBeVisible();
  expect(continueToProvider).not.toHaveBeenCalled();
});

it("shows one USD review without coin fields or minimum loading", () => {
  const { changed } = setup();
  render(<Checkout detail={detail} admin={false} changed={changed} />);
  expect(
    screen.getByText(
      "Choose your coin and network on the secure payment page.",
    ),
  ).toBeVisible();
  expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  expect(
    screen.queryByText(/Checking payment options/),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Agreed price: USD 12.34")).toBeVisible();
});
it("blocks a non-USD agreement without hiding support context", () => {
  if (!detail.contract) throw new Error("Missing fixture contract");
  const { changed } = setup();
  render(
    <Checkout
      detail={{
        ...detail,
        contract: {
          ...detail.contract,
          data: { ...detail.contract.data, currency: "EUR" },
        },
      }}
      admin={false}
      changed={changed}
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("needs a USD price");
  expect(screen.getByRole("button", { name: "Go to payment" })).toBeDisabled();
});
