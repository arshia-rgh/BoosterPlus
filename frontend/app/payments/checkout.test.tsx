import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import type { Detail } from "../orders/model";
import Checkout from "./checkout";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
afterEach(() => vi.clearAllMocks());
const policy = {
  id: "policy-one",
  data: {
    label: "Test agreement",
    text: "Synthetic checkout policy for this purchase.",
    currencies: ["USD"],
    routes: [{ code: "usdttrc20", network: "trx", label: "USDT TRON" }],
    fee_mode: "merchant",
    rate_mode: "fixed",
    window_minutes: 30,
  },
};
// Checkout consumes only these order fields; the full order parser is tested separately.
const detail = {
  order: { id: "order", state: "awaiting_payment" },
  contract: { id: "contract", payment_state: "unissued" },
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
it("requires route and current policy consent, then binds the immutable contract", async () => {
  const { reload, changed } = setup();
  vi.mocked(post).mockResolvedValue({});
  render(<Checkout detail={detail} admin={false} changed={changed} />);
  const submit = screen.getByRole("button", { name: "Create secure checkout" });
  expect(submit).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Payment asset and network"), {
    target: { value: "usdttrc20" },
  });
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
      route: "usdttrc20",
      accept_policy: true,
    },
    expect.anything(),
  );
  expect(changed).toHaveBeenCalledOnce();
});
it("requires fresh acceptance when the published policy changes", () => {
  const { data, reload, changed } = setup();
  const view = render(
    <Checkout detail={detail} admin={false} changed={changed} />,
  );
  fireEvent.change(screen.getByLabelText("Payment asset and network"), {
    target: { value: "usdttrc20" },
  });
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
  expect(
    screen.getByRole("button", { name: "Create secure checkout" }),
  ).toBeDisabled();
});
it("keeps checkout unavailable when merchant activation is absent", () => {
  const { data, reload, changed } = setup();
  vi.mocked(useResource).mockReturnValue({
    data: { ...data, enabled: false },
    loading: false,
    error: null,
    reload,
  });
  render(<Checkout detail={detail} admin={false} changed={changed} />);
  expect(
    screen.queryByRole("button", { name: "Create secure checkout" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/Checkout is currently unavailable/)).toBeVisible();
});
it("does not let staff create customer checkout", () => {
  const { changed } = setup();
  render(<Checkout detail={detail} admin changed={changed} />);
  expect(
    screen.queryByRole("button", { name: "Create secure checkout" }),
  ).not.toBeInTheDocument();
});
