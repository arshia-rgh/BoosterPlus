import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import IncomingPaymentEvidence from "./incoming-evidence";

it("separates exact crypto observations from order price and preserves stale-check context", () => {
  const reconcile = vi.fn();
  render(
    <IncomingPaymentEvidence
      evidence={[
        {
          payment_id: "123",
          state: "partially_paid",
          issue: "provider_unavailable",
          expected_amount: "12.34000001",
          received_amount: "0.1234567890123456789",
          currency: "usdttrc20",
          network: "trx",
          checked_at: "2026-09-27T12:00:30Z",
          observed_at: "2026-09-27T12:00:00Z",
          reading: false,
        },
      ]}
      more
      reconcile={reconcile}
    />,
  );
  fireEvent.click(screen.getByText("Provider payment 123 · Needs review"));
  expect(screen.getByText("0.1234567890123456789 USDTTRC20")).toBeVisible();
  expect(screen.getByText(/latest provider check failed/)).toBeVisible();
  expect(screen.getByText(/Additional records are not included/)).toBeVisible();
  expect(
    document.querySelector('time[datetime="2026-09-27T12:00:00Z"]'),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Use payment 123 for reconciliation" }),
  );
  expect(reconcile).toHaveBeenCalledWith("123");
});
