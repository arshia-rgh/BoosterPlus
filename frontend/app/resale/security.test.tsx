import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { post } from "../identity/api";
import { TransferRecord } from "../payments/refunds";
import type { Transfer } from "../payments/cases-model";
import { SecretReveal, SecretUpload } from "./secret";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
const transfer: Transfer = {
  id: "payout",
  case_id: "",
  receipt_id: "",
  order_id: "",
  kind: "seller_payout",
  currency: "usdttrc20",
  network: "trx",
  amount: "10.00000001",
  terms: "Synthetic accepted seller terms.",
  state: "verified",
  issue: "",
  version: 3,
  recipient: { address: "synthetic-recipient", memo: "" },
  recipient_at: null,
  approved_at: null,
  created_at: "2026-09-12T00:00:00Z",
  updated_at: "2026-09-12T00:00:00Z",
};
it("requires owner authorization on the payout endpoint and cannot cancel accepted seller debt", async () => {
  vi.mocked(post).mockResolvedValue(transfer);
  const reload = vi.fn();
  render(
    <TransferRecord
      record={transfer}
      admin
      owner
      reload={reload}
      refreshing={false}
    />,
  );
  expect(
    screen.queryByRole("button", { name: /Cancel/ }),
  ).not.toBeInTheDocument();
  const action = screen.getByRole("button", {
    name: "Approve exact seller payout",
  });
  expect(action).toBeDisabled();
  fireEvent.change(
    screen.getByLabelText("Seller payout authorization reason"),
    { target: { value: "Authorize the accepted exact seller obligation." } },
  );
  expect(action).toBeDisabled();
  fireEvent.click(action);
  expect(post).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByLabelText(
      "I reviewed the recipient, exact amount, fees and due conditions",
    ),
  );
  fireEvent.click(action);
  await waitFor(() => {
    expect(reload).toHaveBeenCalled();
  });
  expect(vi.mocked(post).mock.calls[0]?.slice(0, 2)).toEqual([
    "/admin/payouts/payout/approve",
    {
      version: 3,
      reason: "Authorize the accepted exact seller obligation.",
      code: "",
    },
  ]);
});
it("hides revealed access on blur and leaves errors without plaintext", async () => {
  vi.mocked(post)
    .mockResolvedValueOnce({ value: btoa("synthetic handoff only") })
    .mockRejectedValueOnce(new Error("Unavailable"));
  render(<SecretReveal path="/account-orders/order/secret/reveal" />);
  fireEvent.click(
    screen.getByRole("button", { name: "Reveal protected details" }),
  );
  await screen.findByText("synthetic handoff only");
  fireEvent(window, new Event("blur"));
  expect(screen.queryByText("synthetic handoff only")).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Reveal protected details" }),
  );
  await waitFor(() => {
    expect(vi.mocked(post)).toHaveBeenCalledTimes(2);
  });
  expect(screen.queryByText("synthetic handoff only")).not.toBeInTheDocument();
});
it("clears protected input immediately even when storage fails", async () => {
  vi.mocked(post).mockRejectedValue(new Error("Unavailable"));
  render(
    <SecretUpload
      path="/seller-offers/offer/secret"
      version={0}
      changed={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Protected transfer details"), {
    target: { value: "synthetic ownership details" },
  });
  fireEvent.change(screen.getByLabelText("Protected details expiry"), {
    target: { value: "2026-09-15T12:00" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Store protected transfer" }),
  );
  expect(screen.getByLabelText("Protected transfer details")).toHaveValue("");
  await waitFor(() => {
    expect(post).toHaveBeenCalled();
  });
});

it("orients protected-reveal keyboard users without announcing plaintext or stealing passive focus", async () => {
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  vi.mocked(post)
    .mockResolvedValueOnce({ value: btoa("synthetic handoff only") })
    .mockResolvedValueOnce({ value: btoa("synthetic handoff only") })
    .mockRejectedValueOnce(new Error("Unavailable"));
  render(
    <>
      <button>Other task</button>
      <SecretReveal path="/account-orders/order/secret/reveal" />
    </>,
  );
  const reveal = screen.getByRole("button", {
    name: "Reveal protected details",
  });
  fireEvent.click(reveal);
  const ready = await screen.findByRole("heading", {
    name: "Protected details ready",
  });
  await waitFor(() => expect(ready).toHaveFocus());
  expect(ready).not.toHaveTextContent("synthetic handoff");
  fireEvent.click(
    screen.getByRole("button", { name: "Hide protected details" }),
  );
  expect(reveal).toHaveFocus();
  expect(screen.queryByText("synthetic handoff only")).not.toBeInTheDocument();
  fireEvent.click(reveal);
  await screen.findByText("synthetic handoff only");
  const other = screen.getByRole("button", { name: "Other task" });
  other.focus();
  fireEvent(window, new Event("blur"));
  expect(other).toHaveFocus();
  expect(screen.queryByText("synthetic handoff only")).not.toBeInTheDocument();
  fireEvent.click(reveal);
  await screen.findByRole("alert");
  await waitFor(() =>
    expect(
      screen.getByRole("group", { name: "Protected access notice" }),
    ).toHaveFocus(),
  );
});

it("does not steal focus when protected details expire", async () => {
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  vi.useFakeTimers();
  vi.mocked(post).mockResolvedValue({ value: btoa("synthetic handoff only") });
  render(
    <>
      <button>Continue reading</button>
      <SecretReveal path="/account-orders/order/secret/reveal" />
    </>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Reveal protected details" }),
  );
  await act(async () => {
    await Promise.resolve();
  });
  expect(
    screen.getByRole("heading", { name: "Protected details ready" }),
  ).toHaveFocus();
  const reading = screen.getByRole("button", { name: "Continue reading" });
  reading.focus();
  act(() => {
    vi.advanceTimersByTime(60001);
  });
  expect(screen.queryByText("synthetic handoff only")).not.toBeInTheDocument();
  expect(reading).toHaveFocus();
});
