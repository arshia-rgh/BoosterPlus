import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import DepositInstructions from "./deposit-instructions";
import { depositSchema } from "./model";
const base = Date.parse("2026-09-27T12:00:00Z");
const deposit = {
  payment_id: "100",
  address: "synthetic-not-payable-address",
  memo: "memo-123",
  amount: "0.000000000000001",
  currency: "usdttrc20",
  network: "trx",
  expires_at: new Date(base + 600000).toISOString(),
  checked_at: new Date(base).toISOString(),
  valid_until: new Date(base + 120000).toISOString(),
  qr: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6pAAAAABJRU5ErkJggg==",
};
const route = { code: "usdttrc20", label: "Synthetic USDT", network: "trx" };
afterEach(() => vi.restoreAllMocks());
it("keeps exact decimal, network, memo and address separately labeled", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  render(
    <DepositInstructions
      deposit={deposit}
      route={route}
      now={base}
      currentTime={() => base}
      unavailable={false}
    />,
  );
  expect(screen.getByText(deposit.amount)).toBeVisible();
  expect(screen.getByText("Required memo / destination tag")).toBeVisible();
  expect(screen.getByText(/QR contains the address only/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Copy amount" }));
  expect(writeText).toHaveBeenCalledWith(deposit.amount);
  expect(await screen.findByText("Amount copied.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Copy memo" }));
  expect(writeText).toHaveBeenLastCalledWith("memo-123");
  expect(await screen.findByText("Memo copied.")).toBeVisible();
});
it.each(["stale", "expired", "offline", "wrong-route", "missing-server-clock"])(
  "hides payable information when %s",
  (reason) => {
    const now =
      reason === "stale"
        ? base + 120000
        : reason === "expired"
          ? base + 600000
          : reason === "missing-server-clock"
            ? NaN
            : base;
    render(
      <DepositInstructions
        deposit={deposit}
        route={reason === "wrong-route" ? { ...route, network: "eth" } : route}
        now={now}
        currentTime={() => now}
        unavailable={reason === "offline"}
      />,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Copy address" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(deposit.address)).not.toBeInTheDocument();
    expect(screen.getByText("100")).toBeVisible();
  },
);
it("rechecks the clock at copy time and handles clipboard denial", async () => {
  const writeText = vi.fn().mockRejectedValue(new Error("denied"));
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  let clock = base;
  render(
    <DepositInstructions
      deposit={deposit}
      route={route}
      now={base}
      currentTime={() => clock}
      unavailable={false}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Copy address" }));
  expect(await screen.findByText(/Copy unavailable/)).toBeVisible();
  writeText.mockClear();
  clock = base + 120000;
  fireEvent.click(screen.getByRole("button", { name: "Copy address" }));
  expect(writeText).not.toHaveBeenCalled();
  expect(screen.getByText(/Instructions changed or expired/)).toBeVisible();
});
it("rejects external QR URLs, injected address/memo, and malformed amount", () => {
  expect(depositSchema.safeParse(deposit).success).toBe(true);
  expect(
    depositSchema.safeParse({
      ...deposit,
      expires_at: "2026-09-27T15:30:00+03:30",
    }).success,
  ).toBe(true);
  for (const change of [
    { qr: "https://example.test/track" },
    { qr: "data:image/svg+xml;base64,PHN2Zz4=" },
    { address: "javascript:unsafe" },
    { memo: "bad\nvalue" },
    { amount: "1e4" },
    { amount: "1.2.3" },
    { valid_until: "not-a-date" },
  ])
    expect(depositSchema.safeParse({ ...deposit, ...change }).success).toBe(
      false,
    );
});

it("discards old copy feedback after hidden instructions are refreshed", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  const view = render(
    <DepositInstructions
      deposit={deposit}
      route={route}
      now={base}
      currentTime={() => base}
      unavailable={false}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Copy address" }));
  expect(await screen.findByText("Address copied.")).toBeVisible();
  view.rerender(
    <DepositInstructions
      deposit={deposit}
      route={route}
      now={base}
      currentTime={() => base}
      unavailable
    />,
  );
  expect(screen.queryByText("Address copied.")).not.toBeInTheDocument();
  view.rerender(
    <DepositInstructions
      deposit={{ ...deposit }}
      route={route}
      now={base}
      currentTime={() => base}
      unavailable={false}
    />,
  );
  expect(screen.queryByText("Address copied.")).not.toBeInTheDocument();
});
