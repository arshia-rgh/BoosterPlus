import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import Refunds from "./refunds";
import type { Transfer } from "./cases-model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
afterEach(() => vi.clearAllMocks());
function setup(state: string) {
  const reload = vi.fn();
  const transfer: Transfer = {
    id: "refund",
    order_id: "order",
    case_id: "case",
    receipt_id: "receipt",
    kind: "refund",
    currency: "usdttrc20",
    network: "trx",
    amount: "1.234567890123456789",
    terms: "Synthetic exact refund agreement.",
    state,
    issue: "",
    version: 3,
    recipient: { address: "", memo: "" },
    recipient_at: null,
    approved_at: null,
    created_at: "2026-09-12T00:00:00Z",
    updated_at: "2026-09-12T00:00:00Z",
  };
  vi.mocked(useResource).mockReturnValue({
    data: { transfers: [transfer] },
    loading: false,
    error: null,
    reload,
  });
  vi.mocked(post).mockResolvedValue({ queued: true });
  return reload;
}
it("requires customer confirmation of recipient, route and terms", async () => {
  const reload = setup("recipient_pending");
  render(<Refunds orderID="order" caseID="" admin={false} owner={false} />);
  const button = screen.getByRole("button", {
    name: "Confirm refund recipient",
  });
  expect(button).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Refund destination address"), {
    target: { value: "synthetic-test-recipient" },
  });
  fireEvent.click(
    screen.getByLabelText(
      "I accept these refund terms and confirm this address, network and memo",
    ),
  );
  expect(button).toBeEnabled();
  fireEvent.change(screen.getByLabelText("Refund memo or destination tag"), {
    target: { value: "tag" },
  });
  expect(button).toBeDisabled();
  fireEvent.click(
    screen.getByLabelText(
      "I accept these refund terms and confirm this address, network and memo",
    ),
  );
  fireEvent.click(button);
  await waitFor(() => {
    expect(reload).toHaveBeenCalled();
  });
  expect(vi.mocked(post).mock.calls[0]?.slice(0, 2)).toEqual([
    "/refunds/refund/recipient",
    {
      version: 3,
      address: "synthetic-test-recipient",
      memo: "tag",
      accept: true,
    },
  ]);
  expect(
    screen.queryByRole("button", { name: "Approve exact refund" }),
  ).not.toBeInTheDocument();
});
it("restricts provider verification to owners after independent evidence", () => {
  setup("created");
  const view = render(<Refunds orderID="order" caseID="" admin owner />);
  expect(
    screen.queryByLabelText("NOWPayments authenticator code"),
  ).not.toBeInTheDocument();
  view.unmount();
  setup("awaiting_verification");
  render(<Refunds orderID="order" caseID="" admin owner={false} />);
  expect(
    screen.queryByLabelText("NOWPayments authenticator code"),
  ).not.toBeInTheDocument();
});
it("clears the ephemeral merchant code before sending the bounded authorization", async () => {
  const reload = setup("awaiting_verification");
  render(<Refunds orderID="order" caseID="" admin owner />);
  const button = screen.getByRole("button", {
    name: "Authorize provider transfer",
  });
  fireEvent.change(screen.getByLabelText("Refund authorization reason"), {
    target: { value: "Reviewed exact destination and amount." },
  });
  fireEvent.change(screen.getByLabelText("NOWPayments authenticator code"), {
    target: { value: "12345x" },
  });
  expect(button).toBeDisabled();
  fireEvent.change(screen.getByLabelText("NOWPayments authenticator code"), {
    target: { value: "123456" },
  });
  fireEvent.click(button);
  expect(screen.getByLabelText("NOWPayments authenticator code")).toHaveValue(
    "",
  );
  await waitFor(() => {
    expect(reload).toHaveBeenCalled();
  });
  expect(vi.mocked(post).mock.calls[0]?.slice(0, 2)).toEqual([
    "/admin/refunds/refund/verify",
    {
      version: 3,
      reason: "Reviewed exact destination and amount.",
      code: "123456",
    },
  ]);
  expect(
    screen.queryByText(/The provider confirmed this outgoing/),
  ).not.toBeInTheDocument();
});
