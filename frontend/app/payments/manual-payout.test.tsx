import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { APIError, post } from "../identity/api";
import { TransferRecord } from "./refunds";
import {
  ManualPayoutForm,
  manualPayoutIssues,
  useManualPayoutConfirmation,
} from "./manual-payout";
import type { Transfer } from "./cases-model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());
const hash = `0x${"ab".repeat(32)}`;
const base: Transfer = {
  id: "payout",
  order_id: "",
  case_id: "",
  receipt_id: "",
  kind: "seller_payout",
  currency: "usdtbsc",
  network: "bsc",
  amount: "90.000000",
  terms: "Agreed fixed net seller proceeds.",
  state: "verified",
  issue: "",
  version: 3,
  recipient: { address: "synthetic-confirmed-destination", memo: "" },
  recipient_at: "2026-01-01T00:00:00Z",
  approved_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  manual_recording: { available: true, reason: "" },
};
const completed: Transfer = {
  ...base,
  state: "confirmed",
  version: 4,
  manual_receipt: {
    id: "receipt",
    transaction_hash: hash,
    completed_at: "2026-01-02T00:00:00Z",
    recorded_at: "2026-01-02T01:00:00Z",
  },
};
it("distinguishes a timed hold, unresolved requirements and actual readiness without predicting eligibility", () => {
  const deadline = "2026-01-03T00:00:00Z";
  const renderRecord = (record: Transfer) => (
    <MemoryRouter>
      <TransferRecord
        record={record}
        admin={false}
        owner={false}
        reload={vi.fn()}
        refreshing={false}
      />
    </MemoryRouter>
  );
  const held: Transfer = {
    ...base,
    manual_recording: {
      available: false,
      reason: "eligibility_hold",
      eligible_after: deadline,
    },
  };
  const view = render(renderRecord(held));
  expect(screen.getByText("Waiting for the agreed payout date")).toBeVisible();
  expect(document.querySelector(`time[datetime="${deadline}"]`)).toBeVisible();
  expect(screen.queryByText("Ready for staff payout")).not.toBeInTheDocument();
  // A past date alone never changes the authoritative eligibility decision.
  expect(
    screen.getByText(/another unmet condition can keep the payout on/),
  ).toBeVisible();
  view.rerender(
    renderRecord({
      ...held,
      manual_recording: { available: false, reason: "eligibility_hold" },
    }),
  );
  expect(screen.getByText("Payout on hold")).toBeVisible();
  expect(
    document.querySelector(`time[datetime="${deadline}"]`),
  ).not.toBeInTheDocument();
  view.rerender(renderRecord(base));
  expect(screen.getByText("Ready for staff payout")).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Record completed payout" }),
  ).not.toBeInTheDocument();
  view.rerender(
    renderRecord({
      ...base,
      manual_recording: { available: false, reason: "provider_attempt" },
    }),
  );
  expect(screen.getByText("Existing transfer under review")).toBeVisible();
  expect(post).not.toHaveBeenCalled();
});
function fill() {
  fireEvent.change(screen.getByLabelText("Transaction hash"), {
    target: { value: hash },
  });
  fireEvent.change(screen.getByLabelText("Transfer completion time"), {
    target: { value: "2026-01-02T00:00:00" },
  });
  fireEvent.change(screen.getByLabelText("Verification note"), {
    target: {
      value: "Verified the synthetic completed transfer and net amount.",
    },
  });
  fireEvent.click(screen.getByRole("checkbox"));
}
it("requires valid evidence and renewed attestation after editing", async () => {
  const saved = vi.fn(),
    reload = vi.fn();
  vi.mocked(post).mockResolvedValue(completed);
  render(
    <ManualPayoutForm
      record={base}
      refreshing={false}
      reload={reload}
      onSaved={saved}
    />,
  );
  const button = screen.getByRole("button", {
    name: "Record completed payout",
  });
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(button);
  await waitFor(() =>
    expect(screen.getByLabelText("Transaction hash")).toHaveFocus(),
  );
  expect(post).not.toHaveBeenCalled();
  fill();
  fireEvent.change(screen.getByLabelText("Verification note"), {
    target: {
      value: "Verified completion in our own wallet and the explorer.",
    },
  });
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(button);
  await waitFor(() => {
    expect(saved).toHaveBeenCalledWith(completed);
  });
  expect(reload).toHaveBeenCalledOnce();
  expect(vi.mocked(post).mock.calls[0]?.[0]).toBe(
    "/admin/payouts/payout/manual",
  );
  expect(vi.mocked(post).mock.calls[0]?.[1]).toMatchObject({
    version: 3,
    amount: "90.000000",
    currency: "usdtbsc",
    network: "bsc",
    recipient: base.recipient,
    transaction_hash: hash,
    confirm: true,
  });
});
it("freezes uncertain evidence and retries the identical idempotent request", async () => {
  vi.mocked(post)
    .mockRejectedValueOnce(new TypeError("Network unavailable"))
    .mockResolvedValueOnce(completed);
  const reload = vi.fn();
  render(<ManualPayoutForm record={base} refreshing={false} reload={reload} />);
  fill();
  fireEvent.click(
    screen.getByRole("button", { name: "Record completed payout" }),
  );
  const retry = await screen.findByRole("button", {
    name: "Retry saving the same record",
  });
  expect(screen.getByLabelText("Transaction hash")).toBeDisabled();
  expect(screen.getByText(/do not send the crypto again/)).toBeVisible();
  fireEvent.click(retry);
  await waitFor(() => {
    expect(reload).toHaveBeenCalled();
  });
  expect(vi.mocked(post).mock.calls[0]?.[1]).toEqual(
    vi.mocked(post).mock.calls[1]?.[1],
  );
});
it("shows the held reason without an enabled recording form", () => {
  render(
    <ManualPayoutForm
      record={{
        ...base,
        manual_recording: { available: false, reason: "provider_attempt" },
      }}
      refreshing={false}
      reload={vi.fn()}
    />,
  );
  expect(screen.getByText(/A provider attempt already exists/)).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Record completed payout" }),
  ).not.toBeInTheDocument();
});
it("has no owner controls for a seller and identifies staff completion accurately", () => {
  render(
    <MemoryRouter>
      <TransferRecord
        record={completed}
        admin={false}
        owner={false}
        reload={vi.fn()}
        refreshing={false}
      />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("region", { name: /Manual payout receipt/ }),
  ).toBeVisible();
  expect(
    screen.getByText(/not automatically verified by NOWPayments/),
  ).toBeVisible();
  expect(
    screen.queryByText(/provider confirmed this outgoing/),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Record completed payout" }),
  ).not.toBeInTheDocument();
});
it("preserves the receipt when reloading fails and clears it when access is lost", async () => {
  function Harness({ error }: { error: unknown }) {
    const result = useManualPayoutConfirmation("fixture", error);
    return (
      <>
        {result.feedback}
        <button
          onClick={() => {
            result.manualSaved(completed);
          }}
        >
          Fixture save
        </button>
      </>
    );
  }
  const { rerender } = render(<Harness error={null} />);
  fireEvent.click(screen.getByRole("button", { name: "Fixture save" }));
  rerender(<Harness error={new Error("Read unavailable")} />);
  expect(screen.getByText(/receipt is saved/)).toBeVisible();
  expect(
    screen.getByRole("region", { name: "Manual payout saved" }),
  ).toHaveFocus();
  rerender(
    <Harness
      error={Object.assign(new APIError("Access denied"), { status: 403 })}
    />,
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("region", { name: /Manual payout receipt/ }),
    ).not.toBeInTheDocument(),
  );
});
it("validates network-specific transaction evidence and future times", () => {
  expect(
    manualPayoutIssues(
      "bsc",
      hash,
      "2026-01-02",
      "Synthetic verification",
      Date.parse("2026-01-03"),
    ),
  ).toEqual([]);
  expect(
    manualPayoutIssues(
      "bsc",
      `https://example.test/${hash}`,
      "2026-01-02",
      "Synthetic verification",
      Date.parse("2026-01-03"),
    ).map((v) => v.path),
  ).toContain("transaction_hash");
  expect(
    manualPayoutIssues(
      "sol",
      "0".repeat(88),
      "2026-01-04",
      "Synthetic verification",
      Date.parse("2026-01-03"),
    ).map((v) => v.path),
  ).toEqual(expect.arrayContaining(["transaction_hash", "completed_at"]));
});
it("retains uncertain evidence across an unmounted list and a failed refresh", async () => {
  function Harness({ visible, error }: { visible: boolean; error: unknown }) {
    const confirmation = useManualPayoutConfirmation("fixture", error);
    return (
      <>
        {confirmation.feedback}
        {visible && (
          <ManualPayoutForm
            record={base}
            refreshing={false}
            reload={vi.fn()}
            {...confirmation.controls(base.id)}
            onSaved={confirmation.manualSaved}
          />
        )}
      </>
    );
  }
  vi.mocked(post)
    .mockRejectedValueOnce(new TypeError("Read timed out"))
    .mockResolvedValueOnce(completed);
  const { rerender } = render(<Harness visible error={null} />);
  fill();
  fireEvent.click(
    screen.getByRole("button", { name: "Record completed payout" }),
  );
  await screen.findByRole("button", { name: "Retry saving the same record" });
  rerender(<Harness visible={false} error={new Error("Refresh failed")} />);
  expect(
    screen.getByText(/entered transaction evidence is retained/),
  ).toBeVisible();
  rerender(<Harness visible error={null} />);
  expect(screen.getByLabelText("Transaction hash")).toHaveValue(hash);
  expect(screen.getByLabelText("Transaction hash")).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Retry saving the same record" }),
  );
  await screen.findByRole("region", { name: "Manual payout saved" });
  expect(vi.mocked(post).mock.calls[0]?.[1]).toEqual(
    vi.mocked(post).mock.calls[1]?.[1],
  );
});
it("explains conflicts and offers a local refresh without a repeat transfer", async () => {
  vi.mocked(post).mockRejectedValue(
    Object.assign(new APIError("Payout changed"), {
      status: 409,
      code: "payment_conflict",
    }),
  );
  const reload = vi.fn();
  render(<ManualPayoutForm record={base} refreshing={false} reload={reload} />);
  fill();
  fireEvent.click(
    screen.getByRole("button", { name: "Record completed payout" }),
  );
  const refresh = await screen.findByRole("button", {
    name: "Refresh payout record",
  });
  expect(screen.getByText(/Do not send another payment/)).toBeVisible();
  expect(screen.getByLabelText("Transaction hash")).toHaveValue(hash);
  fireEvent.click(refresh);
  expect(reload).toHaveBeenCalledOnce();
});
