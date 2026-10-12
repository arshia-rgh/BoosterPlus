import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import Refunds from "./refunds";
import type { Transfer } from "./cases-model";
import { SellerPayouts } from "../resale/offers";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
afterEach(() => vi.clearAllMocks());
function transferRecord(state: string): Transfer {
  return {
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
}
function setup(state: string) {
  const reload = vi.fn();
  const transfer = transferRecord(state);
  vi.mocked(useResource).mockReturnValue({
    data: { transfers: [transfer] },
    loading: false,
    error: null,
    reload,
  });
  vi.mocked(post).mockResolvedValue(transfer);
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
it("focuses failed recipient feedback and preserves the exact reviewed retry", async () => {
  const reload = setup("recipient_pending");
  vi.mocked(post)
    .mockRejectedValueOnce(
      Object.assign(new APIError("Confirmation unavailable"), { status: 503 }),
    )
    .mockResolvedValueOnce(transferRecord("verified"));
  render(<Refunds orderID="order" caseID="" admin={false} owner={false} />);
  fireEvent.change(screen.getByLabelText("Refund destination address"), {
    target: { value: "synthetic-test-recipient" },
  });
  fireEvent.change(screen.getByLabelText("Refund memo or destination tag"), {
    target: { value: "synthetic-tag" },
  });
  fireEvent.click(
    screen.getByLabelText(
      "I accept these refund terms and confirm this address, network and memo",
    ),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Confirm refund recipient" }),
  );
  const feedback = await screen.findByRole("region", {
    name: "Refund action feedback",
  });
  await waitFor(() => expect(feedback).toHaveFocus());
  expect(screen.getByLabelText("Refund destination address")).toHaveValue(
    "synthetic-test-recipient",
  );
  expect(screen.getByLabelText("Refund memo or destination tag")).toHaveValue(
    "synthetic-tag",
  );
  expect(post).toHaveBeenCalledTimes(1);
  expect(reload).not.toHaveBeenCalled();
  const initial = vi.mocked(post).mock.calls[0]?.[1];
  fireEvent.click(
    screen.getByRole("button", { name: "Confirm refund recipient" }),
  );
  await waitFor(() => {
    expect(reload).toHaveBeenCalledOnce();
  });
  expect(vi.mocked(post).mock.calls[1]?.[1]).toEqual(initial);
});
it.each([
  ["refund", false],
  ["refund", true],
  ["seller payout", false],
  ["seller payout", true],
] as const)(
  "keeps deliberate %s retry confirmation after the refreshed record changes (read failure=%s)",
  async (noun, failedRead) => {
    const seller = noun === "seller payout";
    const title = seller ? "Seller payout" : "Refund";
    const original = {
      ...transferRecord("recipient_pending"),
      kind: seller ? "seller_payout" : "refund",
    };
    const saved = {
      ...original,
      version: original.version + 1,
      state: "verified",
      recipient: {
        address: "synthetic-saved-recipient",
        memo: "synthetic-saved-tag",
      },
    };
    let resource = {
      data: { transfers: [original] } as { transfers: Transfer[] } | null,
      loading: false,
      error: null as unknown,
    };
    const reload = vi.fn(() => {
      resource = { ...resource, loading: true };
    });
    vi.mocked(useResource).mockImplementation(() => ({ ...resource, reload }));
    vi.mocked(post)
      .mockRejectedValueOnce(new APIError("Confirmation unavailable"))
      .mockResolvedValueOnce(saved);
    function View({ id = "order" }: { id?: string }) {
      return seller ? (
        <SellerPayouts id={id} admin={false} owner={false} />
      ) : (
        <Refunds orderID={id} caseID="" admin={false} owner={false} />
      );
    }
    const view = render(<View />);
    fireEvent.change(screen.getByLabelText(`${title} destination address`), {
      target: { value: saved.recipient.address },
    });
    fireEvent.change(
      screen.getByLabelText(`${title} memo or destination tag`),
      {
        target: { value: saved.recipient.memo },
      },
    );
    fireEvent.click(
      screen.getByLabelText(
        `I accept these ${noun} terms and confirm this address, network and memo`,
      ),
    );
    const action = screen.getByRole("button", {
      name: `Confirm ${noun} recipient`,
    });
    fireEvent.click(action);
    await screen.findByText("Confirmation unavailable");
    expect(
      screen.queryByRole("region", { name: `${title} destination saved` }),
    ).not.toBeInTheDocument();
    expect(post).toHaveBeenCalledOnce();
    fireEvent.click(action);
    const confirmation = await screen.findByRole("region", {
      name: `${title} destination saved`,
    });
    await waitFor(() => expect(confirmation).toHaveFocus());
    expect(reload).toHaveBeenCalledOnce();
    expect(confirmation).toHaveTextContent(
      "This does not mean the transfer is complete",
    );
    expect(confirmation).toHaveTextContent(saved.recipient.address);
    expect(confirmation).toHaveTextContent(saved.recipient.memo);
    expect(screen.getByLabelText(`${title} destination address`)).toHaveValue(
      "",
    );
    expect(
      screen.getByLabelText(`${title} memo or destination tag`),
    ).toHaveValue("");
    resource = failedRead
      ? { data: null, loading: false, error: new Error("Status unavailable") }
      : { data: { transfers: [saved] }, loading: false, error: null };
    view.rerender(<View />);
    expect(confirmation).toHaveFocus();
    expect(confirmation).toHaveTextContent(saved.recipient.address);
    if (failedRead)
      expect(confirmation).toHaveTextContent(
        "latest transfer status is unavailable",
      );
    expect(
      screen.queryByText(/The provider confirmed this outgoing/),
    ).not.toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(2);
    expect(vi.mocked(post).mock.calls[1]?.[1]).toEqual(
      vi.mocked(post).mock.calls[0]?.[1],
    );
    // Subsequent reads may replace the record, but never repeat POST or focus.
    const refresh = screen.getByRole("button", {
      name: seller ? "Refresh seller payouts" : "Refresh refunds",
    });
    refresh.focus();
    resource = {
      data: { transfers: [{ ...saved, version: saved.version + 1 }] },
      loading: false,
      error: null,
    };
    view.rerender(<View />);
    expect(refresh).toHaveFocus();
    expect(post).toHaveBeenCalledTimes(2);
    view.rerender(<View id="other-order" />);
    expect(
      screen.queryByRole("region", { name: `${title} destination saved` }),
    ).not.toBeInTheDocument();
    view.rerender(<View />);
    expect(
      screen.queryByRole("region", { name: `${title} destination saved` }),
    ).not.toBeInTheDocument();
  },
);
it.each([401, 403])(
  "discards a saved private destination after a status read denies access with %s",
  async (status) => {
    const original = transferRecord("recipient_pending");
    const saved = {
      ...original,
      recipient: { address: "synthetic-private-destination", memo: "tag" },
      version: original.version + 1,
      state: "verified",
    };
    let error: unknown = null;
    vi.mocked(useResource).mockImplementation(() => ({
      data: error ? null : { transfers: [original] },
      loading: false,
      error,
      reload: vi.fn(),
    }));
    vi.mocked(post).mockResolvedValue(saved);
    const view = render(
      <Refunds orderID="order" caseID="" admin={false} owner={false} />,
    );
    fireEvent.change(screen.getByLabelText("Refund destination address"), {
      target: { value: saved.recipient.address },
    });
    fireEvent.click(
      screen.getByLabelText(
        "I accept these refund terms and confirm this address, network and memo",
      ),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm refund recipient" }),
    );
    await screen.findByRole("region", { name: "Refund destination saved" });
    error = Object.assign(new APIError("Access unavailable"), { status });
    view.rerender(
      <Refunds orderID="order" caseID="" admin={false} owner={false} />,
    );
    expect(
      screen.queryByText(/synthetic-private-destination/),
    ).not.toBeInTheDocument();
    error = null;
    view.rerender(
      <Refunds orderID="order" caseID="" admin={false} owner={false} />,
    );
    expect(
      screen.queryByRole("region", { name: "Refund destination saved" }),
    ).not.toBeInTheDocument();
    expect(post).toHaveBeenCalledOnce();
  },
);
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
  expect(button).toBeDisabled();
  fireEvent.click(
    screen.getByLabelText(
      "I reviewed the recipient, exact amount, fees and due conditions",
    ),
  );
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
it("locks an uncertain refund proposal and retries its unchanged request", async () => {
  const reload = vi.fn();
  vi.mocked(useResource).mockReturnValue({
    data: {
      transfers: [],
      receipts: [
        {
          id: "source",
          state: "confirmed",
          amount: "12.34000001",
          currency: "usdttrc20",
          network: "trx",
          refundable_amount: "12.34000001",
        },
      ],
    },
    error: null,
    loading: false,
    reload,
  });
  vi.mocked(post)
    .mockRejectedValueOnce(new Error("Response lost"))
    .mockResolvedValueOnce({});
  render(<Refunds orderID="order" caseID="case" admin owner />);
  fireEvent.change(screen.getByLabelText("Refund source receipt"), {
    target: { value: "source" },
  });
  fireEvent.change(screen.getByLabelText("Exact refund crypto amount"), {
    target: { value: "1.000000000000000001" },
  });
  fireEvent.change(screen.getByLabelText("Refund proposal terms"), {
    target: {
      value: "Return this exact amount under explicitly reviewed fees.",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Propose refund" }));
  await screen.findByRole("alert");
  expect(screen.getByLabelText("Exact refund crypto amount")).toBeDisabled();
  expect(screen.getByLabelText("Refund proposal terms")).toBeDisabled();
  const original = vi.mocked(post).mock.calls[0]?.[1];
  fireEvent.click(
    screen.getByRole("button", { name: "Retry exact refund proposal" }),
  );
  await waitFor(() => {
    expect(post).toHaveBeenCalledTimes(2);
  });
  expect(vi.mocked(post).mock.calls[1]?.[1]).toEqual(original);
  await waitFor(() =>
    expect(screen.getByLabelText("Exact refund crypto amount")).toBeEnabled(),
  );
});
it("recovers a failed source read locally and preserves the proposal draft on refresh", () => {
  const reload = vi.fn();
  const data = {
    receipts: [
      {
        id: "source",
        state: "confirmed",
        amount: "12.34",
        currency: "usdttrc20",
        network: "trx",
        refundable_amount: "12.34",
      },
    ],
  };
  let failed = true;
  vi.mocked(useResource).mockImplementation((path) => ({
    data: path.endsWith("/payments")
      ? failed
        ? null
        : data
      : { transfers: [] },
    loading: false,
    error:
      path.endsWith("/payments") && failed
        ? new Error("Source unavailable")
        : null,
    reload,
  }));
  const view = render(<Refunds orderID="order" caseID="case" admin owner />);
  expect(screen.getByLabelText("Exact refund crypto amount")).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Refresh refund source evidence" }),
  );
  expect(reload).toHaveBeenCalledOnce();
  failed = false;
  view.rerender(<Refunds orderID="order" caseID="case" admin owner />);
  fireEvent.change(screen.getByLabelText("Exact refund crypto amount"), {
    target: { value: "1.000000000000000001" },
  });
  fireEvent.change(screen.getByLabelText("Refund proposal terms"), {
    target: { value: "Reviewed exact amount and agreed fee conditions." },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Refresh refund source evidence" }),
  );
  expect(reload).toHaveBeenCalledTimes(2);
  expect(screen.getByLabelText("Exact refund crypto amount")).toHaveValue(
    "1.000000000000000001",
  );
  expect(screen.getByLabelText("Refund proposal terms")).toHaveValue(
    "Reviewed exact amount and agreed fee conditions.",
  );
});

it("focuses invalid recipient guidance without sending a request", async () => {
  setup("recipient_pending");
  render(<Refunds orderID="order" caseID="" admin={false} owner={false} />);
  fireEvent.click(
    screen.getByLabelText(
      "I accept these refund terms and confirm this address, network and memo",
    ),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Confirm refund recipient" }),
  );
  const address = screen.getByLabelText("Refund destination address");
  await waitFor(() => expect(address).toHaveFocus());
  expect(address).toHaveAttribute("aria-invalid", "true");
  expect(address).toHaveAccessibleDescription(/wallet address.*without spaces/);
  expect(post).not.toHaveBeenCalled();
});
it("focuses a missing owner reason after deliberate review confirmation", async () => {
  setup("verified");
  render(<Refunds orderID="order" caseID="" admin owner />);
  fireEvent.click(
    screen.getByLabelText(
      "I reviewed the recipient, exact amount, fees and due conditions",
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Approve exact refund" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Refund authorization reason")).toHaveFocus(),
  );
  expect(post).not.toHaveBeenCalled();
});
